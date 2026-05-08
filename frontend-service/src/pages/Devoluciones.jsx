import { useSidebar } from "../hooks/useSidebar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, getToken } from "../api/bff";

function Devoluciones() {
  const navigate = useNavigate();
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);

  const [sidebarOpen, setSidebarOpen] = useSidebar();
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
      const data = await bffGet("/api/all-loans", { token, params: { campus_id: campusId, state: "completed" } });
      setPrestamos(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setPrestamos([]);
    } finally {
      setLoading(false);
    }
  };

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div style={{ padding: "30px 48px" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "8px", color: "#1a1a1a" }}>Historial de Devoluciones</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>Aquí puedes ver el registro de todos los préstamos que ya has devuelto (tanto físicos como digitales).</p>

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
              No tienes historial de devoluciones.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {prestamos.map(p => (
                <div key={p.loan_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "3px" }}>
                      {p.titulo} {p.loan_type === "digital" && <span style={{ color: "#0277bd", fontSize: "0.8rem", marginLeft: "4px" }}>(Digital)</span>}
                    </p>
                    {p.loan_type === "physical" && <p style={{ color: "#666", fontSize: "0.82rem" }}>Barcode: {p.barcode}</p>}
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Prestado el: {formatDate(p.initial_lent_at)}</p>
                    <p style={{ color: "#2e7d32", fontSize: "0.82rem", fontWeight: 600 }}>Devuelto el: {formatDate(p.returned_at)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "bold", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" }}>
                    Completado
                  </span>
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