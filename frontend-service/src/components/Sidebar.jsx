import { useLocation, useNavigate } from "react-router-dom";
import duckIconWhite from "../assets/icons/duckIconWhite.svg";

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = localStorage.getItem("ducky_role");
  const isAdmin = userRole === "Administrador";
  const isLib = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;

  const item = (label, path, exact = false) => {
    const active = exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
    return (
      <div
        className={`sidebar-item ${active ? "active" : ""}`}
        onClick={() => navigate(path)}
      >
        {label}
      </div>
    );
  };

  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {isOpen && (
        <>
          <div className="sidebar-logo">
            <img src={duckIconWhite} alt="Ducky" className="sidebar-duck-icon" />
            <div className="sidebar-logo-text">
              <span className="sidebar-ducky">Ducky</span>
              <span className="sidebar-university">University</span>
            </div>
            <button className="sidebar-arrow" onClick={onClose}>◀</button>
          </div>

          <div className="sidebar-menu">
            {item("Inicio", "/home", true)}
            {isAdmin && item("Usuarios", "/usuarios")}
            {item("Recursos", "/libros")}
            {hasManagementRole && item("Prestamos y multas", "/prestamos", true)}
            {!hasManagementRole && item("Mis Prestamos", "/mis-prestamos", true)}
            {!hasManagementRole && item("Devoluciones", "/devoluciones", true)}
            {!hasManagementRole && item("Soporte", "/soporte", true)}
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;