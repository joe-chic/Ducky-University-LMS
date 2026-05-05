import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Home from "./pages/Home";
import Usuarios from "./pages/Usuarios";
import MisPrestamos from "./pages/MisPrestamos";
import LibroDetalle from "./pages/LibroDetalle";
import Libros from "./pages/Libros";
import Devoluciones from "./pages/Devoluciones";
import Prestamos from "./pages/Prestamos";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/home" element={<Home />} />
        <Route path="/libros" element={<Libros />} />
        <Route path="/libros/:id" element={<LibroDetalle />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/mis-prestamos" element={<MisPrestamos />} />
        <Route path="/devoluciones" element={<Devoluciones />} />
        <Route path="/prestamos" element={<Prestamos />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;