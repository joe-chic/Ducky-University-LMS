import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "../hooks/useSidebar";
import { useNavigate } from "react-router-dom";
import "./Prestamos.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPost, bffPut, getToken } from "../api/bff";

function Prestamos() {
  const navigate = useNavigate();
  const token = getToken();

  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const [tab, setTab] = useState("prestar");

  // Préstamo form
  const [barcode, setBarcode] = useState("");
  const [campusIdInput, setCampusIdInput] = useState("");
  const [loadingPrestar, setLoadingPrestar] = useState(false);
  const [msgPrestar, setMsgPrestar] = useState(null);

  // Combined loans list
  const [loans, setLoans]           = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [search, setSearch]         = useState("");
  const [filterState, setFilterState] = useState("active");
  const [filterType, setFilterType]   = useState("all");   // all | physical | digital
  const [msgDevolver, setMsgDevolver] = useState(null);
  const [currentPagePrestar, setCurrentPagePrestar] = useState(1);

  // Multas
  const [fines, setFines]           = useState([]);
  const [loadingFines, setLoadingFines] = useState(false);
  const [msgMulta, setMsgMulta]     = useState(null);
  const [modalMulta, setModalMulta] = useState(null);
  const [multaMonto, setMultaMonto] = useState("");
  const [dailyFine, setDailyFine]   = useState(10);

  useEffect(() => { if (!token) navigate("/"); }, [token, navigate]);
  useEffect(() => {
    bffGet("/api/daily-fine", { token }).then(d => setDailyFine(d.daily_fine)).catch(() => {});
  }, [token]);

  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true);
    try {
      const params = {};
      if (filterState && filterState !== "all") params.state = filterState;
      if (filterType  && filterType  !== "all") params.loan_type = filterType;
      const data = await bffGet("/api/all-loans", { token, params });
      setLoans(Array.isArray(data?.items) ? data.items : []);
    } catch { setLoans([]); }
    finally  { setLoadingLoans(false); }
  }, [token, filterState, filterType]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  const fetchFines = useCallback(async () => {
    setLoadingFines(true);
    try {
      const data = await bffGet("/api/fines", { token });
      setFines(Array.isArray(data) ? data : []);
    } catch { setFines([]); }
    finally  { setLoadingFines(false); }
  }, [token]);

  useEffect(() => { if (tab === "multas") fetchFines(); }, [tab, fetchFines]);

  async function handlePrestar() {
    if (!barcode.trim() || !campusIdInput) {
      setMsgPrestar({ type: "error", text: "Ingresa el barcode y el ID del usuario." });
      return;
    }
    setLoadingPrestar(true); setMsgPrestar(null);
    try {
      const res = await bffPost("/api/loans", { barcode: barcode.trim(), campus_id: Number(campusIdInput) }, { token });
      setMsgPrestar({ type: "success", text: `Préstamo creado correctamente (ID: ${res.loan_id})` });
      setBarcode(""); setCampusIdInput("");
      fetchLoans();
    } catch (err) { setMsgPrestar({ type: "error", text: err.message || "Error al crear el préstamo." }); }
    finally       { setLoadingPrestar(false); }
  }

  async function handleDevolver(loan) {
    if (loan.loan_type === "digital") {
      if (!window.confirm(`¿Liberar acceso digital del préstamo #${loan.loan_id}?`)) return;
      setMsgDevolver(null);
      try {
        await bffPut(`/api/digital-loans/${loan.loan_id}/return`, {}, { token });
        setMsgDevolver({ type: "success", text: `Acceso digital liberado (#${loan.loan_id})` });
        fetchLoans();
      } catch (err) { setMsgDevolver({ type: "error", text: err.message }); }
    } else {
      if (!window.confirm("¿Confirmas la devolución de este préstamo físico?")) return;
      setMsgDevolver(null);
      try {
        await bffPut(`/api/loans/${loan.loan_id}/return`, {}, { token });
        setMsgDevolver({ type: "success", text: `Devolución registrada (Préstamo #${loan.loan_id})` });
        fetchLoans();
      } catch (err) { setMsgDevolver({ type: "error", text: err.message || "Error al registrar la devolución." }); }
    }
  }

  async function handleRenovar(loan) {
    if (loan.loan_type === "digital") {
      if (!window.confirm(`¿Renovar acceso digital #${loan.loan_id}?`)) return;
      try {
        const res = await bffPut(`/api/digital-loans/${loan.loan_id}/renew`, {}, { token });
        setMsgDevolver({ type: "success", text: `Acceso digital renovado (renovación #${res.renewals_used ?? ""}).` });
        fetchLoans();
      } catch (err) { setMsgDevolver({ type: "error", text: err.message }); }
    } else {
      if (!window.confirm(`¿Renovar préstamo físico #${loan.loan_id}? Esto reiniciará su estado a activo.`)) return;
      setMsgDevolver(null);
      try {
        const res = await bffPost(`/api/loans/${loan.loan_id}/renew`, {}, { token });
        setMsgDevolver({ type: "success", text: `Préstamo #${loan.loan_id} renovado (renovación #${res.renewal_count}).` });
        fetchLoans();
      } catch (err) { setMsgDevolver({ type: "error", text: err.message || "Error al renovar el préstamo." }); }
    }
  }

  function abrirModalMulta(loan) {
    if (loan.loan_type === "digital") return; // no fines for digital
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
    } catch (err) { setMsgMulta({ type: "error", text: err.message || "Error al procesar el pago." }); }
  }

  const filtered = loans.filter(l =>
    !search ||
    l.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    String(l.loan_id).includes(search) ||
    l.barcode?.toLowerCase().includes(search.toLowerCase()) ||
    l.journal_title?.toLowerCase().includes(search.toLowerCase())
  );

  function stateBadge(state, loanType) {
    const isDigital = loanType === "digital";
    if (state === "active")    return { label: "Activo",     bg: "#2e7d32", color: "#fff" };
    if (state === "overdue")   return { label: "Vencido",    bg: "#c62828", color: "#fff" };
    if (state === "completed") return { label: "Completado", bg: "#546e7a", color: "#fff" };
    return { label: state, bg: "#aaa", color: "#fff" };
  }

  function typeBadge(loanType, tipo) {
    if (loanType === "digital") {
      if (tipo === "e_book")          return { label: "📗 E-Book",   bg: "#1565c0", color: "#fff" };
      if (tipo === "digital_article") return { label: "📰 Artículo", bg: "#4a148c", color: "#fff" };
      return { label: "🌐 Digital", bg: "#1565c0", color: "#fff" };
    }
    return { label: "📚 Físico", bg: "#e65100", color: "#fff" };
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function fineStatusLabel(s) {
    if (s === "unpaid") return "Sin pagar";
    if (s === "paid")   return "Pagada";
    if (s === "waived") return "Perdonada";
    return s;
  }

  function fineStatusStyle(s) {
    if (s === "unpaid") return { background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" };
    if (s === "paid")   return { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" };
    return { background: "#f5f5f5", color: "#616161", border: "1px solid #e0e0e0" };
  }

  const isActive = l => l.state === "active" || l.state === "overdue";

  // Filters bar
  const renderFiltersBar = (hideStateFilter) => (
    <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
      <input
        className="search-bar"
        style={{ marginBottom: 0, flex: 1, minWidth: 200 }}
        placeholder="Buscar por título, ID, barcode, revista…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {!hideStateFilter && (
        <select value={filterState} onChange={e => setFilterState(e.target.value)}
          style={{ padding: "10px 14px", border: "1.5px solid #dde1e9", borderRadius: 8, fontSize: "0.95rem", background: "#fafafa" }}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="overdue">Vencidos</option>
          <option value="completed">Completados</option>
        </select>
      )}
      <select value={filterType} onChange={e => setFilterType(e.target.value)}
        style={{ padding: "10px 14px", border: "1.5px solid #dde1e9", borderRadius: 8, fontSize: "0.95rem", background: "#fafafa" }}>
        <option value="all">Todos los tipos</option>
        <option value="physical">Solo físicos</option>
        <option value="digital">Solo digitales</option>
      </select>
    </div>
  );

  const Pill = ({ label, bg, color }) => (
    <span style={{ background: bg, color, borderRadius: "20px", padding: "2px 9px", fontSize: "0.73rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );

  return (
    <div className="home-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="prestamos-container">
          <div className="prestamos-header">
            <h1>Préstamos y Multas</h1>
            <div className="tabs">
              <button className={`tab-btn ${tab === "prestar"  ? "active" : ""}`} onClick={() => setTab("prestar")}>Nuevo Préstamo</button>
              <button className={`tab-btn ${tab === "devolver" ? "active" : ""}`} onClick={() => setTab("devolver")}>Préstamos</button>
              <button className={`tab-btn ${tab === "multas"   ? "active" : ""}`} onClick={() => setTab("multas")}>Multas</button>
            </div>
          </div>

          {/* TAB: PRESTAR */}
          {tab === "prestar" && (
            <>
              <div className="prestamo-form-card">
                <h2>Registrar nuevo préstamo físico</h2>
                {msgPrestar && (
                  <div className={`alert ${msgPrestar.type === "success" ? "alert-success" : "alert-error"}`}>
                    {msgPrestar.text}
                  </div>
                )}
                <div className="form-group">
                  <label>Código de barras del ejemplar</label>
                  <input type="text" placeholder="Ej: PHY-5001" value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePrestar()} />
                </div>
                <div className="form-group">
                  <label>ID del usuario (campus_id)</label>
                  <input type="number" placeholder="Ej: 2001" value={campusIdInput}
                    onChange={e => setCampusIdInput(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={handlePrestar} disabled={loadingPrestar}>
                  {loadingPrestar ? "Procesando..." : "Registrar Préstamo"}
                </button>
                <p style={{ marginTop: 12, color: "#888", fontSize: "0.85rem" }}>
                  💡 Para recursos digitales, el acceso se registra automáticamente cuando el usuario pulsa "Descargar Recurso" desde el catálogo.
                </p>
              </div>

              {/* Quick active-loans summary */}
              <div className="loans-table-card">
                <h2>Todos los préstamos activos</h2>
                {msgDevolver && (
                  <div className={`alert ${msgDevolver.type === "success" ? "alert-success" : "alert-error"}`}>
                    {msgDevolver.text}
                    <button onClick={() => setMsgDevolver(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                  </div>
                )}
                {renderFiltersBar(true)}
                {loadingLoans ? <div className="loading">Cargando…</div> : filtered.length === 0 ? (
                  <div className="empty-state">No hay préstamos que coincidan.</div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th><th>Tipo</th><th>Título</th><th>Usuario</th><th>Fecha</th><th>Estado</th><th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice((currentPagePrestar - 1) * 20, currentPagePrestar * 20).map(l => {
                          const sb = stateBadge(l.state, l.loan_type);
                          const tb = typeBadge(l.loan_type, l.tipo);
                          return (
                            <tr key={`${l.loan_type}-${l.loan_id}`}>
                              <td>{l.loan_id}</td>
                              <td><Pill {...tb} /></td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{l.titulo}</div>
                                {l.journal_title && <div style={{ fontSize: "0.75rem", color: "#888" }}>{l.journal_title} {l.journal_issn ? `· ISSN ${l.journal_issn}` : ""}</div>}
                                {l.barcode && <code style={{ fontSize: "0.75rem", color: "#666" }}>{l.barcode}</code>}
                              </td>
                              <td>{l.campus_id}</td>
                              <td>{formatDate(l.initial_lent_at)}</td>
                              <td><Pill {...sb} /></td>
                              <td>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {isActive(l) && (
                                    <button className="btn-return" onClick={() => handleDevolver(l)}>
                                      {l.loan_type === "digital" ? "Liberar" : "Devolver"}
                                    </button>
                                  )}
                                  {isActive(l) && (
                                    <button onClick={() => handleRenovar(l)}
                                      style={{ padding: "6px 12px", background: "#1565c0", color: "white", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                                      Renovar
                                    </button>
                                  )}
                                  {!isActive(l) && <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filtered.length > 20 && (
                      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "15px" }}>
                        <button 
                          disabled={currentPagePrestar === 1}
                          onClick={() => setCurrentPagePrestar(p => p - 1)}
                          style={{ padding: "5px 12px", border: "1px solid #ccc", borderRadius: "5px", cursor: currentPagePrestar === 1 ? "not-allowed" : "pointer" }}
                        >Anterior</button>
                        <span style={{ padding: "5px" }}>Página {currentPagePrestar} de {Math.ceil(filtered.length / 20)}</span>
                        <button 
                          disabled={currentPagePrestar === Math.ceil(filtered.length / 20)}
                          onClick={() => setCurrentPagePrestar(p => p + 1)}
                          style={{ padding: "5px 12px", border: "1px solid #ccc", borderRadius: "5px", cursor: currentPagePrestar === Math.ceil(filtered.length / 20) ? "not-allowed" : "pointer" }}
                        >Siguiente</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* TAB: PRÉSTAMOS ACTIVOS / DEVOLUCIONES */}
          {tab === "devolver" && (
            <div className="loans-table-card">
              <h2>Gestión de préstamos</h2>
              {msgDevolver && (
                <div className={`alert ${msgDevolver.type === "success" ? "alert-success" : "alert-error"}`}>
                  {msgDevolver.text}
                  <button onClick={() => setMsgDevolver(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
              )}
              {msgMulta && (
                <div className={`alert ${msgMulta.type === "success" ? "alert-success" : "alert-error"}`}>
                  {msgMulta.text}
                  <button onClick={() => setMsgMulta(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
              )}
              {renderFiltersBar(false)}
              {loadingLoans ? <div className="loading">Cargando…</div> : filtered.length === 0 ? (
                <div className="empty-state">No hay préstamos que coincidan.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Tipo</th><th>Título / Detalle</th><th>Usuario</th>
                      <th>Fecha préstamo</th><th>Devolución</th><th>Estado</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => {
                      const sb = stateBadge(l.state, l.loan_type);
                      const tb = typeBadge(l.loan_type, l.tipo);
                      return (
                        <tr key={`${l.loan_type}-${l.loan_id}`}>
                          <td>{l.loan_id}</td>
                          <td><Pill {...tb} /></td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{l.titulo}</div>
                            {l.journal_title && (
                              <div style={{ fontSize: "0.75rem", color: "#7b1fa2" }}>
                                📰 {l.journal_title} {l.journal_issn ? `· ISSN ${l.journal_issn}` : ""}
                              </div>
                            )}
                            {l.barcode && <code style={{ fontSize: "0.75rem", color: "#666" }}>{l.barcode}</code>}
                            {l.loan_type === "digital" && l.renewal_count != null && (
                              <div style={{ fontSize: "0.72rem", color: "#888" }}>Renovaciones: {l.renewal_count}</div>
                            )}
                          </td>
                          <td>{l.campus_id}</td>
                          <td>{formatDate(l.initial_lent_at)}</td>
                          <td>{l.returned_at ? formatDate(l.returned_at) : "—"}</td>
                          <td><Pill {...sb} /></td>
                          <td>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {isActive(l) && (
                                <button className="btn-return" onClick={() => handleDevolver(l)}>
                                  {l.loan_type === "digital" ? "Liberar" : "Devolver"}
                                </button>
                              )}
                              {isActive(l) && (
                                <button onClick={() => handleRenovar(l)}
                                  style={{ padding: "6px 12px", background: "#1565c0", color: "white", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                                  Renovar
                                </button>
                              )}
                              {isActive(l) && l.loan_type === "physical" && (
                                <button onClick={() => abrirModalMulta(l)}
                                  style={{ padding: "6px 12px", background: "#c62828", color: "white", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                                  Multar
                                </button>
                              )}
                              {!isActive(l) && <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                Monto base por día: <strong>${dailyFine} MXN</strong> · Los recursos digitales no generan multas por vencimiento.
              </p>
              {loadingFines ? <div className="loading">Cargando multas…</div> : fines.length === 0 ? (
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
                          <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700, ...fineStatusStyle(f.fine_status) }}>
                            {fineStatusLabel(f.fine_status)}
                          </span>
                        </td>
                        <td>{formatDate(f.created_at)}</td>
                        <td>
                          {f.fine_status === "unpaid" ? (
                            <button onClick={() => handlePagarMulta(f.find_id)}
                              style={{ padding: "5px 12px", background: "#FFD400", color: "#1a1a1a", border: "1px solid #e0c000", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}>
                              Marcar pagada
                            </button>
                          ) : <span style={{ color: "#aaa", fontSize: "0.8rem" }}>—</span>}
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
                <input type="number" value={multaMonto} onChange={e => setMultaMonto(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #dde1e9", borderRadius: "8px", fontSize: "1rem", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => setModalMulta(null)}
                  style={{ flex: 1, padding: "11px", background: "#f5f5f5", color: "#333", border: "1px solid #ddd", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleConfirmarMulta}
                  style={{ flex: 1, padding: "11px", background: "#c62828", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
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