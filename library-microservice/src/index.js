require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { query } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3002;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function bookRowToDto(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    autor: row.autor,
    editorial: row.editorial,
    genero: row.genero,
    disponible: row.disponible,
  };
}

// GET /books?search=&page=&pageSize=
app.get("/books", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = ["r.resource_type = 'book'"];

    if (search) {
      where.push(
        `(r.resource_title ILIKE $${params.length + 1}
          OR o.organization_name ILIKE $${params.length + 1}
          OR c.first_name ILIKE $${params.length + 1}
          OR c.father_lastname ILIKE $${params.length + 1}
          OR cat.category_name ILIKE $${params.length + 1})`
      );
      params.push(`%${search}%`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalRes = await query(
      `SELECT COUNT(DISTINCT r.resource_id)::int AS total
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       ${whereSql}`,
      params
    );
    const total = totalRes.rows[0]?.total || 0;

    const result = await query(
      `SELECT
          r.resource_id AS id,
          r.resource_title AS titulo,
          CONCAT_WS(' ', c.first_name, c.middle_name, c.father_lastname, c.mother_lastname) AS autor,
          o.organization_name AS editorial,
          MAX(cat.category_name) AS genero,
          (r.resource_state = 'available') AS disponible
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       ${whereSql}
       GROUP BY r.resource_id, r.resource_title, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, o.organization_name, r.resource_state
       ORDER BY r.resource_id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const items = result.rows.map(bookRowToDto);
    res.json({ items, total, page, pageSize });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch books" });
  }
});

// GET /books/:id
app.get("/books/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });

    const result = await query(
      `SELECT
          r.resource_id AS id,
          r.resource_title AS titulo,
          CONCAT_WS(' ', c.first_name, c.middle_name, c.father_lastname, c.mother_lastname) AS autor,
          o.organization_name AS editorial,
          MAX(cat.category_name) AS genero,
          (r.resource_state = 'available') AS disponible
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       WHERE r.resource_type = 'book' AND r.resource_id = $1
       GROUP BY r.resource_id, r.resource_title, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, o.organization_name, r.resource_state`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Book not found" });
    res.json(bookRowToDto(result.rows[0]));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch book" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`library-microservice listening on :${PORT}`);
});

