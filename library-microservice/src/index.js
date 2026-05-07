require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { query, pool } = require("./db");

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
    autor_id: row.autor_id,
    editorial: row.editorial,
    editorial_id: row.editorial_id,
    genero: row.generos, 
    generos_ids: row.generos_ids ? row.generos_ids.split(',').map(Number) : [],
    disponible: row.disponible,
    tipo: row.tipo,
    ano_publicacion: row.ano_publicacion,
    costo: row.costo,
    isbn: row.isbn,
    edicion: row.edicion,
    sinopsis: row.sinopsis,
    lenguajes: row.lenguajes,
    lenguajes_ids: row.lenguajes_ids ? row.lenguajes_ids.split(',').map(Number) : [],
    ubicacion: row.ubicacion,
    codebar: row.codebar
  };
}

// METADATA (For Dropdowns)
app.get("/library-metadata", async (req, res) => {
  try {
     const [authors, publishers, categories, languages] = await Promise.all([
       query(`SELECT colaborator_id AS id, CONCAT_WS(' ', first_name, middle_name, father_lastname, mother_lastname) AS name FROM collaborators ORDER BY first_name`),
       query(`SELECT organization_id AS id, organization_name AS name FROM organizations ORDER BY organization_name`),
       query(`SELECT category_id AS id, category_name AS name FROM categories ORDER BY category_name`),
       query(`SELECT language_id AS id, language_name AS name FROM languages ORDER BY language_name`)
     ]);
     res.json({
       authors: authors.rows,
       publishers: publishers.rows,
       categories: categories.rows,
       languages: languages.rows
     });
  } catch(err) {
     console.error(err);
     res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// GET /resources?search=&page=&pageSize=&lenguaje=&categoria=&autor=&editorial=&anio=&tipo=
app.get("/resources", async (req, res) => {
  try {
    const search    = String(req.query.search    || "").trim();
    const lenguaje  = String(req.query.lenguaje  || "").trim();
    const categoria = String(req.query.categoria || "").trim();
    const autor     = String(req.query.autor     || "").trim();
    const editorial = String(req.query.editorial || "").trim();
    const anio      = req.query.anio ? Number(req.query.anio) : null;
    const tipo      = String(req.query.tipo      || "").trim();
    const page      = Math.max(1, Number(req.query.page || 1));
    const pageSize  = Math.min(50, Math.max(1, Number(req.query.pageSize || 10)));
    const offset    = (page - 1) * pageSize;

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

    if (lenguaje) {
      params.push(`%${lenguaje}%`);
      where.push(`EXISTS (
        SELECT 1 FROM supplementary_languages sl2
        JOIN languages l2 ON l2.language_id = sl2.language_id
        WHERE sl2.resource_id = r.resource_id AND l2.language_name ILIKE $${params.length}
      )`);
    }

    if (categoria) {
      params.push(`%${categoria}%`);
      where.push(`EXISTS (
        SELECT 1 FROM categories_resources cr2
        JOIN categories cat2 ON cat2.category_id = cr2.category_id
        WHERE cr2.resource_id = r.resource_id AND cat2.category_name ILIKE $${params.length}
      )`);
    }

    if (autor) {
      params.push(`%${autor}%`);
      where.push(`(c.first_name ILIKE $${params.length} OR c.father_lastname ILIKE $${params.length} OR CONCAT_WS(' ', c.first_name, c.father_lastname) ILIKE $${params.length})`);
    }

    if (editorial) {
      params.push(`%${editorial}%`);
      where.push(`o.organization_name ILIKE $${params.length}`);
    }

    if (anio) {
      params.push(anio);
      where.push(`r.resource_publication_year = $${params.length}`);
    }

    if (tipo) {
      params.push(tipo);
      where.push(`r.resource_type = $${params.length}`);
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
          c.colaborator_id AS autor_id,
          o.organization_name AS editorial,
          o.organization_id AS editorial_id,
          STRING_AGG(DISTINCT cat.category_name, ', ') AS generos,
          STRING_AGG(DISTINCT cat.category_id::text, ',') AS generos_ids,
          (r.resource_state = 'available') AS disponible,
          r.resource_type AS tipo,
          r.resource_publication_year AS ano_publicacion,
          r.resource_cost AS costo,
          bm.book_isbn AS isbn,
          bm.book_edition_number AS edicion,
          bm.book_synopsis AS sinopsis,
          STRING_AGG(DISTINCT l.language_name, ', ') AS lenguajes,
          STRING_AGG(DISTINCT l.language_id::text, ',') AS lenguajes_ids,
          STRING_AGG(DISTINCT pe.example_location_code, ', ') AS ubicacion,
          STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       LEFT JOIN book_metadata bm ON bm.resource_id = r.resource_id
       LEFT JOIN supplementary_languages sl ON sl.resource_id = r.resource_id
       LEFT JOIN languages l ON l.language_id = sl.language_id
       LEFT JOIN physical_examples pe ON pe.resource_id = r.resource_id
       ${whereSql}
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, c.colaborator_id, o.organization_name, o.organization_id, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn, bm.book_edition_number, bm.book_synopsis
       ORDER BY r.resource_id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, offset]
    );

    const items = result.rows.map(resourceRowToDto);
    res.json({ items, total, page, pageSize });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Action not permitted: " + (err.detail || "Unique constraint violated.") });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
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
          c.colaborator_id AS autor_id,
          o.organization_name AS editorial,
          o.organization_id AS editorial_id,
          STRING_AGG(DISTINCT cat.category_name, ', ') AS generos,
          STRING_AGG(DISTINCT cat.category_id::text, ',') AS generos_ids,
          (r.resource_state = 'available') AS disponible,
          r.resource_type AS tipo,
          r.resource_publication_year AS ano_publicacion,
          r.resource_cost AS costo,
          bm.book_isbn AS isbn,
          bm.book_edition_number AS edicion,
          bm.book_synopsis AS sinopsis,
          STRING_AGG(DISTINCT l.language_name, ', ') AS lenguajes,
          STRING_AGG(DISTINCT l.language_id::text, ',') AS lenguajes_ids,
          STRING_AGG(DISTINCT pe.example_location_code, ', ') AS ubicacion,
          STRING_AGG(DISTINCT pe.barcode, ', ') AS codebar
       FROM resources r
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       LEFT JOIN organizations o ON o.organization_id = r.publisher_id
       LEFT JOIN categories_resources cr ON cr.resource_id = r.resource_id
       LEFT JOIN categories cat ON cat.category_id = cr.category_id
       LEFT JOIN book_metadata bm ON bm.resource_id = r.resource_id
       LEFT JOIN supplementary_languages sl ON sl.resource_id = r.resource_id
       LEFT JOIN languages l ON l.language_id = sl.language_id
       LEFT JOIN physical_examples pe ON pe.resource_id = r.resource_id
       WHERE r.resource_id = $1
       GROUP BY r.resource_id, c.first_name, c.middle_name, c.father_lastname, c.mother_lastname, c.colaborator_id, o.organization_name, o.organization_id, r.resource_state, r.resource_type, r.resource_publication_year, r.resource_cost, bm.book_isbn, bm.book_edition_number, bm.book_synopsis`,
      [id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "Resource not found" });
    res.json(resourceRowToDto(result.rows[0]));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Action not permitted: " + (err.detail || "Unique constraint violated.") });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /resources
app.post("/resources", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { titulo, tipo, disponible, ano_publicacion, costo, autor_id, editorial_id, generos_ids, lenguajes_ids, isbn, edicion, sinopsis } = req.body || {};
    if (!titulo || !tipo) return res.status(400).json({ message: "Title and type are required" });
    
    await client.query(`SELECT setval('resources_resource_id_seq', COALESCE((SELECT MAX(resource_id) FROM resources), 1))`);
    
    const state = disponible ? 'available' : 'disabled';
    
    const insertRes = await client.query(
      `INSERT INTO resources(
        resource_title, resource_type, resource_state, resource_publication_year, resource_cost, author_principal_id, publisher_id,
        created_at, created_by, latest_modified_at, latest_modified_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 1, NOW(), 1) RETURNING resource_id`,
      [titulo, tipo, state, ano_publicacion || null, costo || 0, autor_id || null, editorial_id || null]
    );
    const resource_id = insertRes.rows[0].resource_id;

    if (tipo === 'book' && (isbn || edicion || sinopsis)) {
       await client.query(`INSERT INTO book_metadata(resource_id, book_isbn, book_edition_number, book_synopsis) VALUES ($1, $2, $3, $4)`, [resource_id, isbn || null, edicion || null, sinopsis || null]);
    }

    if (Array.isArray(generos_ids) && generos_ids.length > 0) {
       for(const cid of generos_ids) {
          await client.query(`INSERT INTO categories_resources(category_id, resource_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [cid, resource_id]);
       }
    }
    
    if (Array.isArray(lenguajes_ids) && lenguajes_ids.length > 0) {
       for(const lid of lenguajes_ids) {
          await client.query(`INSERT INTO supplementary_languages(language_id, resource_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [lid, resource_id]);
       }
    }

    await client.query('COMMIT');
    res.json({ id: resource_id, ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: "Failed to create resource" });
  } finally {
    client.release();
  }
});

// PUT /resources/:id
app.put("/resources/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid id" });
    const { titulo, tipo, disponible, ano_publicacion, costo, autor_id, editorial_id, generos_ids, lenguajes_ids, isbn, edicion, sinopsis } = req.body || {};
    if (!titulo || !tipo) return res.status(400).json({ message: "Title and type are required" });
    
    const state = disponible ? 'available' : 'disabled';
    
    await client.query(
      `UPDATE resources
       SET resource_title = $1, resource_type = $2, resource_state = $3, 
           resource_publication_year = $4, resource_cost = $5, author_principal_id = $6, publisher_id = $7, latest_modified_at = NOW()
       WHERE resource_id = $8`,
      [titulo, tipo, state, ano_publicacion || null, costo || 0, autor_id || null, editorial_id || null, id]
    );

    if (tipo === 'book') {
       await client.query(`INSERT INTO book_metadata(resource_id, book_isbn, book_edition_number, book_synopsis) VALUES ($1, $2, $3, $4) ON CONFLICT (resource_id) DO UPDATE SET book_isbn = $2, book_edition_number = $3, book_synopsis = $4`, [id, isbn || null, edicion || null, sinopsis || null]);
    } else {
       await client.query(`DELETE FROM book_metadata WHERE resource_id = $1`, [id]);
    }

    await client.query(`DELETE FROM categories_resources WHERE resource_id = $1`, [id]);
    if (Array.isArray(generos_ids)) {
       for(const cid of generos_ids) {
          await client.query(`INSERT INTO categories_resources(category_id, resource_id) VALUES ($1, $2)`, [cid, id]);
       }
    }

    await client.query(`DELETE FROM supplementary_languages WHERE resource_id = $1`, [id]);
    if (Array.isArray(lenguajes_ids)) {
       for(const lid of lenguajes_ids) {
          await client.query(`INSERT INTO supplementary_languages(language_id, resource_id) VALUES ($1, $2)`, [lid, id]);
       }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: "Failed to update resource" });
  } finally {
    client.release();
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
    if (err.code === "23505") {
      return res.status(400).json({ error: "Action not permitted: " + (err.detail || "Unique constraint violated.") });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
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
    console.error(err);
    res.status(500).json({ message: "Failed to disable example" });
  }
});

app.listen(PORT, () => {
  console.log(`library-microservice listening on :${PORT}`);
});

// -------------------------------------------------------------
// PRÉSTAMOS Y DEVOLUCIONES
// -------------------------------------------------------------

// Helper: add N business days to a date (skips Sat/Sun)
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++; // skip Sat(6) and Sun(0)
  }
  return result;
}

// Helper: count business days between two dates
function businessDaysBetween(start, end) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);
  fin.setHours(0, 0, 0, 0);
  while (cur < fin) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// GET /loans?campus_id=&state=
app.get("/loans", async (req, res) => {
  try {
    const { campus_id, state } = req.query;
    const params = [];
    const where = [];

    if (campus_id) { params.push(campus_id); where.push(`pl.campus_id = $${params.length}`); }
    if (state)     { params.push(state);     where.push(`pl.loan_state = $${params.length}`); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await query(
      `SELECT
         pl.loan_id,
         pl.barcode,
         pl.campus_id,
         pl.initial_lent_at,
         pl.returned_at,
         pl.loan_state,
         r.resource_title AS titulo,
         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,
         pe.example_location_code AS ubicacion
       FROM physical_loans pl
       JOIN physical_examples pe ON pe.barcode = pl.barcode
       JOIN resources r ON r.resource_id = pe.resource_id
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       ${whereSql}
       ORDER BY pl.loan_id DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Action not permitted: " + (err.detail || "Unique constraint violated.") });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /loans/receipt/:id — retrieve full loan receipt
app.get("/loans/receipt/:id", async (req, res) => {
  try {
    const loan_id = Number(req.params.id);
    const result = await query(
      `SELECT
         pl.loan_id,
         pl.barcode,
         pl.campus_id,
         pl.initial_lent_at,
         pl.loan_state,
         r.resource_title  AS titulo,
         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,
         pe.example_location_code AS ubicacion,
         pe.example_health_state  AS estado_fisico
       FROM physical_loans pl
       JOIN physical_examples pe ON pe.barcode = pl.barcode
       JOIN resources r          ON r.resource_id = pe.resource_id
       LEFT JOIN collaborators c ON c.colaborator_id = r.author_principal_id
       WHERE pl.loan_id = $1`,
      [loan_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Préstamo no encontrado." });
    const row = result.rows[0];
    // Attach computed due_date (5 business days from initial_lent_at)
    row.due_date = addBusinessDays(new Date(row.initial_lent_at), 5);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /loans  — crear préstamo
app.post("/loans", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { barcode, campus_id } = req.body;
    if (!barcode || !campus_id) return res.status(400).json({ message: "barcode y campus_id son requeridos" });

    // Verificar que el ejemplar esté disponible
    const ex = await client.query(
      `SELECT example_op_state FROM physical_examples WHERE barcode = $1`, [barcode]
    );
    if (!ex.rows.length) return res.status(404).json({ message: "Ejemplar no encontrado" });
    if (ex.rows[0].example_op_state !== "available")
      return res.status(409).json({ message: "El ejemplar no está disponible" });

    // Crear préstamo
    const ins = await client.query(
      `INSERT INTO physical_loans(barcode, campus_id, initial_lent_at, loan_state, created_at, created_by, latest_modified_at, latest_modified_by)
       VALUES ($1, $2, NOW(), 'active', NOW(), $2, NOW(), $2) RETURNING loan_id`,
      [barcode, campus_id]
    );

    // Marcar ejemplar como "on loan"
    await client.query(
      `UPDATE physical_examples SET example_op_state = 'on loan', latest_modified_at = NOW() WHERE barcode = $1`,
      [barcode]
    );

    await client.query("COMMIT");
    res.json({ ok: true, loan_id: ins.rows[0].loan_id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to create loan" });
  } finally {
    client.release();
  }
});

// PUT /loans/:id/return  — devolver + detectar mora
app.put("/loans/:id/return", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const loan_id = Number(req.params.id);
    const loan = await client.query(
      `SELECT pl.barcode, pl.loan_state, pl.initial_lent_at, pl.campus_id,
              r.resource_title, pe.example_location_code
       FROM physical_loans pl
       JOIN physical_examples pe ON pe.barcode = pl.barcode
       JOIN resources r ON r.resource_id = pe.resource_id
       WHERE pl.loan_id = $1`,
      [loan_id]
    );
    if (!loan.rows.length) return res.status(404).json({ message: "Préstamo no encontrado" });
    if (loan.rows[0].loan_state === "completed")
      return res.status(409).json({ message: "El préstamo ya fue completado" });

    const returnedAt = new Date();
    const loanedAt  = new Date(loan.rows[0].initial_lent_at);
    const dueDate   = addBusinessDays(loanedAt, 5);
    const overdueDays = returnedAt > dueDate ? businessDaysBetween(dueDate, returnedAt) : 0;
    const DAILY_FINE  = 5.00; // $5 MXN per business day
    const fineAmount  = overdueDays > 0 ? +(overdueDays * DAILY_FINE).toFixed(2) : 0;
    const finalState  = overdueDays > 0 ? 'overdue' : 'completed';

    await client.query(
      `UPDATE physical_loans
       SET loan_state = $1, returned_at = $2, latest_modified_at = NOW()
       WHERE loan_id = $3`,
      [finalState, returnedAt, loan_id]
    );
    await client.query(
      `UPDATE physical_examples SET example_op_state = 'available', latest_modified_at = NOW() WHERE barcode = $1`,
      [loan.rows[0].barcode]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      loan_id,
      overdue_days: overdueDays,
      fine_amount: fineAmount,
      fine_currency: 'MXN',
      due_date: dueDate,
      returned_at: returnedAt,
      // Include enough context for the BFF to create the fine in treasury
      campus_id:  loan.rows[0].campus_id,
      titulo:     loan.rows[0].resource_title,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Failed to return loan" });
  } finally {
    client.release();
  }
});


// POST /loans/:id/renew — renovar prestamo fisico
app.post("/loans/:id/renew", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const loan_id = Number(req.params.id);
    const loan = await client.query(
      `SELECT pl.* FROM physical_loans pl WHERE pl.loan_id=$1 AND pl.loan_state IN ('active','overdue')`, [loan_id]
    );
    if (!loan.rows.length) return res.status(404).json({ message: "Prestamo activo no encontrado" });
    const now = new Date();
    await client.query(`INSERT INTO physical_loan_renewals(loan_id, renewal_lent_at) VALUES($1,$2)`, [loan_id, now]);
    await client.query(`UPDATE physical_loans SET loan_state='active', latest_modified_at=$2, latest_modified_by=1 WHERE loan_id=$1`, [loan_id, now]);
    await client.query("COMMIT");
    const renewals = await query(`SELECT COUNT(*)::int AS cnt FROM physical_loan_renewals WHERE loan_id=$1`, [loan_id]);
    res.json({ ok: true, loan_id, renewal_count: renewals.rows[0].cnt, renewed_at: now });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
});

// GET /examples/:barcode/damage-details
app.get("/examples/:barcode/damage-details", async (req, res) => {
  try {
    const { barcode } = req.params;
    const ex = await query(
      `SELECT pe.*,
              drd.damage_type, drd.severity_level, drd.librarian_notes AS damage_notes,
              lrd.librarian_notes AS lost_notes,
              pl.loan_id, pl.campus_id AS borrower_id, pl.initial_lent_at, pl.loan_state,
              (SELECT COUNT(*)::int FROM physical_loan_renewals plr WHERE plr.loan_id = pl.loan_id) AS renewal_count
       FROM physical_examples pe
       LEFT JOIN damaged_resource_details drd ON drd.barcode = pe.barcode
       LEFT JOIN lost_resource_details    lrd ON lrd.barcode = pe.barcode
       LEFT JOIN physical_loans pl ON pl.barcode = pe.barcode AND pl.loan_state IN ('active','overdue')
       WHERE pe.barcode = $1
       LIMIT 1`, [barcode]
    );
    if (!ex.rows.length) return res.status(404).json({ message: "Ejemplar no encontrado" });
    res.json(ex.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// PUT /examples/:barcode/damage-details — upsert damage notes (librarian/admin)
app.put("/examples/:barcode/damage-details", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { barcode } = req.params;
    const { damage_type, severity_level, librarian_notes, health_state } = req.body;
    if (health_state) {
      await client.query(
        `UPDATE physical_examples SET example_health_state=$1, latest_modified_at=NOW() WHERE barcode=$2`,
        [health_state, barcode]
      );
    }
    if (damage_type && severity_level) {
      await client.query(
        `INSERT INTO damaged_resource_details(barcode, damage_type, severity_level, librarian_notes)
         VALUES($1,$2,$3,$4)
         ON CONFLICT(barcode) DO UPDATE SET damage_type=$2, severity_level=$3, librarian_notes=$4`,
        [barcode, damage_type, severity_level, librarian_notes || ""]
      );
    } else if (librarian_notes !== undefined) {
      await client.query(
        `UPDATE damaged_resource_details SET librarian_notes=$1 WHERE barcode=$2`,
        [librarian_notes, barcode]
      );
    }
    await client.query("COMMIT");
    const r = await query(
      `SELECT pe.*, drd.damage_type, drd.severity_level, drd.librarian_notes AS damage_notes
       FROM physical_examples pe
       LEFT JOIN damaged_resource_details drd ON drd.barcode = pe.barcode
       WHERE pe.barcode = $1`, [barcode]
    );
    res.json(r.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});
// ─────────────────────────────────────────────────────────────────────────────
// DIGITAL RESOURCES
// ─────────────────────────────────────────────────────────────────────────────
const DIGITAL_MAX_RENEWALS = 3;

// GET /resources/:id/digital-metadata
app.get("/resources/:id/digital-metadata", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await query(
      `SELECT dm.*, r.resource_type, r.resource_title
       FROM digital_metadata dm
       JOIN resources r ON r.resource_id = dm.resource_id
       WHERE dm.resource_id = $1`, [id]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Metadatos digitales no encontrados" });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// PUT /resources/:id/digital-metadata  (admin/librarian)
app.put("/resources/:id/digital-metadata", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { digital_file_format, digital_file_size, digital_url_link,
            digital_license_model, digital_max_concurrent_users, digital_total_users_allows } = req.body;
    const r = await query(
      `UPDATE digital_metadata
       SET digital_file_format = COALESCE($1, digital_file_format),
           digital_file_size   = COALESCE($2, digital_file_size),
           digital_url_link    = COALESCE($3, digital_url_link),
           digital_license_model            = COALESCE($4, digital_license_model),
           digital_max_concurrent_users     = COALESCE($5, digital_max_concurrent_users),
           digital_total_users_allows       = COALESCE($6, digital_total_users_allows)
       WHERE resource_id = $7
       RETURNING *`,
      [digital_file_format, digital_file_size, digital_url_link,
       digital_license_model, digital_max_concurrent_users, digital_total_users_allows, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Metadatos digitales no encontrados" });
    res.json(r.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /resources/:id/digital-status  — concurrent slot availability
app.get("/resources/:id/digital-status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const metaRes = await query(
      `SELECT digital_license_model, digital_max_concurrent_users FROM digital_metadata WHERE resource_id = $1`, [id]
    );
    if (!metaRes.rows.length) return res.status(404).json({ message: "Recurso no encontrado" });
    const { digital_license_model, digital_max_concurrent_users } = metaRes.rows[0];

    const activeRes = await query(
      `SELECT COUNT(*)::int AS active_concurrent
       FROM digital_loans WHERE resource_id = $1 AND digital_loan_state = 'active'`, [id]
    );
    const active = activeRes.rows[0].active_concurrent;
    const max    = digital_max_concurrent_users;
    res.json({
      license_model:      digital_license_model,
      active_concurrent:  active,
      max_concurrent:     max,
      max_renewals:       DIGITAL_MAX_RENEWALS,
      can_access:         digital_license_model !== 'concurrent' || max == null || active < max,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// GET /digital-loans?campus_id=&resource_id=&state=
app.get("/digital-loans", async (req, res) => {
  try {
    const { campus_id, resource_id, state } = req.query;
    const params = []; const where = [];
    if (campus_id)   { params.push(Number(campus_id));   where.push(`dl.campus_id = $${params.length}`); }
    if (resource_id) { params.push(Number(resource_id)); where.push(`dl.resource_id = $${params.length}`); }
    if (state)       { params.push(state);               where.push(`dl.digital_loan_state = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const r = await query(
      `SELECT dl.digital_loan_id, dl.resource_id, dl.campus_id, dl.initial_lent_at,
              dl.digital_loan_state,
              r.resource_title AS titulo, r.resource_type AS tipo,
              (SELECT COUNT(*) FROM digital_loan_renewals dlr WHERE dlr.digital_loan_id = dl.digital_loan_id)::int AS renewal_count
       FROM digital_loans dl
       JOIN resources r ON r.resource_id = dl.resource_id
       ${whereSql}
       ORDER BY dl.initial_lent_at DESC`, params
    );
    res.json({ items: r.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// POST /digital-loans — crear acceso digital (verifica slots concurrentes)
app.post("/digital-loans", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { resource_id, campus_id } = req.body;
    if (!resource_id || !campus_id) return res.status(400).json({ message: "resource_id y campus_id son requeridos" });

    // Check if user already has an active loan for this resource
    const existing = await client.query(
      `SELECT digital_loan_id FROM digital_loans WHERE resource_id=$1 AND campus_id=$2 AND digital_loan_state='active'`,
      [resource_id, campus_id]
    );
    if (existing.rows.length) {
      await client.query("COMMIT");
      return res.status(200).json({ digital_loan_id: existing.rows[0].digital_loan_id, reused: true });
    }

    // Check concurrent limit
    const meta = await client.query(
      `SELECT digital_license_model, digital_max_concurrent_users FROM digital_metadata WHERE resource_id=$1`, [resource_id]
    );
    if (!meta.rows.length) return res.status(404).json({ message: "Metadatos digitales no encontrados" });
    const { digital_license_model, digital_max_concurrent_users } = meta.rows[0];

    if (digital_license_model === 'concurrent' && digital_max_concurrent_users != null) {
      const active = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM digital_loans WHERE resource_id=$1 AND digital_loan_state='active'`, [resource_id]
      );
      if (active.rows[0].cnt >= digital_max_concurrent_users) {
        await client.query("ROLLBACK");
        return res.status(409).json({ message: `Límite de usuarios concurrentes alcanzado (${digital_max_concurrent_users}/${digital_max_concurrent_users}). Intenta más tarde.` });
      }
    }

    const now = new Date();
    const r = await client.query(
      `INSERT INTO digital_loans(resource_id, campus_id, initial_lent_at, digital_loan_state, created_at, created_by, latest_modified_at, latest_modified_by)
       VALUES($1,$2,$3,'active',$3,$2,$3,$2) RETURNING digital_loan_id`,
      [resource_id, campus_id, now]
    );
    await client.query("COMMIT");
    res.status(201).json({ digital_loan_id: r.rows[0].digital_loan_id, reused: false });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// PUT /digital-loans/:id/return
app.put("/digital-loans/:id/return", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await query(
      `UPDATE digital_loans SET digital_loan_state='completed', latest_modified_at=NOW()
       WHERE digital_loan_id=$1 AND digital_loan_state='active' RETURNING *`, [id]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Préstamo digital activo no encontrado" });
    res.json({ ok: true, loan: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// PUT /digital-loans/:id/renew
app.put("/digital-loans/:id/renew", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const loan = await query(
      `SELECT * FROM digital_loans WHERE digital_loan_id=$1 AND digital_loan_state='active'`, [id]
    );
    if (!loan.rows.length) return res.status(404).json({ message: "Préstamo digital activo no encontrado" });

    const renewals = await query(
      `SELECT COUNT(*)::int AS cnt FROM digital_loan_renewals WHERE digital_loan_id=$1`, [id]
    );
    if (renewals.rows[0].cnt >= DIGITAL_MAX_RENEWALS) {
      return res.status(409).json({ message: `Límite de renovaciones alcanzado (${DIGITAL_MAX_RENEWALS} máx.)` });
    }
    const r = await query(
      `INSERT INTO digital_loan_renewals(digital_loan_id, renewal_lent_at) VALUES($1, NOW()) RETURNING *`, [id]
    );
    res.json({ ok: true, renewal: r.rows[0], renewals_used: renewals.rows[0].cnt + 1, max_renewals: DIGITAL_MAX_RENEWALS });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});