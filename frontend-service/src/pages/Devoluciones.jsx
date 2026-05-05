import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import duckIcon from "../assets/icons/duckIcon.svg";
import Sidebar from "../components/Sidebar";
import { bffGet, bffPut, getToken } from "../api/bff";

function Devoluciones() {
  const navigate = useNavigate();
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  useEffect(() => {
    fetchPrestamos();
  }, []);

  const fetchPrestamos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/loans", { token, params: { campus_id: campusId, state: "active" } });
      setPrestamos(Array.isArray(data) ? data : []);
    } catch {
      setPrestamos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDevolver = async (loanId) => {
    if (!window.confirm("¿Confirmas la devolución de este libro?")) return;
    try {
      const token = getToken();
      await bffPut(`/api/loans/${loanId}/return`, {}, { token });
      setMsg({ type: "success", text: "Devolución registrada correctamente." });
      fetchPrestamos();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al registrar la devolución." });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ducky_token");
    localStorage.removeItem("ducky_role");
    localStorage.removeItem("ducky_campus_id");
    localStorage.removeItem("ducky_nombre");
    navigate("/");
  };

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <nav className="navbar">
          <div className="navbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="navbar-logo">
              <img src={duckIcon} alt="Ducky" className="navbar-duck-icon" />
              <div className="navbar-logo-text">
                <span className="navbar-ducky">Ducky</span>
                <span className="navbar-university">University</span>
              </div>
            </div>
          </div>
          <div className="navbar-right">
            <span style={{ cursor: "pointer" }} onClick={() => alert("Próximamente")}>Soporte</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Próximamente")}>Notificaciones</span>
            <div style={{ position: "relative", cursor: "pointer", display: "inline-block" }} onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}>
              <span>Usuario</span>
              {menuUsuarioAbierto && (
                <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "#fff", color: "#333", padding: "10px", borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10, minWidth: "120px" }}>
                  <button onClick={handleLogout} style={{ border: "none", background: "none", cursor: "pointer", color: "red", padding: "5px", width: "100%", textAlign: "left" }}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div style={{ padding: "30px 48px" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "8px", color: "#1a1a1a" }}>Devoluciones</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>Aquí puedes ver tus préstamos activos. Acércate a biblioteca para realizar la devolución.</p>

          {msg && (
            <div style={{ padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", background: msg.type === "success" ? "#e8f5e9" : "#ffebee", color: msg.type === "success" ? "#2e7d32" : "#c62828", border: `1px solid ${msg.type === "success" ? "#a5d6a7" : "#ef9a9a"}`, fontWeight: 500 }}>
              {msg.text}
              <button onClick={() => setMsg(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
          )}

          {loading ? (
            <p style={{ color: "#666" }}>Cargando...</p>
          ) : prestamos.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee" }}>
              No tienes préstamos activos para devolver.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {prestamos.map(p => (
                <div key={p.loan_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "3px" }}>{p.titulo}</p>
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Barcode: {p.barcode}</p>
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Prestado el: {formatDate(p.initial_lent_at)}</p>
                  </div>
                  <button
                    onClick={() => handleDevolver(p.loan_id)}
                    style={{ padding: "8px 20px", background: "#FFD400", color: "#1a1a1a", border: "1px solid #e0c000", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}
                  >
                    Devolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Devoluciones;