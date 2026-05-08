import { useSidebar } from "../hooks/useSidebar";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import "./Home.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, getToken } from "../api/bff";

function MisPrestamos() {
  const navigate = useNavigate();
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);

  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const [prestamos, setPrestamos] = useState([]);
  const [multas, setMultas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMultas, setLoadingMultas] = useState(false);

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  const fetchPrestamos = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/all-loans", { token, params: { campus_id: campusId } });
      setPrestamos(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setPrestamos([]);
    } finally {
      setLoading(false);
    }
  }, [campusId]);

  const fetchMultas = useCallback(async () => {
    setLoadingMultas(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/fines", { token, params: { campus_id: campusId } });
      setMultas(Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
    } catch {
      setMultas([]);
    } finally {
      setLoadingMultas(false);
    }
  }, [campusId]);

  useEffect(() => {
    fetchPrestamos();
    fetchMultas();
  }, [fetchPrestamos, fetchMultas]);

  const activos = prestamos.filter(p => p.state === "active" || p.state === "overdue");
  const historial = prestamos.filter(p => p.state === "completed");

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function badgeStyle(state) {
    if (state === "active") return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
    if (state === "overdue") return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
    return { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" };
  }

  function badgeLabel(state) {
    if (state === "active") return "Activo";
    if (state === "overdue") return "Vencido";
    return "Completado";
  }

  function drawTicketHeader(doc, title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Ducky University LMS", 14, 18);
    doc.setFontSize(12);
    doc.text(title, 14, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Campus ID: ${campusId}`, 14, 33);
    doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, 14, 39);
  }

  function saveLoanTicketPDF(loan, ticketKind) {
    const doc = new jsPDF();
    const isDigital = loan.loan_type === "digital";
    drawTicketHeader(doc, ticketKind === "devolucion" ? "Ticket de Devolucion" : "Ticket de Prestamo");

    let y = 52;
    const lines = [
      `Folio de prestamo: #${loan.loan_id}`,
      `Tipo de recurso: ${isDigital ? "Digital" : "Fisico"}`,
      `Titulo: ${loan.titulo || "N/D"}`,
      `Estado: ${badgeLabel(loan.state)}`,
      `Fecha de prestamo: ${formatDate(loan.initial_lent_at)}`,
      `Fecha de devolucion: ${formatDate(loan.returned_at)}`,
      `Barcode: ${loan.barcode || "N/A"}`,
      `Revista: ${loan.journal_title || "N/A"}`,
      `ISSN: ${loan.journal_issn || "N/A"}`,
    ];
    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });

    doc.setFontSize(9);
    doc.text("Este ticket contiene la informacion critica para validacion de prestamo/devolucion.", 14, y + 6);
    const suffix = ticketKind === "devolucion" ? "devolucion" : "prestamo";
    doc.save(`ticket-${suffix}-${loan.loan_id}.pdf`);
  }

  function saveFineTicketPDF(fine) {
    const doc = new jsPDF();
    drawTicketHeader(doc, "Ticket de Multa");

    let y = 52;
    const lines = [
      `Folio de multa: #${fine.find_id}`,
      `Concepto: ${fine.reason_description || fine.reason_type || `Multa #${fine.find_id}`}`,
      `Estado: ${fine.fine_status === "unpaid" ? "Sin pagar" : "Pagada"}`,
      `Monto total: $${Number(fine.price || 0).toFixed(2)} MXN`,
      `Monto pendiente: $${Number(fine.amount_due ?? fine.price ?? 0).toFixed(2)} MXN`,
      `Referencia: ${fine.source_transaction_id || "N/A"}`,
      `Fecha: ${formatDate(fine.created_at)}`,
    ];
    lines.forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });

    doc.setFontSize(9);
    doc.text("Comparte este ticket con biblioteca/tesoreria para seguimiento de la sancion.", 14, y + 6);
    doc.save(`ticket-multa-${fine.find_id}.pdf`);
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div style={{ padding: "30px 48px" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", marginBottom: "24px", color: "#1a1a1a" }}>Mis Préstamos</h2>

          {/* Préstamos activos */}
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "14px", color: "#333" }}>Préstamos activos</h3>
          {loading ? (
            <p style={{ color: "#666", marginBottom: "32px" }}>Cargando...</p>
          ) : activos.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee", marginBottom: "32px" }}>
              No tienes préstamos activos.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
              {activos.map(p => (
                <div key={p.loan_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "3px" }}>
                      {p.titulo} {p.loan_type === "digital" && " (Digital)"}
                    </p>
                    {p.loan_type === "physical" && <p style={{ color: "#666", fontSize: "0.82rem" }}>Barcode: {p.barcode}</p>}
                    {p.journal_title && <p style={{ color: "#7b1fa2", fontSize: "0.82rem" }}>Revista: {p.journal_title}</p>}
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Prestado el: {formatDate(p.initial_lent_at)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "bold", ...badgeStyle(p.state) }}>
                    {badgeLabel(p.state)}
                  </span>
                  <button
                    onClick={() => saveLoanTicketPDF(p, "prestamo")}
                    style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #1976d2", color: "#1976d2", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}
                  >
                    Descargar ticket PDF
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Historial */}
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "14px", color: "#333" }}>Historial</h3>
          {loading ? (
            <p style={{ color: "#666", marginBottom: "32px" }}>Cargando...</p>
          ) : historial.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee", marginBottom: "32px" }}>
              No hay historial de préstamos.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
              {historial.map(p => (
                <div key={p.loan_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "3px", color: "#555" }}>{p.titulo}</p>
                    <p style={{ color: "#999", fontSize: "0.82rem" }}>Prestado: {formatDate(p.initial_lent_at)}</p>
                    <p style={{ color: "#999", fontSize: "0.82rem" }}>Devuelto: {formatDate(p.returned_at)}</p>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "bold", ...badgeStyle(p.state) }}>
                    {badgeLabel(p.state)}
                  </span>
                  <button
                    onClick={() => saveLoanTicketPDF(p, "devolucion")}
                    style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #455a64", color: "#455a64", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}
                  >
                    Descargar ticket PDF
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Multas */}
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", marginBottom: "14px", color: "#333" }}>Mis Multas</h3>
          {loadingMultas ? (
            <p style={{ color: "#666" }}>Cargando multas...</p>
          ) : multas.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee" }}>
              No tienes multas pendientes.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {multas.map(f => (
                <div key={f.find_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: f.fine_status === "unpaid" ? "#fff8f8" : "#fafafa", border: `1px solid ${f.fine_status === "unpaid" ? "#ef9a9a" : "#e0e0e0"}`, borderRadius: "8px", padding: "16px 20px", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "3px" }}>
                      {f.reason_description || f.reason_type || `Multa #${f.find_id}`}
                    </p>
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Referencia: {f.source_transaction_id}</p>
                    <p style={{ color: "#666", fontSize: "0.82rem" }}>Fecha: {formatDate(f.created_at)}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <p style={{ fontWeight: "bold", fontSize: "1.05rem", color: f.fine_status === "unpaid" ? "#c62828" : "#2e7d32" }}>
                      ${Number(f.price).toFixed(2)} MXN
                    </p>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "bold", background: f.fine_status === "unpaid" ? "#ffebee" : "#e8f5e9", color: f.fine_status === "unpaid" ? "#c62828" : "#2e7d32", border: `1px solid ${f.fine_status === "unpaid" ? "#ef9a9a" : "#a5d6a7"}` }}>
                      {f.fine_status === "unpaid" ? "Sin pagar" : "Pagada"}
                    </span>
                    <button
                      onClick={() => saveFineTicketPDF(f)}
                      style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid #6a1b9a", color: "#6a1b9a", background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem" }}
                    >
                      Descargar ticket PDF
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

export default MisPrestamos;