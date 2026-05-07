const fs = require('fs');
const files = [
  'src/pages/Home.jsx',
  'src/pages/LibroDetalle.jsx',
  'src/pages/Libros.jsx',
  'src/pages/Devoluciones.jsx',
  'src/pages/MisPrestamos.jsx',
  'src/pages/Usuarios.jsx'
];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { useSidebar }')) {
    content = 'import { useSidebar } from "../hooks/useSidebar";\n' + content;
    fs.writeFileSync(file, content);
  }
}
console.log("Imports added");
