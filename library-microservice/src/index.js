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

function resourceRowToDto(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    autor: row.autor,
    editorial: row.editorial,
    genero: row.genero,
    disponible: row.disponible,
    tipo: row.tipo,
    ano_publicacion: row.ano_publicacion,
    costo: row.costo
  };
}

// GET /resources?search=&page=&pageSize=
app.get("/resources", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
    const offset = (page - 1) * pageSize;

    const params = [];
    const where = [];

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

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

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
          (r.resource_state = 'available') AS disponible,
          r.resource_type AS tipo,
          r.resource_publication_year AS ano_publicacion,
          r.resource_cost AS costo
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       ${whereSql}
       GROUP BY r.resource_id, r.resource_title, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, o.organization_name, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost
       ORDER BY r.resource_id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const items = result.rows.map(resourceRowToDto);
    res.json({ items, total, page, pageSize });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

// GET /resources/:id
app.get("/resources/:id", async (req, res) => {
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
          (r.resource_state = 'available') AS disponible,
          r.resource_type AS tipo,
          r.resource_publication_year AS ano_publicacion,
          r.resource_cost AS costo
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       WHERE r.resource_id = $1
       GROUP BY r.resource_id, r.resource_title, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, o.organization_name, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Resource not found" });
    res.json(resourceRowToDto(result.rows[0]));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch resource" });
  }
});

// POST /resources
app.post("/resources", async (req, res) => {
  try {
    const { titulo, tipo, disponible, ano_publicacion, costo } = req.body || {};
    if (!titulo || !tipo) return res.status(400).json({ message: "Title and type are required" });
    
    // Fix sequence if broke
    await query(`SELECT setval('resources_resource_id_seq', COALESCE((SELECT MAX(resource_id) FROM resources), 1))`);
    
    const state = disponible ? 'available' : 'disabled';
    
    const insertRes = await query(
      `INSERT INTO resources(
        resource_title, resource_type, resource_state, resource_publication_year, resource_cost,
        created_at, created_by, latest_modified_at, latest_modified_by
       ) VALUES ($1, $2, $3, $4, $5, NOW(), 1, NOW(), 1) RETURNING resource_id`,
      [titulo, tipo, state, ano_publicacion || null, costo || 0]
    );
    res.json({ id: insertRes.rows[0].resource_id, ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to create resource" });
  }
});

// PUT /resources/:id
app.put("/resources/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const { titulo, tipo, disponible, ano_publicacion, costo } = req.body || {};
    if (!titulo || !tipo) return res.status(400).json({ message: "Title and type are required" });
    
    const state = disponible ? 'available' : 'disabled';
    
    await query(
      `UPDATE resources
       SET resource_title = $1, resource_type = $2, resource_state = $3, 
           resource_publication_year = $4, resource_cost = $5, latest_modified_at = NOW()
       WHERE resource_id = $6`,
      [titulo, tipo, state, ano_publicacion || null, costo || 0, id]
    );
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to update resource" });
  }
});

// DELETE /resources/:id (Disable resource)
app.delete("/resources/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    
    await query(
      `UPDATE resources
       SET resource_state = 'disabled', disabled_at = NOW(), latest_modified_at = NOW()
       WHERE resource_id = $1`,
      [id]
    );
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to disable resource" });
  }
});


// -------------------------------------------------------------
// PHYSICAL EXAMPLES
// -------------------------------------------------------------
app.get("/resources/:id/examples", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await query(
      `SELECT barcode, example_location_code, example_health_state, example_op_state
       FROM physical_examples
       WHERE resource_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to fetch examples" });
  }
});

app.post("/resources/:id/examples", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { barcode, location_code, health_state, op_state } = req.body;
    if(!barcode || !location_code || !health_state || !op_state) {
        return res.status(400).json({message: "Missing required fields"});
    }
    
    await query(
      `INSERT INTO physical_examples(barcode, resource_id, example_location_code, example_health_state, example_op_state, latest_modified_at, latest_modified_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), 1)`,
      [barcode, id, location_code, health_state, op_state]
    );
    res.json({ok: true});
  } catch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to create example" });
  }
});

app.put("/resources/:id/examples/:barcode", async (req, res) => {
  try {
    const { id, barcode } = req.params;
    const { location_code, health_state, op_state } = req.body;
    
    await query(
      `UPDATE physical_examples
       SET example_location_code = $1, example_health_state = $2, example_op_state = $3, latest_modified_at = NOW()
       WHERE resource_id = $4 AND barcode = $5`,
      [location_code, health_state, op_state, Number(id), barcode]
    );
    res.json({ok: true});
  } catch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to update example" });
  }
});

app.delete("/resources/:id/examples/:barcode", async (req, res) => {
  try {
    const { id, barcode } = req.params;
    await query(
      `DELETE FROM physical_examples WHERE resource_id = $1 AND barcode = $2`,
      [Number(id), barcode]
    );
    res.json({ok: true});
  } catch(err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ message: "Failed to disable example" });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`library-microservice listening on :${PORT}`);
});
