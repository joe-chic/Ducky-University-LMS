const fs = require('fs');
let c = fs.readFileSync('src/index.js', 'utf8');

const fixes = [
  {
    find: `const sql = \`SELECT barcode, example_location_code, example_health_state, example_op_state`,
    replace: `const result = await query(\n      \`SELECT barcode, example_location_code, example_health_state, example_op_state`
  },
  {
    find: `const sql = \`SELECT\n         pl.loan_id,\n         pl.barcode,\n         pl.campus_id,\n         pl.initial_lent_at,\n         pl.returned_at,\n         pl.loan_state,\n         r.resource_title AS titulo,\n         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,\n         pe.example_location_code AS ubicacion\n       FROM physical_loans pl`,
    replace: `const result = await query(\n      \`SELECT\n         pl.loan_id,\n         pl.barcode,\n         pl.campus_id,\n         pl.initial_lent_at,\n         pl.returned_at,\n         pl.loan_state,\n         r.resource_title AS titulo,\n         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,\n         pe.example_location_code AS ubicacion\n       FROM physical_loans pl`
  },
  {
    find: `const sql = \`SELECT\n         pl.loan_id,\n         pl.barcode,\n         pl.campus_id,\n         pl.initial_lent_at,\n         pl.loan_state,\n         r.resource_title  AS titulo,\n         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,\n         pe.example_location_code AS ubicacion,\n         pe.example_health_state  AS estado_fisico\n       FROM physical_loans pl`,
    replace: `const result = await query(\n      \`SELECT\n         pl.loan_id,\n         pl.barcode,\n         pl.campus_id,\n         pl.initial_lent_at,\n         pl.loan_state,\n         r.resource_title  AS titulo,\n         CONCAT_WS(' ', c.first_name, c.father_lastname) AS autor,\n         pe.example_location_code AS ubicacion,\n         pe.example_health_state  AS estado_fisico\n       FROM physical_loans pl`
  }
];

fixes.forEach(f => {
  c = c.replace(f.find, f.replace);
});

fs.writeFileSync('src/index.js', c);
