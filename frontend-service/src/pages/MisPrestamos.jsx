import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Home.css";
import duckIcon from "../assets/icons/duckIcon.svg";
import { bffGet, getToken } from "../api/bff";

function MisPrestamos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";

  const [prestamos, setPrestamos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [multas, setMultas] = useState([]);
  const [loadingMultas, setLoadingMultas] = useState(false);

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  useEffect(() => {
    fetchPrestamos();
    fetchMultas();
  }, []);

  const fetchPrestamos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/loans", { token, params: { campus_id: campusId } });
      setPrestamos(Array.isArray(data) ? data : []);
    } catch (err) {
      setPrestamos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultas = async () => {
    setLoadingMultas(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/fines", { token, params: { campus_id: campusId } });
      setMultas(Array.isArray(data) ? data : []);
    } catch {
      setMultas([]);
    } finally {
      setLoadingMultas(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ducky_token");
    localStorage.removeItem("ducky_role");
    localStorage.removeItem("ducky_campus_id");
    localStorage.removeItem("ducky_nombre");
    navigate("/");
  };

  const activos = prestamos.filter(p => p.loan_state === "active" || p.loan_state === "overdue");
  const historial = prestamos.filter(p => p.loan_state === "completed");

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  const badgeColor = (state) => {
    if (state === "active") return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
    if (state === "overdue") return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
    return { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" };
  };

  const badgeLabel = (state) => {
    if (state === "active") return "Activo";
    if (state === "overdue") return "Vencido";
    return "Completado";
  };

  return (
    <div className="home-container">

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {sidebarOpen && (
          <div className="sidebar-menu">
            <div className={`sidebar-item ${location.pathname === '/home' ? 'active' : ''}`} onClick={() => navigate("/home")}>Inicio</div>
            {isAdmin && (
              <div className={`sidebar-item ${location.pathname.includes('/usuarios') ? 'active' : ''}`} onClick={() => navigate("/usuarios")}>Usuarios</div>
            )}
            <div className={`sidebar-item ${location.pathname.includes('/libros') ? 'active' : ''}`} onClick={() => navigate("/libros")}>Libros</div>
            {!isAdmin && (
              <>
                <div className={`sidebar-item ${location.pathname === '/mis-prestamos' ? 'active' : ''}`} onClick={() => navigate("/mis-prestamos")}>Mis Prestamos</div>
                <div className={`sidebar-item ${location.pathname === '/devoluciones' ? 'active' : ''}`} onClick={() => navigate("/devoluciones")}>Devoluciones</div>
                <div className={`sidebar-item ${location.pathname === '/soporte' ? 'active' : ''}`} onClick={() => navigate("/soporte")}>Soporte</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="main-content">

        {/* Navbar */}
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
            <span style={{ cursor: "pointer" }} onClick={() => alert("Próximamente")}>Notificaciones 🔔</span>
            <div style={{ position: "relative", cursor: "pointer", display: "inline-block" }} onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}>
              <span>Usuario 👤</span>
              {menuUsuarioAbierto && (
                <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "#fff", color: "#333", padding: "10px", borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10, minWidth: "120px" }}>
                  <button onClick={handleLogout} style={{ border: "none", background: "none", cursor: "pointer", color: "red", padding: "5px", width: "100%", textAlign: "left" }}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Contenido */}
        <div style={{ padding: "30px 60px" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "24px", color: "#1a1a1a" }}>Mis Préstamos</h2>

          {msg && (
            <div style={{ padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", background: msg.type === "success" ? "#e8f5e9" : "#ffebee", color: msg.type === "success" ? "#2e7d32" : "#c62828", border: `1px solid ${msg.type === "success" ? "#a5d6a7" : "#ef9a9a"}`, fontWeight: 500 }}>
              {msg.text}
              <button onClick={() => setMsg(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
          )}

          {/* Préstamos activos */}
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>Préstamos activos</h3>

          {loading ? (
            <p style={{ color: "#666" }}>Cargando...</p>
          ) : activos.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee", marginBottom: "32px" }}>
              No tienes préstamos activos.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
              {activos.map(p => (
                <div key={p.loan_id} style={{ background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "4px" }}>{p.titulo}</p>
                    <p style={{ color: "#666", fontSize: "0.85rem" }}>Barcode: {p.barcode}</p>
                    <p style={{ color: "#666", fontSize: "0.85rem" }}>Prestado: {formatDate(p.initial_lent_at)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", ...badgeColor(p.loan_state) }}>
                    {badgeLabel(p.loan_state)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Historial */}
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>Historial</h3>

          {loading ? (
            <p style={{ color: "#666" }}>Cargando...</p>
          ) : historial.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee" }}>
              No hay historial de préstamos.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {historial.map(p => (
                <div key={p.loan_id} style={{ background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "4px", color: "#555" }}>{p.titulo}</p>
                    <p style={{ color: "#999", fontSize: "0.85rem" }}>Prestado: {formatDate(p.initial_lent_at)}</p>
                    <p style={{ color: "#999", fontSize: "0.85rem" }}>Devuelto: {formatDate(p.returned_at)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", ...badgeColor(p.loan_state) }}>
                    {badgeLabel(p.loan_state)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Multas pendientes */}
          <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px", marginTop: "32px", color: "#333" }}>Mis Multas</h3>

          {loadingMultas ? (
            <p style={{ color: "#666" }}>Cargando multas...</p>
          ) : multas.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee" }}>
              No tienes multas pendientes.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {multas.map(f => (
                <div key={f.find_id} style={{ background: f.fine_status === "unpaid" ? "#fff8f8" : "#f9f9f9", border: `1px solid ${f.fine_status === "unpaid" ? "#ef9a9a" : "#e0e0e0"}`, borderRadius: "8px", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "4px" }}>{f.reason_description}</p>
                    <p style={{ color: "#666", fontSize: "0.85rem" }}>Referencia: {f.source_transaction_id}</p>
                    <p style={{ color: "#666", fontSize: "0.85rem" }}>Fecha: {new Date(f.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <p style={{ fontWeight: "bold", fontSize: "1.1rem", color: f.fine_status === "unpaid" ? "#c62828" : "#2e7d32" }}>
                      ${Number(f.price).toFixed(2)} MXN
                    </p>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", background: f.fine_status === "unpaid" ? "#ffebee" : "#e8f5e9", color: f.fine_status === "unpaid" ? "#c62828" : "#2e7d32", border: `1px solid ${f.fine_status === "unpaid" ? "#ef9a9a" : "#a5d6a7"}` }}>
                      {f.fine_status === "unpaid" ? "Sin pagar" : "Pagada"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MisPrestamos;