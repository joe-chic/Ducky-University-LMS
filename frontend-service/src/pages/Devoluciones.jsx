import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPut, getToken } from "../api/bff";

function Devoluciones() {
  const navigate = useNavigate();
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);

  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

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