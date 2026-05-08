const fs = require('fs');
let c = fs.readFileSync('library-microservice/src/index.js', 'utf8');

c = c.replace(
    'LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,\n      [...params, pageSize, offset]\n    );',
    'LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;\n    console.log("EXECUTING QUERY:", sql);\n    console.log("WITH PARAMS:", [...params, pageSize, offset]);\n    const result = await query(sql, [...params, pageSize, offset]);'
);

fs.writeFileSync('library-microservice/src/index.js', c);
