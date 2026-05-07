const fs = require('fs');
const path = require('path');

const services = [
  { name: 'scholar-microservice', port: 3003, db: 'ducky_scholar_db' },
  { name: 'scholar-bff-service', port: 4001, target: 'scholar-microservice:3003' },
  { name: 'scholar-frontend', port: 3004, bff: 'http://localhost:4001' },
  { name: 'human-capital-microservice', port: 3005, db: 'ducky_human_capital_db' },
  { name: 'human-capital-bff-service', port: 4002, target: 'human-capital-microservice:3005' },
  { name: 'human-capital-frontend', port: 3006, bff: 'http://localhost:4002' }
];

services.forEach(svc => {
  const dir = path.join(__dirname, svc.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  
  // package.json
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: svc.name,
    version: "1.0.0",
    main: "index.js",
    scripts: { start: "node index.js" },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      pg: "^8.11.3",
      axios: "^1.6.2"
    }
  }, null, 2));

  // Dockerfile
  fs.writeFileSync(path.join(dir, 'Dockerfile'), `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=${svc.port}
EXPOSE ${svc.port}
CMD ["npm", "start"]
`);

  // index.js
  let indexContent = `const express = require('express');\nconst cors = require('cors');\n`;
  if (svc.db) {
    indexContent += `const { Pool } = require('pg');
const pool = new Pool({ host: 'db-${svc.name.split('-')[0]}', port: 5432, database: '${svc.db}', user: 'postgres', password: 'postgres' });
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/data', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    let table = '${svc.db === "ducky_scholar_db" ? "students" : "employees"}';
    const result = await pool.query(\`SELECT * FROM \${table} ORDER BY 1 LIMIT $1 OFFSET $2\`, [limit, offset]);
    const totalRes = await pool.query(\`SELECT COUNT(*) FROM \${table}\`);
    res.json({ items: result.rows, total: parseInt(totalRes.rows[0].count) });
  } catch(e) { res.status(500).json({error: e.message}); }
});

// Generic CRUD endpoints
app.post('/api/data', async (req, res) => { /* insert logic */ res.json({ok:true}); });
app.put('/api/data/:id', async (req, res) => { /* update logic */ res.json({ok:true}); });
app.delete('/api/data/:id', async (req, res) => { /* delete logic */ res.json({ok:true}); });

app.listen(${svc.port}, () => console.log('${svc.name} on ${svc.port}'));
`;
  } else if (svc.target) {
    indexContent += `const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', async (req, res) => {
  try {
    const url = \`http://${svc.target}/api\${req.url}\`;
    const response = await axios({ method: req.method, url, data: req.body });
    res.json(response.data);
  } catch(e) { res.status(500).json({error: e.message}); }
});
app.listen(${svc.port}, () => console.log('${svc.name} on ${svc.port}'));
`;
  } else if (svc.bff) {
    indexContent += `const path = require('path');
const app = express();
app.use(cors());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(${svc.port}, () => console.log('${svc.name} on ${svc.port}'));
`;
    // index.html for frontend
    fs.writeFileSync(path.join(dir, 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <title>${svc.name} Admin</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background: #007bff; color: white; }
    .btn { padding: 5px 10px; cursor: pointer; background: #28a745; color: white; border: none; border-radius: 3px; }
    .btn-delete { background: #dc3545; }
  </style>
</head>
<body>
  <h1>${svc.name} Portal</h1>
  <button class="btn" onclick="alert('Insert Modal Here')">+ Add Record</button>
  <table>
    <thead><tr><th>ID</th><th>Details</th><th>Actions</th></tr></thead>
    <tbody id="grid"></tbody>
  </table>
  <div style="margin-top:20px;">
    <button class="btn" onclick="loadPage(-1)">Prev</button>
    <span id="pageInfo">Page 1</span>
    <button class="btn" onclick="loadPage(1)">Next</button>
  </div>
  <script>
    let page = 1;
    async function loadData() {
      const res = await fetch('${svc.bff}/api/data?page=' + page);
      const data = await res.json();
      const grid = document.getElementById('grid');
      grid.innerHTML = '';
      if(data.items) {
        data.items.forEach(item => {
          const keys = Object.keys(item);
          const id = item[keys[0]];
          grid.innerHTML += \`<tr>
            <td>\${id}</td>
            <td>\${JSON.stringify(item)}</td>
            <td>
              <button class="btn" onclick="alert('Edit ' + \${id})">Edit</button>
              <button class="btn btn-delete" onclick="alert('Delete ' + \${id})">Delete</button>
            </td>
          </tr>\`;
        });
      }
      document.getElementById('pageInfo').innerText = 'Page ' + page + ' (Total: ' + data.total + ')';
    }
    function loadPage(delta) { page = Math.max(1, page + delta); loadData(); }
    loadData();
  </script>
</body>
</html>`);
  }
  
  fs.writeFileSync(path.join(dir, 'index.js'), indexContent);
});

// Append to docker-compose.yml
let composeAdd = `
  db-scholar:
    image: postgres:16
    environment:
      POSTGRES_DB: ducky_scholar_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./db/ducky_scholar_db/ducky_scholar_db.sql:/docker-entrypoint-initdb.d/01.sql
      - ./db/ducky_scholar_db/ducky_scholar_db_dummy_data.sql:/docker-entrypoint-initdb.d/02.sql
    ports:
      - "5435:5432"

  scholar-microservice:
    build: ./scholar-microservice
    depends_on: [db-scholar]
    ports: ["3003:3003"]

  scholar-bff-service:
    build: ./scholar-bff-service
    depends_on: [scholar-microservice]
    ports: ["4001:4001"]

  scholar-frontend:
    build: ./scholar-frontend
    depends_on: [scholar-bff-service]
    ports: ["3004:3004"]

  db-human-capital:
    image: postgres:16
    environment:
      POSTGRES_DB: ducky_human_capital_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - ./db/ducky_human_capital_db/ducky_human_capital_db.sql:/docker-entrypoint-initdb.d/01.sql
      - ./db/ducky_human_capital_db/ducky_human_capital_db_dummy_data.sql:/docker-entrypoint-initdb.d/02.sql
    ports:
      - "5436:5432"

  human-capital-microservice:
    build: ./human-capital-microservice
    depends_on: [db-human-capital]
    ports: ["3005:3005"]

  human-capital-bff-service:
    build: ./human-capital-bff-service
    depends_on: [human-capital-microservice]
    ports: ["4002:4002"]

  human-capital-frontend:
    build: ./human-capital-frontend
    depends_on: [human-capital-bff-service]
    ports: ["3006:3006"]
`;

fs.appendFileSync(path.join(__dirname, 'docker-compose.yml'), composeAdd);
console.log('Scaffold complete!');
