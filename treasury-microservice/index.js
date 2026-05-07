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

// Library BFF endpoints (no /api prefix required depending on proxy, but we'll map both)
app.get(['/fines', '/api/fines'], async (req, res) => {
  try {
    const { campus_id, status } = req.query;
    let query = 'SELECT * FROM fines WHERE 1=1';
    let params = [];
    if (campus_id) {
      params.push(campus_id);
      query += ` AND offender_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND fine_status = $${params.length}`;
    }
    query += ' ORDER BY find_id DESC';

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
    const result = await pool.query(
      `INSERT INTO fines (price, fine_status, reason_code_id, source_system, source_transaction_id, offender_id, offender_type, created_at, modified_at)
       VALUES ($1, 'unpaid', $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [price, reason_code_id, source_system, source_transaction_id, offender_id, offender_type]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      setClauses.push(`price = $${paramIndex++}`);
      params.push(price);
    }
    if (fine_status !== undefined) {
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
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/fines/:id/pay', '/api/fines/:id/pay'], async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { payment_method_id, amount_paid, transaction_reference } = req.body;

    const fineResult = await client.query('SELECT * FROM fines WHERE find_id = $1', [id]);
    if (fineResult.rows.length === 0) throw new Error('Fine not found');
    const fine = fineResult.rows[0];

    if (fine.fine_status === 'paid') throw new Error('Fine is already paid');

    const payResult = await client.query(
      `INSERT INTO payments (fine_id, amount_paid, payment_method_id, transaction_reference, paid_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [id, amount_paid || fine.price, payment_method_id || 1, transaction_reference || `TXN-${Date.now()}`]
    );

    await client.query(
      `UPDATE fines SET fine_status = 'paid', paid_at = NOW(), modified_at = NOW() WHERE find_id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json(payResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.delete(['/fines/:id', '/api/fines/:id'], async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM fines WHERE find_id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      let idCol = 'id';
      if(table === 'reason_codes') idCol = 'code_id';
      if(table === 'payments') idCol = 'payment_id';
      if(table === 'payment_methods') idCol = 'method_id';
      await pool.query(`DELETE FROM ${table} WHERE ${idCol} = $1`, [id]);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({error: e.message}); }
  });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Treasury microservice listening on port ${PORT}`);
});
