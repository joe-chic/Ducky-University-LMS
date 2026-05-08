const fs = require('fs');
let c = fs.readFileSync('library-microservice/src/index.js', 'utf8');

c = c.replace(/const result = await query\(\s*`SELECT/g, 'const sql = `SELECT');
c = c.replace(/LIMIT \$\$\{params\.length \+ 1\} OFFSET \$\$\{params\.length \+ 2\}`,\s*\[\.\.\.params, pageSize, offset\]\s*\);/g, 'LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;\n    console.log("SQL QUERY:", sql);\n    console.log("PARAMS:", [...params, pageSize, offset]);\n    const result = await query(sql, [...params, pageSize, offset]);');

fs.writeFileSync('library-microservice/src/index.js', c);
