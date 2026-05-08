import { useSidebar } from "../hooks/useSidebar";
import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Home.css";
import "./LibroDetalle.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPut, bffPost, getToken } from "../api/bff";

// ── EjemplarRow ───────────────────────────────────────────────────────────────
// Renders one physical example row. Management users get an expandable panel
// with full damage/lost detail and an inline editor.
function EjemplarRow({ ej, badgeColor, badgeLabel, healthColor, hasManagementRole, token }) {
  const [open,        setOpen]        = useState(false);
  const [detail,      setDetail]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [form,        setForm]        = useState({});
  const [saving,      setSaving]      = useState(false);
  const [rowMsg,      setRowMsg]      = useState(null);

  const DAMAGE_TYPES = [
    "torn pages","foxing","cockling","dog-eared","staining/decoloration",
    "broken/loose spine","damaged cover","crushed corner","hinge damaged",
    "mold","pest damage","light damage","annotations/markings","improper repair","shelf wear",
  ];
  const SEVERITIES   = ["low","medium","high"];
  const HEALTH_STATES = ["good","damaged","incomplete","lost"];

  async function toggleDetail() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (detail) return;
    setLoading(true);
    try {
      const d = await bffGet(`/api/examples/${ej.barcode}/damage-details`, { token });
      setDetail(d);
      setForm({
        health_state:    d.example_health_state,
        damage_type:     d.damage_type     || "",
        severity_level:  d.severity_level  || "",
        librarian_notes: (d.example_health_state === "lost" ? d.lost_notes : d.damage_notes) || "",
      });
    } catch { setRowMsg("Error al cargar detalles."); }
    finally   { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setRowMsg(null);
    try {
      const updated = await bffPut(`/api/examples/${ej.barcode}/damage-details`, form, { token });
      setDetail(updated);
      setEditMode(false);
      setRowMsg("✓ Guardado correctamente.");
    } catch (err) { setRowMsg(err.message || "Error al guardar."); }
    finally      { setSaving(false); }
  }

  const cellStyle  = { padding: "8px 12px", color: "#555" };
  const monoStyle  = { padding: "8px 12px", fontFamily: "monospace", fontSize: "0.85rem", color: "#333" };

  return (
    <>
      <tr style={{ borderBottom: open ? "none" : "1px solid #eee" }}>
        <td style={monoStyle}>{ej.barcode}</td>
        <td style={cellStyle}>{ej.example_location_code}</td>
        {hasManagementRole && (
          <td style={{ ...cellStyle, textTransform: "capitalize", color: healthColor, fontWeight: 600 }}>
            {ej.example_health_state}
          </td>
        )}
        <td style={cellStyle}>
          <span style={{ background: badgeColor, color: "#fff", borderRadius: "12px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600 }}>
            {badgeLabel}
          </span>
        </td>
        {hasManagementRole && (
          <td style={cellStyle}>
            <button
              onClick={toggleDetail}
              style={{ padding: "4px 10px", fontSize: "0.78rem", border: "1px solid #bbb", borderRadius: "5px", cursor: "pointer", background: open ? "#e8eaf6" : "#f5f5f5" }}
            >
              {open ? "▲ Cerrar" : "▼ Ver Detalle"}
            </button>
          </td>
        )}
      </tr>

      {/* Expandable damage detail panel */}
      {hasManagementRole && open && (
        <tr>
          <td colSpan={5} style={{ padding: "0 12px 16px 12px", background: "#fafbff", borderBottom: "2px solid #e3e8f0" }}>
            {loading && <p style={{ color: "#888", fontSize: "0.85rem" }}>Cargando…</p>}
            {rowMsg  && <p style={{ color: rowMsg.startsWith("✓") ? "#2e7d32" : "#c62828", fontSize: "0.82rem", margin: "6px 0" }}>{rowMsg}</p>}
            {detail && !loading && (
              <div style={{ paddingTop: "10px" }}>
                {/* Info cards */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {[
                    ["Estado físico",   detail.example_health_state  || "—"],
                    ["Tipo de daño",    detail.damage_type            || "—"],
                    ["Severidad",       detail.severity_level         || "—"],
                    ["Notas de daño",   detail.damage_notes           || "—"],
                    ["Notas de pérd.",  detail.lost_notes             || "—"],
                    ["Prestado a",      detail.borrower_id            ? `campus_id: ${detail.borrower_id}` : "—"],
                    ["Renovaciones",    detail.renewal_count != null  ? `${detail.renewal_count}` : "—"],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: "#f0f4ff", borderRadius: "7px", padding: "7px 12px", minWidth: "110px", border: "1px solid #dde3f5" }}>
                      <div style={{ fontSize: "0.68rem", color: "#888" }}>{label}</div>
                      <div style={{ fontWeight: 600, fontSize: "0.83rem", textTransform: "capitalize" }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Edit toggle */}
                <button
                  onClick={() => setEditMode(v => !v)}
                  style={{ padding: "5px 12px", fontSize: "0.8rem", border: "1px solid #8fa8e0", borderRadius: "5px", cursor: "pointer", background: "#e8eaf6", marginBottom: "8px" }}
                >
                  {editMode ? "Cancelar" : "✏️ Editar"}
                </button>

                {editMode && (
                  <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", background: "#f0f4ff", borderRadius: "8px", padding: "12px" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Estado físico
                      <select style={{ display: "block", width: "100%", marginTop: "3px", padding: "5px 7px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.82rem" }}
                        value={form.health_state} onChange={e => {
                          const val = e.target.value;
                          setForm(f => {
                            if (val === "lost" || val === "good") {
                              return { ...f, health_state: val, damage_type: "", severity_level: "" };
                            } else {
                              return { ...f, health_state: val, damage_type: f.damage_type || DAMAGE_TYPES[0], severity_level: f.severity_level || SEVERITIES[0] };
                            }
                          });
                        }}>
                        {HEALTH_STATES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Tipo de daño
                      <select style={{ display: "block", width: "100%", marginTop: "3px", padding: "5px 7px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.82rem" }}
                        disabled={form.health_state === "lost" || form.health_state === "good"}
                        value={form.damage_type} onChange={e => setForm(f => ({ ...f, damage_type: e.target.value }))}>
                        {(form.health_state === "lost" || form.health_state === "good") && <option value="">— Ninguno —</option>}
                        {DAMAGE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Severidad
                      <select style={{ display: "block", width: "100%", marginTop: "3px", padding: "5px 7px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.82rem" }}
                        disabled={form.health_state === "lost" || form.health_state === "good"}
                        value={form.severity_level} onChange={e => setForm(f => ({ ...f, severity_level: e.target.value }))}>
                        {(form.health_state === "lost" || form.health_state === "good") && <option value="">— Ninguna —</option>}
                        {SEVERITIES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                    <label style={{ gridColumn: "1/-1", fontSize: "0.8rem", fontWeight: 600 }}>Notas del bibliotecario
                      <textarea rows={2} style={{ display: "block", width: "100%", marginTop: "3px", padding: "5px 7px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.82rem", resize: "vertical", boxSizing: "border-box" }}
                        value={form.librarian_notes} onChange={e => setForm(f => ({ ...f, librarian_notes: e.target.value }))} />
                    </label>
                    <div style={{ gridColumn: "1/-1" }}>
                      <button type="submit" disabled={saving}
                        style={{ padding: "6px 16px", background: "#3f51b5", color: "#fff", border: "none", borderRadius: "5px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>
                        {saving ? "Guardando…" : "Guardar Cambios"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function LibroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";
  const isLib   = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  // Only actual students/employees (non-management) can request loans online
  const isAlumno = !hasManagementRole;

  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const [libro, setLibro] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [loadingPrestamo, setLoadingPrestamo] = useState(false);
  const [receiptData, setReceiptData] = useState(null); // loan receipt modal
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [metadata, setMetadata] = useState({ authors: [], publishers: [], categories: [], languages: [] });

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const token = getToken();
        const data = await bffGet("/api/library-metadata", { token });
        if (data) setMetadata(data);
      } catch (e) { console.error(e); }
    }
    loadMetadata();
  }, []);

  useEffect(() => {
    if (id) fetchLibro();
  }, [id]);

  const fetchLibro = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const libroData = await bffGet(`/api/resources/${id}`, { token });
      setLibro(libroData);
      try {
        const ejemplaresData = await bffGet(`/api/resources/${id}/examples`, { token });
        setEjemplares(Array.isArray(ejemplaresData) ? ejemplaresData : []);
      } catch {
        setEjemplares([]);
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "No se pudo cargar la información del libro." });
      setLibro(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarRecurso = async () => {
    if (!recursoEditando?.titulo || !recursoEditando?.tipo) {
      alert("Por favor indique el Título y Tipo del recurso.");
      return;
    }
    try {
      const token = getToken();
      await bffPut(`/api/resources/${id}`, recursoEditando, { token });
      setModalEditarAbierto(false);
      setMsg({ type: "success", text: "Recurso actualizado correctamente." });
      fetchLibro();
    } catch {
      alert("Error al guardar el recurso");
    }
  };

  const toggleGenero = (cid, checked) => {
    const g = new Set(recursoEditando.generos_ids || []);
    if (checked) g.add(cid); else g.delete(cid);
    setRecursoEditando({ ...recursoEditando, generos_ids: Array.from(g) });
  };

  const toggleLenguaje = (lid, checked) => {
    const l = new Set(recursoEditando.lenguajes_ids || []);
    if (checked) l.add(lid); else l.delete(lid);
    setRecursoEditando({ ...recursoEditando, lenguajes_ids: Array.from(l) });
  };

  const handleSolicitarPrestamo = async () => {
    if (!campusId) {
      setMsg({ type: "error", text: "No se encontró tu ID de campus. Vuelve a iniciar sesión." });
      return;
    }
    const available = ejemplares.find(e => e.example_op_state === "available");
    if (!available) {
      setMsg({ type: "error", text: "No hay ejemplares disponibles en este momento." });
      return;
    }
    setLoadingPrestamo(true);
    setMsg(null);
    try {
      const token = getToken();
      const res = await bffPost("/api/loans", { barcode: available.barcode, campus_id: campusId }, { token });
      // Store full receipt for the modal
      setReceiptData(res.boleta || {
        loan_id:        res.loan_id,
        titulo:         libro?.titulo,
        barcode:        available.barcode,
        initial_lent_at: new Date(),
        due_date:       null,
        instrucciones:  "Devólvelo en biblioteca en un máximo de 5 días hábiles.",
      });
      fetchLibro();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al solicitar el préstamo." });
    } finally {
      setLoadingPrestamo(false);
    }
  };

  const handleToggleEstado = async () => {
    if (!libro) return;
    const accion = libro.disponible ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que deseas ${accion} este libro?`)) return;
    try {
      const token = getToken();
      await bffPut(`/api/resources/${id}`, { ...libro, disponible: !libro.disponible }, { token });
      setLibro(prev => ({ ...prev, disponible: !prev.disponible }));
      setMsg({ type: "success", text: `Libro ${accion === "deshabilitar" ? "deshabilitado" : "habilitado"} correctamente.` });
    } catch {
      setMsg({ type: "error", text: "Error al cambiar el estado del libro." });
    }
  };

  const disponibles = ejemplares.filter(e => e.example_op_state === "available").length;
  const enPrestamo  = ejemplares.filter(e => e.example_op_state === "on loan").length;

  // Only specific digital resources can be downloaded and have digital metadata.
  const isDigitalDownloadable = libro => ["e_book", "digital_article"].includes(libro?.tipo);
  const isDigitalCollection = libro => ["e_journal", "e_magazine"].includes(libro?.tipo);
  const isDigital = libro => isDigitalDownloadable(libro) || isDigitalCollection(libro);
  const isPeriodical = libro => ["e_journal", "e_magazine", "journal_magazine"].includes(libro?.tipo);

  // ── Digital metadata state & fetch ──────────────────────────────────────────
  const [digitalMeta,   setDigitalMeta]   = useState(null);
  const [digitalStatus, setDigitalStatus] = useState(null);
  const [editingDM,     setEditingDM]     = useState(false);
  const [dmForm,        setDmForm]        = useState({});
  const [loadingDescarga, setLoadingDescarga] = useState(false);
  const [activeLoanId,  setActiveLoanId]  = useState(null);
  const [metaLoaded,    setMetaLoaded]    = useState(false);

  useEffect(() => {
    if (!libro || !isDigitalDownloadable(libro)) return;
    const token = getToken();
    Promise.all([
      bffGet(`/api/resources/${id}/digital-metadata`, { token }).catch(() => null),
      bffGet(`/api/resources/${id}/digital-status`,   { token }).catch(() => null),
      bffGet(`/api/digital-loans`, { token, params: { campus_id: campusId, resource_id: id, state: "active" } }).catch(() => null),
    ]).then(([meta, status, loans]) => {
      setDigitalMeta(meta);
      setDigitalStatus(status);
      if (loans?.items?.length) setActiveLoanId(loans.items[0].digital_loan_id);
      if (meta) setDmForm({ ...meta });
      setMetaLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libro, id, campusId]);

  // ── Periodical metadata state & fetch ───────────────────────────────────────
  const [periodicalMeta,     setPeriodicalMeta]     = useState(null);
  const [editingPM,          setEditingPM]          = useState(false);
  const [pmForm,             setPmForm]             = useState({});
  const [periodicalArticles, setPeriodicalArticles] = useState([]);
  const [articlesPage,       setArticlesPage]       = useState(1);

  useEffect(() => {
    if (!libro || !isPeriodical(libro)) return;
    const token = getToken();
    Promise.all([
      bffGet(`/api/resources/${id}/periodical-metadata`, { token }).catch(() => null),
      bffGet(`/api/resources/${id}/articles`, { token }).catch(() => [])
    ]).then(([meta, arts]) => {
      setPeriodicalMeta(meta);
      if (meta) setPmForm({ ...meta });
      setPeriodicalArticles(Array.isArray(arts) ? arts : []);
    });
  }, [libro, id]);

  const handleDescarga = async () => {
    if (!campusId) { setMsg({ type: "error", text: "No se encontró tu ID de campus. Vuelve a iniciar sesión." }); return; }
    setLoadingDescarga(true); setMsg(null);
    try {
      const token = getToken();
      const res = await bffPost("/api/digital-loans", { resource_id: Number(id), campus_id: campusId }, { token });
      setActiveLoanId(res.digital_loan_id);
      // Refresh status
      const status = await bffGet(`/api/resources/${id}/digital-status`, { token }).catch(() => null);
      setDigitalStatus(status);
      // Open the resource
      if (digitalMeta?.digital_url_link) window.open(digitalMeta.digital_url_link, "_blank", "noopener,noreferrer");
      setMsg({ type: "success", text: res.reused ? "📖 Ya tienes acceso activo — abriendo recurso." : "✓ Acceso registrado. Abriendo recurso digital." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al acceder al recurso." });
    } finally { setLoadingDescarga(false); }
  };

  const handleDevolverDigital = async () => {
    if (!activeLoanId) return;
    if (!window.confirm("¿Liberar tu acceso a este recurso digital?")) return;
    try {
      const token = getToken();
      await bffPut(`/api/digital-loans/${activeLoanId}/return`, {}, { token });
      setActiveLoanId(null);
      const status = await bffGet(`/api/resources/${id}/digital-status`, { token }).catch(() => null);
      setDigitalStatus(status);
      setMsg({ type: "success", text: "Acceso liberado correctamente." });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
  };

  const handleSaveDM = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const updated = await bffPut(`/api/resources/${id}/digital-metadata`, dmForm, { token });
      setDigitalMeta(updated);
      setEditingDM(false);
      setMsg({ type: "success", text: "Metadatos digitales actualizados." });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
  };

  const handleSavePM = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      const updated = await bffPut(`/api/resources/${id}/periodical-metadata`, pmForm, { token });
      setPeriodicalMeta(updated);
      setEditingPM(false);
      setMsg({ type: "success", text: "Metadatos de publicación actualizados." });
    } catch (err) { setMsg({ type: "error", text: err.message }); }
  };

  const handleToggleArticleState = async (articleId, isCurrentlyAvailable) => {
    if (!window.confirm(`¿Seguro que deseas ${isCurrentlyAvailable ? "deshabilitar" : "habilitar"} este artículo?`)) return;
    try {
      const token = getToken();
      await bffPut(`/api/resources/${articleId}/toggle-state`, { disponible: !isCurrentlyAvailable }, { token });
      setPeriodicalArticles(prev => prev.map(a => 
        a.resource_id === articleId ? { ...a, disponible: !isCurrentlyAvailable } : a
      ));
      setMsg({ type: "success", text: "Estado del artículo actualizado." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Error al cambiar estado del artículo" });
    }
  };

  let isAvailable = libro?.disponible;
  if (libro && isDigitalDownloadable(libro)) {
    // If metadata is loaded and there is no URL, then it is not available.
    if (metaLoaded && (!digitalMeta || !digitalMeta.digital_url_link)) {
      isAvailable = false;
    }
  }

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Contenido */}
        <div className="libro-detalle-container">

          <div className="libro-breadcrumb">
            <span onClick={() => navigate(-1)} style={{ cursor: "pointer", color: "#b8860b" }}>Volver</span>
            <span> › </span>
            <span>{libro?.titulo || "Detalle"}</span>
          </div>

          <button className="libro-back-btn" onClick={() => navigate(-1)}>←</button>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#666" }}>Cargando...</div>
          ) : !libro ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#999" }}>No se encontró el libro.</div>
          ) : (
            <div className="libro-detalle-card">

              {msg && (
                <div style={{ padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", background: msg.type === "success" ? "#e8f5e9" : "#ffebee", color: msg.type === "success" ? "#2e7d32" : "#c62828", border: `1px solid ${msg.type === "success" ? "#a5d6a7" : "#ef9a9a"}`, fontWeight: 500 }}>
                  {msg.text}
                  <button onClick={() => setMsg(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
                </div>
              )}

              <div className="libro-detalle-top">
                <div className="libro-portada">
                  {libro.portada ? (
                    <img src={libro.portada} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  ) : (
                    <div className="libro-portada-placeholder">
                      <span>{libro.tipo?.replace(/_/g, " ")}</span>
                    </div>
                  )}
                </div>

                <div className="libro-info-principal">
                  <h1 className="libro-titulo">{libro.titulo}</h1>
                  <p className="libro-autor">Autor: {libro.autor || "Desconocido"}</p>

                  <div className="libro-tags">
                    {libro.genero && libro.genero.split(", ").map((g, i) => (
                      <span key={i} className="libro-tag">{g}</span>
                    ))}
                    {libro.lenguajes && libro.lenguajes.split(", ").map((l, i) => (
                      <span key={i} className="libro-tag">{l}</span>
                    ))}
                  </div>

                  <hr className="libro-divider" />

                  <div className="libro-datos-grid">
                    <div className="libro-dato">
                      <span className="libro-dato-label">Tipo</span>
                      <span className="libro-dato-valor" style={{ textTransform: "capitalize" }}>{libro.tipo?.replace(/_/g, " ")}</span>
                    </div>
                    {!isPeriodical(libro) && libro.tipo !== "digital_article" && (
                      <div className="libro-dato">
                        <span className="libro-dato-label">ISBN</span>
                        <span className="libro-dato-valor">{libro.isbn || "N/A"}</span>
                      </div>
                    )}
                    <div className="libro-dato">
                      <span className="libro-dato-label">Editorial</span>
                      <span className="libro-dato-valor">{libro.editorial || "N/A"}</span>
                    </div>
                    <div className="libro-dato">
                      <span className="libro-dato-label">Año</span>
                      <span className="libro-dato-valor">{libro.ano_publicacion || "N/A"}</span>
                    </div>
                    {libro.tipo !== "digital_article" && libro.tipo !== "e_journal" && (
                      <div className="libro-dato">
                        <span className="libro-dato-label">Edición</span>
                        <span className="libro-dato-valor">{libro.edicion ? `${libro.edicion}ra edición` : "N/A"}</span>
                      </div>
                    )}
                    <div className="libro-dato">
                      <span className="libro-dato-label">Estado</span>
                      <span className="libro-dato-valor" style={{ color: isAvailable ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                        {isAvailable ? "Disponible" : "No disponible"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {libro.sinopsis && (
                <div className="libro-sinopsis">
                  <h3>Sinopsis</h3>
                  <p>{libro.sinopsis}</p>
                </div>
              )}

              <hr className="libro-divider" />

              {/* ── PHYSICAL EXAMPLES (physical resources only) ── */}
              {!isDigital(libro) && (
                <div className="libro-ubicacion">
                  <h3>Ejemplares Físicos</h3>
                  {ejemplares.length === 0 ? (
                    <p style={{ color: "#999" }}>No hay ejemplares físicos registrados para este recurso.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem" }}>
                        <thead>
                          <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #e0e0e0" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Código de Barras</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Ubicación</th>
                            {hasManagementRole && <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Estado Físico</th>}
                            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Disponibilidad</th>
                            {hasManagementRole && <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Detalle</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {ejemplares.map((ej, i) => {
                            const opState = ej.example_op_state;
                            const badgeColor = opState === "available" ? "#2E8B57" : opState === "on loan" ? "#b71c1c" : "#795548";
                            const badgeLabel = opState === "available" ? "Disponible" : opState === "on loan" ? "En Préstamo" : opState === "reserved" ? "Reservado" : opState === "internal consultation only" ? "Consulta Interna" : "En Tránsito";
                            const healthColor = ej.example_health_state === "good" ? "#2e7d32" : ej.example_health_state === "damaged" ? "#e65100" : ej.example_health_state === "lost" ? "#b71c1c" : "#666";
                            return (
                              <EjemplarRow
                                key={ej.barcode || i}
                                ej={ej}
                                badgeColor={badgeColor}
                                badgeLabel={badgeLabel}
                                healthColor={healthColor}
                                hasManagementRole={hasManagementRole}
                                token={getToken()}
                                bffGet={bffGet}
                                bffPut={bffPut}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Digital Metadata section - ONLY for downloadable digital resources */}
              {isDigitalDownloadable(libro) && (
                <div className="libro-ubicacion">
                  <h3>Acceso Digital</h3>
                  {digitalMeta ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: "10px", marginBottom: "14px" }}>
                      {[["📄 Formato",    digitalMeta.digital_file_format?.toUpperCase()],
                        ["💾 Tamaño",      `${(digitalMeta.digital_file_size / 1024).toFixed(1)} MB`],
                        ["📃 Licencia",   digitalMeta.digital_license_model],
                        ["👥 Concurrentes", `${digitalStatus?.active_concurrent ?? "—"} / ${digitalMeta.digital_max_concurrent_users ?? "∞"}`],
                        ["🔄 Renovaciones", `Máx. ${digitalStatus?.max_renewals ?? 3}`],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "#f8f9fa", borderRadius: "8px", padding: "10px 12px", border: "1px solid #e0e0e0" }}>
                          <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: "2px" }}>{label}</div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: "#aaa" }}>Cargando metadatos…</p>}

                  {/* Journal info banner — only for digital_article */}
                  {libro.tipo === "digital_article" && libro.journal_id && (
                    <div style={{ background: "linear-gradient(135deg,#f3e5f5,#e8eaf6)", border: "1px solid #ce93d8", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#7b1fa2", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "4px" }}>📰 REVISTA / JOURNAL</div>
                      <a
                        href={`/libros/${libro.journal_id}`}
                        onClick={e => { e.preventDefault(); navigate(`/libros/${libro.journal_id}`); }}
                        style={{ fontWeight: 700, fontSize: "1rem", color: "#4a148c", textDecoration: "none", borderBottom: "2px solid #ce93d8" }}
                      >
                        {libro.journal_title}
                      </a>
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px", fontSize: "0.82rem", color: "#555" }}>
                        {libro.journal_issn && (
                          <span style={{ background: "#fff", border: "1px solid #ce93d8", borderRadius: "5px", padding: "2px 8px" }}>
                            ISSN: <strong>{libro.journal_issn}</strong>
                          </span>
                        )}
                        {libro.journal_frequency && (
                          <span style={{ textTransform: "capitalize" }}>🗓 {libro.journal_frequency}</span>
                        )}
                        {libro.journal_peer_reviewed && (
                          <span style={{ background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", borderRadius: "5px", padding: "2px 8px", fontWeight: 700 }}>
                            ✔ Peer-reviewed
                          </span>
                        )}
                        {libro.article_volume && <span>Vol. {libro.article_volume}</span>}
                        {libro.article_issue  && <span>No. {libro.article_issue}</span>}
                        {libro.article_year   && <span>({libro.article_year})</span>}
                      </div>
                    </div>
                  )}

                  {/* Admin/Lib: digital metadata editor */}
                  {hasManagementRole && (
                    <div style={{ marginTop: "12px" }}>
                      <button className="libro-btn-editar" onClick={() => setEditingDM(v => !v)} style={{ marginBottom: "8px" }}>
                        {editingDM ? "Cancelar edición" : "✏️ Editar Metadatos Digitales"}
                      </button>
                      {editingDM && (
                        <form onSubmit={handleSaveDM} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f0f4ff", borderRadius: "10px", padding: "16px" }}>
                          <label style={{ gridColumn: "1/-1", fontWeight: 600, fontSize: "0.85rem" }}>URL de Descarga
                            <input style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc", fontSize:"0.85rem" }}
                              value={dmForm.digital_url_link || ""} onChange={e => setDmForm(f => ({ ...f, digital_url_link: e.target.value }))} />
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Formato
                            <select style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={dmForm.digital_file_format || ""} onChange={e => setDmForm(f => ({ ...f, digital_file_format: e.target.value }))}>
                              {["pdf","epub","daisy"].map(v => <option key={v} value={v}>{v.toUpperCase()}</option>)}
                            </select>
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Tamaño (KB)
                            <input type="number" style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={dmForm.digital_file_size || ""} onChange={e => setDmForm(f => ({ ...f, digital_file_size: Number(e.target.value) }))} />
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Modelo de Licencia
                            <select style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={dmForm.digital_license_model || ""} onChange={e => setDmForm(f => ({ ...f, digital_license_model: e.target.value }))}>
                              {["concurrent","unlimited","metered","oc-ou"].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Máx. Usuarios Concurrentes
                            <input type="number" style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={dmForm.digital_max_concurrent_users || ""} onChange={e => setDmForm(f => ({ ...f, digital_max_concurrent_users: Number(e.target.value) }))} />
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Máx. Usuarios Totales
                            <input type="number" style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={dmForm.digital_total_users_allows || ""} onChange={e => setDmForm(f => ({ ...f, digital_total_users_allows: Number(e.target.value) }))} />
                          </label>
                          <div style={{ gridColumn: "1/-1" }}>
                            <button type="submit" className="libro-btn-prestamo" style={{ marginRight:"8px" }}>Guardar Cambios</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── PERIODICAL METADATA PANEL (periodicals only) ── */}
              {isPeriodical(libro) && (
                <div className="libro-ubicacion" style={{ marginTop: "24px" }}>
                  <h3>Detalles de Publicación Periódica</h3>
                  {periodicalMeta ? (
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
                      {[
                        ["🪪 ISSN", periodicalMeta.periodical_issn || "—"],
                        ["🗓 Frecuencia", periodicalMeta.periodical_frequency],
                        ["✅ Peer Reviewed", periodicalMeta.peer_reviewed ? "Sí" : "No"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "#f8f9fa", borderRadius: "8px", padding: "10px 12px", border: "1px solid #e0e0e0" }}>
                          <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: "2px" }}>{label}</div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem", textTransform: "capitalize" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: "#aaa" }}>Sin metadatos de publicación periódica registrados.</p>}

                  {hasManagementRole && (
                    <div style={{ marginTop: "12px" }}>
                      <button className="libro-btn-editar" onClick={() => setEditingPM(v => !v)} style={{ marginBottom: "8px" }}>
                        {editingPM ? "Cancelar edición" : "✏️ Editar Metadatos Periódicos"}
                      </button>
                      {editingPM && (
                        <form onSubmit={handleSavePM} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "#f0f4ff", borderRadius: "10px", padding: "16px" }}>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>ISSN
                            <input style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc", fontSize:"0.85rem" }}
                              value={pmForm.periodical_issn || ""} onChange={e => setPmForm(f => ({ ...f, periodical_issn: e.target.value }))} maxLength={10} placeholder="Ej: 1234-567X" />
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem" }}>Frecuencia
                            <select style={{ display:"block", width:"100%", marginTop:"4px", padding:"6px 8px", borderRadius:"5px", border:"1px solid #ccc" }}
                              value={pmForm.periodical_frequency || ""} onChange={e => setPmForm(f => ({ ...f, periodical_frequency: e.target.value }))} required>
                              <option value="" disabled>Seleccione...</option>
                              {["daily","weekly","monthly","quarterly","annually"].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </label>
                          <label style={{ fontWeight: 600, fontSize: "0.85rem", gridColumn: "1/-1", display: "flex", alignItems: "center", gap: "8px" }}>
                            <input type="checkbox" checked={pmForm.peer_reviewed || false} onChange={e => setPmForm(f => ({ ...f, peer_reviewed: e.target.checked }))} />
                            ¿Es Peer-Reviewed?
                          </label>
                          <div style={{ gridColumn: "1/-1" }}>
                            <button type="submit" className="libro-btn-prestamo" style={{ marginRight:"8px" }}>Guardar Cambios</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── ASSOCIATED ARTICLES (periodicals only) ── */}
              {isPeriodical(libro) && (
                <div className="libro-ubicacion" style={{ marginTop: "24px" }}>
                  <h3>Artículos Asociados</h3>
                  {periodicalArticles.length === 0 ? (
                    <p style={{ color: "#aaa" }}>No hay artículos asociados a esta publicación.</p>
                  ) : (
                    <div>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.87rem", marginTop: "12px" }}>
                        <thead>
                          <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #e0e0e0" }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Título</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Año/Vol/Iss</th>
                            {hasManagementRole && <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#555" }}>Estado</th>}
                            <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "#555" }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {periodicalArticles.slice((articlesPage - 1) * 10, articlesPage * 10).map(art => (
                            <tr key={art.resource_id} style={{ borderBottom: "1px solid #e0e0e0" }}>
                              <td style={{ padding: "8px 12px" }}>{art.resource_title}</td>
                              <td style={{ padding: "8px 12px" }}>
                                {art.digital_article_year || "?"} / Vol {art.digital_article_volume || "?"} / Iss {art.digital_article_issue || "?"}
                              </td>
                              {hasManagementRole && (
                                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                  <span style={{ color: art.disponible ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                                    {art.disponible ? "Disponible" : "Deshabilitado"}
                                  </span>
                                </td>
                              )}
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <button onClick={() => navigate(`/libros/${art.resource_id}`)}
                                        style={{ background: "#4caf50", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", marginRight: "6px" }}>
                                  Ver Detalle
                                </button>
                                {hasManagementRole && (
                                  <button onClick={() => handleToggleArticleState(art.resource_id, art.disponible)}
                                          style={{ background: art.disponible ? "#f44336" : "#2196f3", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>
                                    {art.disponible ? "Deshabilitar" : "Habilitar"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {periodicalArticles.length > 10 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                          <button onClick={() => setArticlesPage(p => Math.max(1, p - 1))} disabled={articlesPage === 1}
                                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", background: articlesPage === 1 ? "#eee" : "#fff", cursor: articlesPage === 1 ? "not-allowed" : "pointer" }}>
                            Anterior
                          </button>
                          <span style={{ fontSize: "0.85rem", color: "#555" }}>Página {articlesPage} de {Math.ceil(periodicalArticles.length / 10)}</span>
                          <button onClick={() => setArticlesPage(p => Math.min(Math.ceil(periodicalArticles.length / 10), p + 1))} disabled={articlesPage === Math.ceil(periodicalArticles.length / 10)}
                                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #ccc", background: articlesPage === Math.ceil(periodicalArticles.length / 10) ? "#eee" : "#fff", cursor: articlesPage === Math.ceil(periodicalArticles.length / 10) ? "not-allowed" : "pointer" }}>
                            Siguiente
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <hr className="libro-divider" />

              {/* ── ACTIONS ── */}
              <div className="libro-acciones">

                {/* Digital: download button for students */}
                {isAlumno && isDigitalDownloadable(libro) && (
                  <>
                    {!isAvailable ? (
                      <p style={{ color: "#c62828", fontWeight: 600, background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px" }}>
                        🚫 Recurso digital no configurado. URL de descarga no disponible.
                      </p>
                    ) : digitalStatus?.can_access ? (
                      <button className="libro-btn-prestamo" onClick={handleDescarga} disabled={loadingDescarga}>
                        {loadingDescarga ? "Procesando…" : "📥 Descargar Recurso"}
                      </button>
                    ) : (
                      <p style={{ color: "#c62828", fontWeight: 600, background: "#fff3f3", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px" }}>
                        🚫 Recurso no disponible: se alcanzó el límite de {digitalMeta?.digital_max_concurrent_users} usuarios concurrentes. Intenta más tarde.
                      </p>
                    )}
                    {activeLoanId && (
                      <button onClick={handleDevolverDigital} style={{ marginLeft:"8px", background:"transparent", border:"1px solid #888", borderRadius:"6px", padding:"6px 12px", cursor:"pointer", fontSize:"0.85rem", color:"#555" }}>
                        Liberar Acceso
                      </button>
                    )}
                  </>
                )}

                {/* Physical: in-person message for students */}
                {isAlumno && !isDigital(libro) && (
                  <p style={{ color: "#795548", fontWeight: 500, fontSize: "0.9rem", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", padding: "10px 14px" }}>
                    📚 Para solicitar este recurso físico, preséntate en persona en la biblioteca. El personal registrará el préstamo.
                  </p>
                )}

                {/* Management: edit / toggle */}
                {hasManagementRole && (
                  <>
                    <button className="libro-btn-editar" onClick={() => { setRecursoEditando({ ...libro }); setModalEditarAbierto(true); }}>
                      Editar Información
                    </button>
                    <button className="libro-btn-deshabilitar" onClick={handleToggleEstado}>
                      {libro.disponible ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Receipt Modal */}
        {receiptData && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
               onClick={() => setReceiptData(null)}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "32px", width: "480px", maxWidth: "95vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}
                 onClick={e => e.stopPropagation()}>
              <button onClick={() => setReceiptData(null)}
                style={{ position: "absolute", top: "12px", right: "14px", background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#999" }}>✕</button>

              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "2.5rem" }}>📋</div>
                <h2 style={{ margin: "8px 0 4px", color: "#2e7d32", fontSize: "1.15rem", fontWeight: 700 }}>Préstamo Registrado</h2>
                <p style={{ color: "#666", fontSize: "0.85rem" }}>Boleta de Préstamo Bibliotecario</p>
              </div>

              <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "16px", fontSize: "0.88rem", lineHeight: "1.9" }}>
                <div><strong>Folio:</strong> #{receiptData.loan_id}</div>
                <div><strong>Recurso:</strong> {receiptData.titulo}</div>
                {receiptData.autor && <div><strong>Autor:</strong> {receiptData.autor}</div>}
                <div><strong>Código de barras:</strong> {receiptData.barcode}</div>
                {receiptData.ubicacion && <div><strong>Ubicación:</strong> {receiptData.ubicacion}</div>}
                <div><strong>Fecha de préstamo:</strong> {new Date(receiptData.initial_lent_at).toLocaleDateString("es-MX", { day:"2-digit", month:"long", year:"numeric" })}</div>
                {receiptData.due_date && (
                  <div style={{ color: "#b71c1c", fontWeight: 600 }}>
                    <strong>Fecha límite de devolución:</strong> {new Date(receiptData.due_date).toLocaleDateString("es-MX", { day:"2-digit", month:"long", year:"numeric" })}
                  </div>
                )}
              </div>

              <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", padding: "10px 14px", marginTop: "16px", fontSize: "0.82rem", color: "#795548" }}>
                ⚠️ {receiptData.instrucciones}
              </div>

              <button onClick={() => setReceiptData(null)}
                style={{ display: "block", width: "100%", marginTop: "20px", padding: "11px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: "7px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Modal Editar — dentro de main-content para que el z-index funcione */}
        {modalEditarAbierto && recursoEditando && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setModalEditarAbierto(false)}>
            <div className="modal-card" style={{ maxWidth: "860px", width: "90vw" }} onClick={e => e.stopPropagation()}>
              <button className="modal-cerrar" onClick={() => setModalEditarAbierto(false)}>✕</button>
              <div className="modal-header">
                <h2 className="modal-titulo">Editar Información del Recurso</h2>
              </div>
              <div className="modal-form" style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "10px" }}>

                <label className="detail-label">Título *</label>
                <input type="text" value={recursoEditando.titulo || ""} onChange={e => setRecursoEditando({ ...recursoEditando, titulo: e.target.value })} className="modal-input" />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label className="detail-label">Tipo *</label>
                    <select className="modal-input" value={recursoEditando.tipo || "book"} onChange={e => setRecursoEditando({ ...recursoEditando, tipo: e.target.value })}>
                      <option value="book">Book</option>
                      <option value="journal_magazine">Journal / Magazine</option>
                      <option value="thesis_dissertation">Thesis / Dissertation</option>
                      <option value="reference">Reference</option>
                      <option value="digital_article">Digital Article</option>
                      <option value="e_book">E-Book</option>
                      <option value="video">Video</option>
                      <option value="audio_music">Audio / Music</option>
                    </select>
                  </div>
                  <div>
                    <label className="detail-label">Autor</label>
                    <select className="modal-input" value={recursoEditando.autor_id || ""} onChange={e => setRecursoEditando({ ...recursoEditando, autor_id: e.target.value ? Number(e.target.value) : "" })}>
                      <option value="">Desconocido...</option>
                      {metadata.authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="detail-label">Editorial</label>
                    <select className="modal-input" value={recursoEditando.editorial_id || ""} onChange={e => setRecursoEditando({ ...recursoEditando, editorial_id: e.target.value ? Number(e.target.value) : "" })}>
                      <option value="">Desconocida...</option>
                      {metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="detail-label">Año</label>
                    <input type="number" value={recursoEditando.ano_publicacion || ""} onChange={e => setRecursoEditando({ ...recursoEditando, ano_publicacion: Number(e.target.value) })} className="modal-input" />
                  </div>
                </div>

                {recursoEditando.tipo === "book" && (
                  <div style={{ background: "#fffde7", padding: "15px", borderRadius: "5px", marginTop: "10px", marginBottom: "15px", border: "1px dashed #FFD400" }}>
                    <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata del Libro</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input type="text" placeholder="ISBN" className="modal-input" value={recursoEditando.isbn || ""} onChange={e => setRecursoEditando({ ...recursoEditando, isbn: e.target.value })} />
                      <input type="number" placeholder="Edición" className="modal-input" value={recursoEditando.edicion || ""} onChange={e => setRecursoEditando({ ...recursoEditando, edicion: Number(e.target.value) })} />
                      <textarea placeholder="Sinópsis..." className="modal-input" style={{ gridColumn: "span 2", minHeight: "60px" }} value={recursoEditando.sinopsis || ""} onChange={e => setRecursoEditando({ ...recursoEditando, sinopsis: e.target.value })} />
                    </div>
                  </div>
                )}

                <label className="detail-label">Géneros</label>
                <div className="checkbox-group">
                  {metadata.categories.map(c => (
                    <label key={c.id}>
                      <input type="checkbox" checked={(recursoEditando.generos_ids || []).includes(c.id)} onChange={e => toggleGenero(c.id, e.target.checked)} /> {c.name}
                    </label>
                  ))}
                </div>

                <label className="detail-label">Lenguajes</label>
                <div className="checkbox-group">
                  {metadata.languages.map(l => (
                    <label key={l.id}>
                      <input type="checkbox" checked={(recursoEditando.lenguajes_ids || []).includes(l.id)} onChange={e => toggleLenguaje(l.id, e.target.checked)} /> {l.name}
                    </label>
                  ))}
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer", fontWeight: "bold", background: "#f0f0f0", padding: "10px", borderRadius: "5px" }}>
                  <input type="checkbox" checked={recursoEditando.disponible ?? true} onChange={e => setRecursoEditando({ ...recursoEditando, disponible: e.target.checked })} />
                  Marcar como Visible/Disponible al Público
                </label>

              </div>
              <div className="modal-botones" style={{ marginTop: "20px" }}>
                <button className="modal-cancelar" onClick={() => setModalEditarAbierto(false)}>Cancelar</button>
                <button className="modal-confirmar" onClick={handleGuardarRecurso}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default LibroDetalle;