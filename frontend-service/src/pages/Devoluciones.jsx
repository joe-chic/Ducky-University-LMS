import { useSidebar } from "../hooks/useSidebar";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPut, getToken } from "../api/bff";

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

  const fetchPrestamos = useCallback(async () => {
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
  }, [campusId]);

  useEffect(() => {
    fetchPrestamos();
  }, [fetchPrestamos]);

  const handleDevolver = async (loanId) => {
    if (!window.confirm("¿Confirmas la devolución de este libro?")) return;
    try {
      const token = getToken();
      const data = await bffPut(`/api/loans/${loanId}/return`, {}, { token });
      const text = [data?.message || "Devolución exitosa", data?.notice || ""].filter(Boolean).join(" ");
      setMsg({ type: "success", text });
      if (data?.receipt) {
        const r = data.receipt;
        const popup = window.open("", "_blank", "width=700,height=800");
        if (popup) {
          popup.document.write(`
            <html><head><title>Comprobante de devolución</title></head>
            <body style="font-family:Arial,sans-serif;padding:24px">
              <h2>Comprobante de devolución</h2>
              <p><strong>Préstamo:</strong> ${r.loan_id || "—"}</p>
              <p><strong>Fecha devolución:</strong> ${r.returned_at ? new Date(r.returned_at).toLocaleString("es-MX") : "—"}</p>
              <p><strong>Matrícula/Código:</strong> ${r.campus_id || "—"}</p>
              <p><strong>Código de barras:</strong> ${r.barcode || "—"}</p>
              <p><strong>Título:</strong> ${r.titulo || "—"}</p>
              <p><strong>Alumno:</strong> ${r.offender_name || "—"}</p>
              <p><strong>Email:</strong> ${r.offender_email || "—"}</p>
            </body></html>
          `);
          popup.document.close();
          popup.focus();
          popup.print();
        }
      }
      fetchPrestamos();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al registrar la devolución." });
    }
  };

  const handleDevolverDanado = async (loanId) => {
    const confirmed = window.confirm("¿Confirmas la devolución en mal estado de este ejemplar?");
    if (!confirmed) return;
    const damageNotes = window.prompt("Describe el daño detectado (opcional):", "") || "";
    try {
      const token = getToken();
      const data = await bffPut(
        `/api/loans/${loanId}/return`,
        { return_condition: "damaged", damage_notes: damageNotes },
        { token }
      );
      const text = [data?.message || "Devolución exitosa", data?.notice || "Multa generada por devolución en mal estado."].filter(Boolean).join(" ");
      setMsg({ type: "success", text });
      fetchPrestamos();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al registrar devolución en mal estado." });
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
          <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "8px", color: "#1a1a1a" }}>Devoluciones</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>Aquí puedes ver tus préstamos activos y registrar su devolución.</p>

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
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleDevolver(p.loan_id)}
                      style={{ padding: "8px 20px", background: "#FFD400", color: "#1a1a1a", border: "1px solid #e0c000", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      Devolver
                    </button>
                    <button
                      onClick={() => handleDevolverDanado(p.loan_id)}
                      style={{ padding: "8px 20px", background: "#ffe9e8", color: "#c62828", border: "1px solid #ef9a9a", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      Devolver (Mal estado)
                    </button>
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

export default Devoluciones;