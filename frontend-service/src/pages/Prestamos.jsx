import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Prestamos.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPost, bffPut, getToken } from "../api/bff";

function Prestamos() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getToken();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tab, setTab] = useState("prestar");

  // Préstamo form
  const [barcode, setBarcode] = useState("");
  const [campusIdInput, setCampusIdInput] = useState("");
  const [loadingPrestar, setLoadingPrestar] = useState(false);
  const [msgPrestar, setMsgPrestar] = useState(null);

  // Lista préstamos
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("active");
  const [msgDevolver, setMsgDevolver] = useState(null);

  // Multas
  const [fines, setFines] = useState([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [msgMulta, setMsgMulta] = useState(null);
  const [modalMulta, setModalMulta] = useState(null);
  const [multaMonto, setMultaMonto] = useState("");
  const [dailyFine, setDailyFine] = useState(10);

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  useEffect(() => {
    bffGet("/api/daily-fine", { token }).then(d => setDailyFine(d.daily_fine)).catch(() => {});
  }, [token]);

  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true);
    try {
      const params = {};
      if (filterState) params.state = filterState;
      const data = await bffGet("/api/loans", { token, params });
      setLoans(Array.isArray(data) ? data : []);
    } catch {
      setLoans([]);
    } finally {
      setLoadingLoans(false);
    }
  }, [token, filterState]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const fetchFines = useCallback(async () => {
    setLoadingFines(true);
    try {
      const data = await bffGet("/api/fines", { token });
      setFines(Array.isArray(data) ? data : []);
    } catch {
      setFines([]);
    } finally {
      setLoadingFines(false);
    }
  }, [token]);

  useEffect(() => {
    if (tab === "multas") fetchFines();
  }, [tab, fetchFines]);

  async function handlePrestar() {
    if (!barcode.trim() || !campusIdInput) {
      setMsgPrestar({ type: "error", text: "Ingresa el barcode y el ID del usuario." });
      return;
    }
    setLoadingPrestar(true);
    setMsgPrestar(null);
    try {
      const res = await bffPost("/api/loans", { barcode: barcode.trim(), campus_id: Number(campusIdInput) }, { token });
      setMsgPrestar({ type: "success", text: `Préstamo creado correctamente (ID: ${res.loan_id})` });
      setBarcode("");
      setCampusIdInput("");
      fetchLoans();
    } catch (err) {
      setMsgPrestar({ type: "error", text: err.message || "Error al crear el préstamo." });
    } finally {
      setLoadingPrestar(false);
    }
  }

  async function handleDevolver(loanId) {
    if (!window.confirm("¿Confirmas la devolución de este préstamo?")) return;
    setMsgDevolver(null);
    try {
      await bffPut(`/api/loans/${loanId}/return`, {}, { token });
      setMsgDevolver({ type: "success", text: `Devolución registrada (Préstamo #${loanId})` });
      fetchLoans();
    } catch (err) {
      setMsgDevolver({ type: "error", text: err.message || "Error al registrar la devolución." });
    }
  }

  function abrirModalMulta(loan) {
    const dias = loan.initial_lent_at
      ? Math.max(1, Math.floor((Date.now() - new Date(loan.initial_lent_at)) / (1000 * 60 * 60 * 24)))
      : 1;
    setMultaMonto(String(dias * dailyFine));
    setModalMulta({ loan_id: loan.loan_id, campus_id: loan.campus_id, days: dias });
  }

  async function handleConfirmarMulta() {
    if (!modalMulta) return;
    try {
      const res = await bffPost("/api/fines", {
        loan_id: modalMulta.loan_id,
        campus_id: modalMulta.campus_id,
        days_overdue: modalMulta.days,
        custom_price: Number(multaMonto),
        offender_type: "student",
        reason_code_id: 1,
      }, { token });
      setMsgMulta({ type: "success", text: `Multa aplicada (ID: ${res.find_id}, Monto: $${res.price} MXN)` });
      setModalMulta(null);
      fetchLoans();
    } catch (err) {
      setMsgMulta({ type: "error", text: err.message || "Error al aplicar la multa." });
      setModalMulta(null);
    }
  }

  async function handlePagarMulta(fineId) {
    if (!window.confirm("¿Marcar esta multa como pagada?")) return;
    try {
      await bffPost(`/api/fines/${fineId}/pay`, { payment_method_id: 1 }, { token });
      setMsgMulta({ type: "success", text: "Multa marcada como pagada." });
      fetchFines();
    } catch (err) {
      setMsgMulta({ type: "error", text: err.message || "Error al procesar el pago." });
    }
  }

  const filtered = loans.filter(l =>
    !search ||
    l.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    String(l.loan_id).includes(search) ||
    l.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  function badgeClass(state) {
    if (state === "active") return "badge badge-active";
    if (state === "overdue") return "badge badge-overdue";
    return "badge badge-completed";
  }

  function stateLabel(state) {
    if (state === "active") return "Activo";
    if (state === "overdue") return "Vencido";
    return "Completado";
  }

  function fineStatusLabel(s) {
    if (s === "unpaid") return "Sin pagar";
    if (s === "paid") return "Pagada";
    if (s === "waived") return "Perdonada";
    return s;
  }

  function fineStatusStyle(s) {
    if (s === "unpaid") return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
    if (s === "paid") return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
    return { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" };
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Contenido */}
        <div className="prestamos-container">
          <div className="prestamos-header">
            <h1>Préstamos y Devoluciones</h1>
            <div className="tabs">
              <button className={`tab-btn ${tab === "prestar" ? "active" : ""}`} onClick={() => setTab("prestar")}>Nuevo Préstamo</button>
              <button className={`tab-btn ${tab === "devolver" ? "active" : ""}`} onClick={() => setTab("devolver")}>Devoluciones</button>
              <button className={`tab-btn ${tab === "multas" ? "active" : ""}`} onClick={() => setTab("multas")}>Multas</button>
            </div>
          </div>

          {/* TAB: PRESTAR */}
          {tab === "prestar" && (
            <>
              <div className="prestamo-form-card">
                <h2>Registrar nuevo préstamo</h2>
                {msgPrestar && (
                  <div className={`alert ${msgPrestar.type === "success" ? "alert-success" : "alert-error"}`}>
                    {msgPrestar.text}
                  </div>
                )}
                <div className="form-group">
                  <label>Código de barras del ejemplar</label>
                  <input type="text" placeholder="Ej: PHY-5001" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePrestar()} />
                </div>
                <div className="form-group">
                  <label>ID del usuario (campus_id)</label>
                  <input type="number" placeholder="Ej: 2001" value={campusIdInput} onChange={e => setCampusIdInput(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={handlePrestar} disabled={loadingPrestar}>
                  {loadingPrestar ? "Procesando..." : "Registrar Préstamo"}
                </button>
              </div>

              <div className="loans-table-card">
                <h2>Préstamos activos</h2>
                <input className="search-bar" placeholder="Buscar por título, ID o barcode..." value={search} onChange={e => setSearch(e.target.value)} />
                {loadingLoans ? (
                  <div className="loading">Cargando...</div>
                ) : filtered.length === 0 ? (
                  <div className="empty-state">No hay préstamos activos.</div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>#</th><th>Título</th><th>Barcode</th><th>Fecha préstamo</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {filtered.map(l => (
                        <tr key={l.loan_id}>
                          <td>{l.loan_id}</td>
                          <td>{l.titulo}</td>
                          <td><code>{l.barcode}</code></td>
                          <td>{formatDate(l.initial_lent_at)}</td>
                          <td><span className={badgeClass(l.loan_state)}>{stateLabel(l.loan_state)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* TAB: DEVOLVER */}
          {tab === "devolver" && (
            <div className="loans-table-card">
              <h2>Registrar devolución</h2>
              {msgDevolver && (
                <div className={`alert ${msgDevolver.type === "success" ? "alert-success" : "alert-error"}`}>
                  {msgDevolver.text}
                </div>
              )}
              {msgMulta && (
                <div className={`alert ${msgMulta.type === "success" ? "alert-success" : "alert-error"}`}>
                  {msgMulta.text}
                  <button onClick={() => setMsgMulta(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                <input className="search-bar" style={{ marginBottom: 0, flex: 1, minWidth: 200 }} placeholder="Buscar por título, ID o barcode..." value={search} onChange={e => setSearch(e.target.value)} />
                <select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ padding: "10px 14px", border: "1.5px solid #dde1e9", borderRadius: 8, fontSize: "0.95rem", background: "#fafafa" }}>
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="overdue">Vencidos</option>
                  <option value="completed">Completados</option>
                </select>
              </div>
              {loadingLoans ? (
                <div className="loading">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">No hay préstamos que coincidan.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>#</th><th>Título</th><th>Barcode</th><th>Fecha préstamo</th><th>Devolución</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <tr key={l.loan_id}>
                        <td>{l.loan_id}</td>
                        <td>{l.titulo}</td>
                        <td><code>{l.barcode}</code></td>
                        <td>{formatDate(l.initial_lent_at)}</td>
                        <td>{formatDate(l.returned_at)}</td>
                        <td><span className={badgeClass(l.loan_state)}>{stateLabel(l.loan_state)}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            {l.loan_state !== "completed" && (
                              <button className="btn-return" onClick={() => handleDevolver(l.loan_id)}>Devolver</button>
                            )}
                            {l.loan_state !== "completed" && (
                              <button onClick={() => abrirModalMulta(l)} style={{ padding: "6px 14px", background: "#c62828", color: "white", border: "none", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}>
                                Multar
                              </button>
                            )}
                            {l.loan_state === "completed" && (
                              <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: MULTAS */}
          {tab === "multas" && (
            <div className="loans-table-card">
              <h2>Multas registradas</h2>
              {msgMulta && (
                <div className={`alert ${msgMulta.type === "success" ? "alert-success" : "alert-error"}`}>
                  {msgMulta.text}
                  <button onClick={() => setMsgMulta(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
              )}
              <p style={{ marginBottom: 16, color: "#666", fontSize: "0.9rem" }}>
                Monto base por día de retraso: <strong>${dailyFine} MXN</strong>
              </p>
              {loadingFines ? (
                <div className="loading">Cargando multas...</div>
              ) : fines.length === 0 ? (
                <div className="empty-state">No hay multas registradas.</div>
              ) : (
                <table>
                  <thead>
                    <tr><th>#</th><th>Usuario ID</th><th>Monto</th><th>Motivo</th><th>Préstamo</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f.find_id}>
                        <td>{f.find_id}</td>
                        <td>{f.offender_id}</td>
                        <td><strong>${Number(f.price).toFixed(2)}</strong></td>
                        <td>{f.reason_description}</td>
                        <td>{f.source_transaction_id}</td>
                        <td>
                          <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: "700", ...fineStatusStyle(f.fine_status) }}>
                            {fineStatusLabel(f.fine_status)}
                          </span>
                        </td>
                        <td>{formatDate(f.created_at)}</td>
                        <td>
                          {f.fine_status === "unpaid" ? (
                            <button onClick={() => handlePagarMulta(f.find_id)} style={{ padding: "5px 12px", background: "#FFD400", color: "#1a1a1a", border: "1px solid #e0c000", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem" }}>
                              Marcar pagada
                            </button>
                          ) : (
                            <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Modal Multa */}
        {modalMulta && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
            <div style={{ background: "white", borderRadius: "12px", padding: "32px", width: "100%", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              <h2 style={{ marginBottom: "8px", fontSize: "1.2rem", fontWeight: "bold" }}>Aplicar Multa</h2>
              <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "20px" }}>
                Préstamo #{modalMulta.loan_id} — {modalMulta.days} día(s) activo.<br />
                Monto calculado: <strong>${modalMulta.days * dailyFine} MXN</strong>
              </p>
              <div className="form-group">
                <label>Monto final (MXN)</label>
                <input type="number" value={multaMonto} onChange={e => setMultaMonto(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #dde1e9", borderRadius: "8px", fontSize: "1rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => setModalMulta(null)} style={{ flex: 1, padding: "11px", background: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleConfirmarMulta} style={{ flex: 1, padding: "11px", background: "#c62828", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
                  Confirmar Multa
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Prestamos;