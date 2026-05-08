const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'db-treasury',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'ducky_treasury_db',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

const app = express();
app.use(cors());
app.use(express.json());

const VALID_FINE_STATUS = ["unpaid", "paid", "waived", "refunded"];
const VALID_OFFENDER_TYPES = ["student", "employee", "collaborator", "professor", "guest"];

function badRequest(res, message) {
  return res.status(400).json({ message });
}

// Library BFF endpoints (no /api prefix required depending on proxy, but we'll map both)
app.get(['/fines', '/api/fines'], async (req, res) => {
  try {
    const { campus_id, status, offender_id, source_system } = req.query;
    let query = `SELECT f.*,
                        rc.code AS reason_code,
                        rc.reason_type,
                        rc.description AS reason_description,
                        COALESCE(SUM(p.amount_paid), 0) AS amount_paid_total,
                        (f.price - COALESCE(SUM(p.amount_paid), 0)) AS amount_due
                 FROM fines f
                 LEFT JOIN reason_codes rc ON rc.code_id = f.reason_code_id
                 LEFT JOIN payments p ON p.fine_id = f.find_id
                 WHERE 1=1`;
    let params = [];
    if (campus_id) {
      params.push(campus_id);
      query += ` AND f.offender_id = $${params.length}`;
    }
    if (offender_id) {
      params.push(offender_id);
      query += ` AND f.offender_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND f.fine_status = $${params.length}`;
    }
    if (source_system) {
      params.push(source_system);
      query += ` AND f.source_system = $${params.length}`;
    }
    query += ` GROUP BY f.find_id, rc.code, rc.reason_type, rc.description
               ORDER BY f.find_id DESC`;

    // Apply pagination if requested
    const page = parseInt(req.query.page);
    if (page) {
      const limit = 20;
      const offset = (page - 1) * limit;
      const paginatedQuery = query + ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const result = await pool.query(paginatedQuery, [...params, limit, offset]);
      const totalRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS total`, params);
      return res.json({
        items: result.rows,
        total: parseInt(totalRes.rows[0].count),
        page,
        pages: Math.ceil(parseInt(totalRes.rows[0].count) / limit)
      });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/fines', '/api/fines'], async (req, res) => {
  try {
    const { price, reason_code_id, source_system, source_transaction_id, offender_id, offender_type } = req.body;
    if (price === undefined || Number(price) <= 0) return badRequest(res, "Monto de multa inválido.");
    if (!reason_code_id) return badRequest(res, "reason_code_id es obligatorio.");
    if (!source_system) return badRequest(res, "source_system es obligatorio.");
    if (!source_transaction_id) return badRequest(res, "source_transaction_id es obligatorio.");
    if (!offender_id) return badRequest(res, "offender_id es obligatorio.");
    if (!VALID_OFFENDER_TYPES.includes(String(offender_type || ""))) {
      return badRequest(res, "offender_type inválido.");
    }
    const result = await pool.query(
      `INSERT INTO fines (price, fine_status, reason_code_id, source_system, source_transaction_id, offender_id, offender_type, created_at, modified_at)
       VALUES ($1, 'unpaid', $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [Number(price), reason_code_id, source_system, source_transaction_id, offender_id, offender_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put(['/fines/:id', '/api/fines/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const { price, fine_status } = req.body;
    
    let setClauses = [];
    let params = [];
    let paramIndex = 1;

    if (price !== undefined) {
      if (Number(price) <= 0) return badRequest(res, "Monto de multa inválido.");
      setClauses.push(`price = $${paramIndex++}`);
      params.push(Number(price));
    }
    if (fine_status !== undefined) {
      if (!VALID_FINE_STATUS.includes(String(fine_status))) {
        return badRequest(res, "fine_status inválido.");
      }
      setClauses.push(`fine_status = $${paramIndex++}`);
      params.push(fine_status);
      if (fine_status === 'paid') {
        setClauses.push(`paid_at = NOW()`);
      } else {
        setClauses.push(`paid_at = NULL`);
      }
    }
    setClauses.push(`modified_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE fines SET ${setClauses.join(', ')} WHERE find_id = $${paramIndex} RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ message: "Multa no encontrada." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post(['/fines/:id/pay', '/api/fines/:id/pay'], async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { payment_method_id, amount_paid, transaction_reference } = req.body;
    if (amount_paid !== undefined && Number(amount_paid) <= 0) {
      return badRequest(res, "amount_paid debe ser mayor a 0.");
    }

    const fineResult = await client.query('SELECT * FROM fines WHERE find_id = $1', [id]);
    if (fineResult.rows.length === 0) return res.status(404).json({ message: 'Fine not found' });
    const fine = fineResult.rows[0];

    if (fine.fine_status === 'paid') return badRequest(res, 'Fine is already paid');

    const payResult = await client.query(
      `INSERT INTO payments (fine_id, amount_paid, payment_method_id, transaction_reference, paid_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [id, amount_paid || fine.price, payment_method_id || 1, transaction_reference || `TXN-${Date.now()}`]
    );

    const paidTotalRes = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE fine_id = $1`,
      [id]
    );
    const totalPaid = Number(paidTotalRes.rows[0]?.total_paid || 0);
    const isFullyPaid = totalPaid >= Number(fine.price);
    await client.query(
      `UPDATE fines
       SET fine_status = $2::fine_status,
           paid_at = CASE WHEN $2::fine_status = 'paid' THEN NOW() ELSE NULL END,
           modified_at = NOW()
       WHERE find_id = $1`,
      [id, isFullyPaid ? 'paid' : 'unpaid']
    );

    await client.query('COMMIT');
    res.json({ ...payResult.rows[0], fully_paid: isFullyPaid, amount_paid_total: totalPaid, amount_due: Math.max(Number(fine.price) - totalPaid, 0) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Bulk student payment by offender_id (campus_id)
app.post(['/fines/pay-by-offender', '/api/fines/pay-by-offender'], async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { offender_id, amount_paid, payment_method_id, transaction_reference } = req.body || {};
    if (!offender_id) return badRequest(res, "offender_id es obligatorio.");
    if (amount_paid === undefined || Number(amount_paid) <= 0) return badRequest(res, "amount_paid debe ser mayor a 0.");

    const finesRes = await client.query(
      `SELECT find_id, price
       FROM fines
       WHERE offender_id = $1 AND fine_status = 'unpaid'
       ORDER BY created_at ASC, find_id ASC`,
      [offender_id]
    );
    if (!finesRes.rows.length) return badRequest(res, "No hay multas sin pagar para ese usuario.");

    let remaining = Number(amount_paid);
    const applied = [];
    for (const fine of finesRes.rows) {
      if (remaining <= 0) break;
      const paidRes = await client.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS paid_total FROM payments WHERE fine_id = $1`,
        [fine.find_id]
      );
      const paidTotal = Number(paidRes.rows[0]?.paid_total || 0);
      const due = Math.max(Number(fine.price) - paidTotal, 0);
      if (due <= 0) continue;
      const payment = Math.min(remaining, due);

      await client.query(
        `INSERT INTO payments (fine_id, amount_paid, payment_method_id, transaction_reference, paid_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [fine.find_id, payment, payment_method_id || 1, transaction_reference || `BULK-${offender_id}-${Date.now()}`]
      );
      remaining -= payment;

      const newPaid = paidTotal + payment;
      const fullyPaid = newPaid >= Number(fine.price);
      await client.query(
        `UPDATE fines
         SET fine_status = $2::fine_status,
             paid_at = CASE WHEN $2::fine_status = 'paid' THEN NOW() ELSE NULL END,
             modified_at = NOW()
         WHERE find_id = $1`,
        [fine.find_id, fullyPaid ? 'paid' : 'unpaid']
      );
      applied.push({ fine_id: fine.find_id, applied_amount: payment, amount_due: Math.max(Number(fine.price) - newPaid, 0), fully_paid: fullyPaid });
    }

    await client.query('COMMIT');
    res.json({ ok: true, offender_id: Number(offender_id), total_requested: Number(amount_paid), total_applied: Number(amount_paid) - remaining, unapplied_amount: remaining, payments_applied: applied });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

app.get(['/fines/offender/:offender_id/status', '/api/fines/offender/:offender_id/status'], async (req, res) => {
  try {
    const offenderId = Number(req.params.offender_id);
    if (!offenderId) return badRequest(res, "offender_id inválido.");
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unpaid_count,
              COALESCE(SUM(price),0) AS total_unpaid
       FROM fines
       WHERE offender_id = $1 AND fine_status = 'unpaid'`,
      [offenderId]
    );
    const unpaidCount = Number(result.rows[0]?.unpaid_count || 0);
    const totalUnpaid = Number(result.rows[0]?.total_unpaid || 0);
    res.json({ offender_id: offenderId, has_unpaid_fines: unpaidCount > 0, unpaid_count: unpaidCount, total_unpaid: totalUnpaid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete(['/fines/:id', '/api/fines/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE fines
       SET fine_status = 'waived', modified_at = NOW()
       WHERE find_id = $1
       RETURNING *`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Fine not found" });
    res.json({ ok: true, soft_deleted: true, fine: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get(['/daily-fine', '/api/daily-fine'], (req, res) => {
  res.json({ amount: 5.00 }); // Hardcoded daily fine rate
});


// Generic CRUD for other tables (reason_codes, payments, payment_methods)
['reason_codes', 'payments', 'payment_methods'].forEach(table => {
  app.get(`/api/${table}`, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;
      
      let idCol = 'id';
      if(table === 'reason_codes') idCol = 'code_id';
      if(table === 'payments') idCol = 'payment_id';
      if(table === 'payment_methods') idCol = 'method_id';

      const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${idCol} DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      const totalRes = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      res.json({
        items: result.rows,
        total: parseInt(totalRes.rows[0].count),
        page,
        pages: Math.ceil(parseInt(totalRes.rows[0].count) / limit)
      });
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  app.post(`/api/${table}`, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      if(table === 'reason_codes') { keys.push('created_at', 'modified_at'); values.push(new Date(), new Date()); }
      const placeholders = values.map((_, i) => `$${i+1}`).join(', ');
      const q = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await pool.query(q, values);
      res.json(result.rows[0]);
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  app.put(`/api/${table}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const keys = Object.keys(req.body);
      if (keys.length === 0) return res.json({ ok: true });
      const values = Object.values(req.body);
      if(table === 'reason_codes') { keys.push('modified_at'); values.push(new Date()); }
      
      const setStr = keys.map((k, i) => `${k} = $${i+1}`).join(', ');
      
      let idCol = 'id';
      if(table === 'reason_codes') idCol = 'code_id';
      if(table === 'payments') idCol = 'payment_id';
      if(table === 'payment_methods') idCol = 'method_id';

      values.push(id);
      const result = await pool.query(`UPDATE ${table} SET ${setStr} WHERE ${idCol} = $${values.length} RETURNING *`, values);
      res.json(result.rows[0] || {error: 'Not found'});
    } catch(e) { res.status(500).json({error: e.message}); }
  });

  app.delete(`/api/${table}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      if (table === "payments") {
        return res.status(405).json({ message: "Payments no admiten eliminación." });
      }
      let idCol = 'id';
      if(table === 'reason_codes') idCol = 'code_id';
      if(table === 'payments') idCol = 'payment_id';
      if(table === 'payment_methods') idCol = 'method_id';
      await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1`, [id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({message: e.message}); }
  });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Treasury microservice listening on port ${PORT}`);
});
