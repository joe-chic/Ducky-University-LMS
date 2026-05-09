import { useSidebar } from "../hooks/useSidebar";
import { useCallback, useEffect, useState } from "react";
import "./Home.css";
import landingImage from "../assets/images/landingImage.png";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useNavigate, useLocation } from "react-router-dom";
import { bffGet, bffPut, bffDelete, bffPost, getToken } from "../api/bff";

function Home() {
  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [recursos, setRecursos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [modalRecursoAbierto, setModalRecursoAbierto] = useState(false);

  const userRole = localStorage.getItem("ducky_role");
  const isAdmin = userRole === 'Administrador';
  const isLib = userRole === 'Bibliotecario';
  const hasManagementRole = isAdmin || isLib;
  const isManagementView = hasManagementRole && location.pathname.includes("/libros");
  const isAlumno = !hasManagementRole;

  const [metadata, setMetadata] = useState({ authors: [], publishers: [], categories: [], languages: [] });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [recursoDetalle, setRecursoDetalle] = useState(null);

  const [modalEjemplaresAbierto, setModalEjemplaresAbierto] = useState(false);
  const [recursoActivo, setRecursoActivo] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [nuevoEjemplar, setNuevoEjemplar] = useState({ barcode: "", location_code: "", health_state: "good", op_state: "available" });
  const [formErrors, setFormErrors] = useState({});
  const [blockedStatus, setBlockedStatus] = useState({ loading: false, isBlocked: false, unpaidCount: 0, totalUnpaid: 0 });

  const errorInputStyle = { border: "1.5px solid #d32f2f", background: "#fff5f5" };
  const errorTextStyle = { color: "#d32f2f", fontSize: "12px", marginTop: "4px" };

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

  const refreshBlockedStatus = useCallback(async () => {
    if (hasManagementRole) return;
    const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
    if (!campusId) return;
    setBlockedStatus((s) => ({ ...s, loading: true }));
    try {
      const token = getToken();
      const status = await bffGet(`/api/fines/status-campus/${campusId}`, { token });
      setBlockedStatus({
        loading: false,
        isBlocked: Boolean(status?.blocked_for_loans),
        unpaidCount: Number(status?.unpaid_count || 0),
        totalUnpaid: Number(status?.total_unpaid || 0),
      });
    } catch {
      setBlockedStatus((s) => ({ ...s, loading: false }));
    }
  }, [hasManagementRole]);

  useEffect(() => {
    refreshBlockedStatus();
  }, [refreshBlockedStatus]);

  const fetchRecursos = async (cancelToken) => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/resources", { token, params: { search: busqueda, page, pageSize, sort: "recent" } });
      if (!cancelToken.cancelled) {
        setRecursos(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
      if (!cancelToken.cancelled) setRecursos([]);
    } finally {
      if (!cancelToken.cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelToken = { cancelled: false };
    const t = setTimeout(() => fetchRecursos(cancelToken), 300);
    return () => {
      cancelToken.cancelled = true;
      clearTimeout(t);
    };
  }, [busqueda, page]);

  const handleGuardarRecurso = async () => {
    const errs = {};
    if (!recursoEditando?.titulo?.trim()) errs.titulo = "El título es obligatorio.";
    if (!recursoEditando?.tipo) errs.tipo = "El tipo de recurso es obligatorio.";
    if (recursoEditando?.autor_id === "nuevo") {
      const nombre = (recursoEditando?.nuevo_autor_nombre || "").trim();
      const apellido = (recursoEditando?.nuevo_autor_apellido || "").trim();
      if (!nombre) errs.nuevo_autor_nombre = "Debes escribir el/los nombre(s) del autor.";
      if (!apellido) errs.nuevo_autor_apellido = "Debes escribir el/los apellido(s) del autor.";
    }
    if (recursoEditando?.editorial_id === "nuevo" && !(recursoEditando?.nueva_editorial || "").trim()) {
      errs.nueva_editorial = "Debes escribir el nombre de la nueva editorial.";
    }
    if (recursoEditando?.tipo === "book" && recursoEditando?.isbn && String(recursoEditando.isbn).replace(/-/g, "").length > 13) {
      errs.isbn = "El ISBN no debe exceder 13 caracteres (sin guiones).";
    }
    if (['e_journal', 'e_magazine', 'journal_magazine'].includes(recursoEditando?.tipo) && recursoEditando?.journal_issn && String(recursoEditando.journal_issn).replace(/-/g, "").length > 8) {
      errs.journal_issn = "El ISSN no debe exceder 8 caracteres (sin guiones).";
    }
    if (['video', 'audio_music'].includes(recursoEditando?.tipo) && recursoEditando?.audiovisual_minutes !== "" && Number(recursoEditando?.audiovisual_minutes) <= 0) {
      errs.audiovisual_minutes = "La duración debe ser mayor a 0 minutos.";
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      alert("Corrige los campos marcados en rojo para guardar el recurso.");
      return;
    }
    try {
      const token = getToken();
      if (recursoEditando.id) {
        await bffPut(`/api/resources/${recursoEditando.id}`, recursoEditando, { token });
      } else {
        await bffPost(`/api/resources`, recursoEditando, { token });
      }
      setModalRecursoAbierto(false);
      fetchRecursos({ cancelled: false });
    } catch (err) {
      alert(err?.message || "Error al guardar el recurso");
    }
  };

  const handleToggleEstadoRecurso = async (recurso, e) => {
    e.stopPropagation();
    const rid = Number.parseInt(String(recurso.id), 10);
    if (!Number.isFinite(rid) || rid < 1) {
      alert("Identificador de recurso inválido.");
      return;
    }
    const disponibleActual =
      recurso.disponible === true ||
      recurso.disponible === "true" ||
      recurso.disponible === 1 ||
      recurso.disponible === "1";
    const accion = disponibleActual ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que deseas ${accion} este recurso?`)) return;
    try {
      const token = getToken();
      await bffPut(`/api/resources/${rid}/toggle-state`, { disponible: !disponibleActual }, { token });
      setRecursos(prev => prev.map(r => r.id === recurso.id ? { ...r, disponible: !disponibleActual } : r));
    } catch (err) {
      alert(`Error al ${accion} el recurso`);
    }
  };

  const abrirEjemplares = async (recurso, e) => {
    e.stopPropagation();
    setRecursoActivo(recurso);
    setModalEjemplaresAbierto(true);
    try {
      const token = getToken();
      const data = await bffGet(`/api/resources/${recurso.id}/examples`, { token });
      setEjemplares(data || []);
    } catch (err) {
      alert("Error cargando ejemplares");
    }
  };

  const handleCrearEjemplar = async () => {
    if (!nuevoEjemplar.barcode || !nuevoEjemplar.location_code) {
      alert("Barcode y Location code son obligatorios."); return;
    }
    try {
      const token = getToken();
      await bffPost(`/api/resources/${recursoActivo.id}/examples`, nuevoEjemplar, { token });
      setEjemplares([...ejemplares, { ...nuevoEjemplar, example_health_state: nuevoEjemplar.health_state, example_op_state: nuevoEjemplar.op_state, example_location_code: nuevoEjemplar.location_code }]);
      setNuevoEjemplar({ barcode: "", location_code: "", health_state: "good", op_state: "available" });
    } catch (err) {
      alert("Error agregando ejemplar");
    }
  };

  const handleEliminarEjemplar = async (barcode) => {
    if (!window.confirm("¿Eliminar ejemplar?")) return;
    try {
      const token = getToken();
      await bffDelete(`/api/resources/${recursoActivo.id}/examples/${barcode}`, { token });
      setEjemplares(prev => prev.filter(e => e.barcode !== barcode));
    } catch (err) {
      alert("Error eliminando ejemplar");
    }
  };

  const toggleGenero = (id, checked) => {
    const g = new Set(recursoEditando.generos_ids || []);
    if (checked) g.add(id); else g.delete(id);
    setRecursoEditando({ ...recursoEditando, generos_ids: Array.from(g) });
  };

  const toggleLenguaje = (id, checked) => {
    const l = new Set(recursoEditando.lenguajes_ids || []);
    if (checked) l.add(id); else l.delete(id);
    setRecursoEditando({ ...recursoEditando, lenguajes_ids: Array.from(l) });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Hero */}
        <div className="hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${landingImage})` }}>
          <h1>Biblioteca de Recursos</h1>
        </div>

        {!hasManagementRole && blockedStatus.isBlocked && (
          <div style={{ margin: "16px 60px 0 60px", background: "#ffebee", border: "1px solid #ef9a9a", color: "#b71c1c", borderRadius: "8px", padding: "12px 16px", fontWeight: 600 }}>
            Cuenta bloqueada por multas pendientes: {blockedStatus.unpaidCount} multa(s), total ${blockedStatus.totalUnpaid.toFixed(2)} MXN. Puedes iniciar sesión, pero no podrás solicitar préstamos hasta liquidarlas.
          </div>
        )}

        {/* Recursos */}
        <div style={{ padding: "0 60px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", marginBottom: "20px" }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {isManagementView ? "Gestión y Control de Recursos" : "Catálogo de Conocimiento"}
            </h2>
            {isManagementView && (
              <button className="btn-action" style={{ backgroundColor: "#4CAF50", color: "white" }} onClick={() => {
                setRecursoEditando({
                  titulo: "",
                  tipo: "book",
                  disponible: true,
                  autor_id: "",
                  nuevo_autor_nombre: "",
                  nuevo_autor_apellido: "",
                  editorial_id: "",
                  generos_ids: [],
                  lenguajes_ids: [],
                  isbn: "",
                  edicion: "",
                  sinopsis: "",
                  costo: 0,
                  ano_publicacion: "",
                });
                setFormErrors({});
                setModalRecursoAbierto(true);
              }}>
                ➕ Agregar Recurso
              </button>
            )}
          </div>

          <div className="books-search" style={{ margin: "0 0 30px 0" }}>
            <input
              className="search-input"
              style={{ width: "100%" }}
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
              placeholder="Buscar recursos por título, autor o género..."
            />
          </div>

          <h3 style={{ borderBottom: "2px solid #e0e0e0", paddingBottom: "10px", marginBottom: "20px", color: "#b8860b" }}>
            Recientemente añadido
          </h3>

          <div className="books-grid" style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px", marginBottom: "30px" }}>
            {loading ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#666" }}>Cargando...</div>
            ) : recursos.length > 0 ? (
              recursos.map((recurso) => (
                <div className="book-card book-card-clickable" key={recurso.id} onClick={() => navigate(`/libros/${recurso.id}`)}>
                  <div className="book-card-top">
                    <span className="badge-disponible" style={{ backgroundColor: recurso.disponible ? "#2E8B57" : "#aa0000" }}>
                      {recurso.disponible ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                  <div className="book-card-content">
                    <div className="book-info">
                      <div className="book-cover" style={{ width: "60px", height: "80px", overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "4px" }}>
                        {recurso.portada ? <img src={recurso.portada} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "📚"}
                      </div>
                      <div className="book-details">
                        <p className="book-title">{recurso.titulo}</p>
                        <p className="book-autor" style={{ textTransform: "capitalize", fontWeight: "bold" }}>{recurso.tipo.replace('_', ' ')}</p>
                        <p className="book-editorial">{recurso.autor || "Autor Desconocido"}</p>
                        <p className="book-genero" style={{ color: "#888", marginTop: "5px" }}>📍 Ubicación:<br /><strong>{recurso.ubicacion || 'Sin ubicación física registrada'}</strong></p>
                      </div>
                    </div>
                  </div>
                  {isManagementView && (
                    <div className="book-actions">
                      <button className="btn-action" onClick={(e) => { e.stopPropagation(); setRecursoEditando({ ...recurso }); setModalRecursoAbierto(true); }}>✏️ Editar</button>
                      <button className="btn-action" onClick={(e) => handleToggleEstadoRecurso(recurso, e)}>
                        {recurso.disponible ? "🚫 Deshabilitar" : "✅ Habilitar"}
                      </button>
                      {recurso.tipo === 'book' && (
                        <button className="btn-action" style={{ border: "1px solid #2196F3" }} onClick={(e) => abrirEjemplares(recurso, e)}>📚 Ejemplares</button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "#666" }}>No se encontraron recursos.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar Recurso */}
      {modalRecursoAbierto && (
        <div className="modal-overlay" onClick={() => setModalRecursoAbierto(false)}>
          <div className="modal-card" style={{ maxWidth: "860px", width: "90vw" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => { setModalRecursoAbierto(false); setFormErrors({}); }}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">{recursoEditando?.id ? "Editar Información del Recurso" : "Registrar Nuevo Recurso"}</h2>
            </div>
            <div className="modal-form" style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "10px" }}>
              <label className="detail-label">Título *</label>
              <input type="text" value={recursoEditando?.titulo || ""} onChange={(e) => { setRecursoEditando({ ...recursoEditando, titulo: e.target.value }); setFormErrors(prev => ({ ...prev, titulo: null })); }} className="modal-input" style={formErrors.titulo ? errorInputStyle : undefined} />
              {formErrors.titulo && <div style={errorTextStyle}>{formErrors.titulo}</div>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <label className="detail-label">Tipo de Recurso *</label>
                  <select className="modal-input" disabled={!!recursoEditando?.id} value={recursoEditando?.tipo || "book"} onChange={(e) => { setRecursoEditando({ ...recursoEditando, tipo: e.target.value }); setFormErrors(prev => ({ ...prev, tipo: null })); }} style={formErrors.tipo ? errorInputStyle : undefined}>
                    <option value="book">Book</option>
                    <option value="journal_magazine">Journal / Magazine</option>
                    <option value="e_journal">E-Journal</option>
                    <option value="e_magazine">E-Magazine</option>
                    <option value="thesis_dissertation">Thesis / Dissertation</option>
                    <option value="reference">Reference</option>
                    <option value="digital_article">Digital Article</option>
                    <option value="e_article">E-Article</option>
                    <option value="e_book">E-Book</option>
                    <option value="video">Video</option>
                    <option value="audio_music">Audio / Music</option>
                    <option value="map">Map</option>
                  </select>
                  {formErrors.tipo && <div style={errorTextStyle}>{formErrors.tipo}</div>}
                </div>
                <div>
                  <label className="detail-label">Autor</label>
                  <select className="modal-input" value={recursoEditando?.autor_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, autor_id: e.target.value === "nuevo" ? "nuevo" : (e.target.value ? Number(e.target.value) : "") })}>
                    <option value="">Desconocido...</option>
                    <option value="nuevo">➕ Registrar Nuevo Autor...</option>
                    {metadata.authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {recursoEditando?.autor_id === "nuevo" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "5px" }}>
                      <div>
                        <input
                          type="text"
                          placeholder="Nombre(s) del autor"
                          className="modal-input"
                          style={formErrors.nuevo_autor_nombre ? errorInputStyle : undefined}
                          value={recursoEditando?.nuevo_autor_nombre || ""}
                          onChange={e => {
                            setRecursoEditando({ ...recursoEditando, nuevo_autor_nombre: e.target.value });
                            setFormErrors(prev => ({ ...prev, nuevo_autor_nombre: null }));
                          }}
                        />
                        {formErrors.nuevo_autor_nombre && <div style={errorTextStyle}>{formErrors.nuevo_autor_nombre}</div>}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Apellido(s) del autor"
                          className="modal-input"
                          style={formErrors.nuevo_autor_apellido ? errorInputStyle : undefined}
                          value={recursoEditando?.nuevo_autor_apellido || ""}
                          onChange={e => {
                            setRecursoEditando({ ...recursoEditando, nuevo_autor_apellido: e.target.value });
                            setFormErrors(prev => ({ ...prev, nuevo_autor_apellido: null }));
                          }}
                        />
                        {formErrors.nuevo_autor_apellido && <div style={errorTextStyle}>{formErrors.nuevo_autor_apellido}</div>}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="detail-label">Editorial</label>
                  <select className="modal-input" value={recursoEditando?.editorial_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, editorial_id: e.target.value === "nuevo" ? "nuevo" : (e.target.value ? Number(e.target.value) : "") })}>
                    <option value="">Desconocida...</option>
                    <option value="nuevo">➕ Registrar Nueva Editorial...</option>
                    {metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {recursoEditando?.editorial_id === "nuevo" && (
                     <input type="text" placeholder="Nombre de la editorial" className="modal-input" style={{ marginTop: "5px", ...(formErrors.nueva_editorial ? errorInputStyle : {}) }} value={recursoEditando?.nueva_editorial || ""} onChange={e => { setRecursoEditando({...recursoEditando, nueva_editorial: e.target.value}); setFormErrors(prev => ({ ...prev, nueva_editorial: null })); }} />
                  )}
                  {formErrors.nueva_editorial && <div style={errorTextStyle}>{formErrors.nueva_editorial}</div>}
                </div>
                <div>
                  <label className="detail-label">Año de Publicación</label>
                  <input type="number" value={recursoEditando?.ano_publicacion || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, ano_publicacion: Number(e.target.value) })} className="modal-input" />
                </div>
              </div>

              {recursoEditando?.tipo === 'book' && (
                <div style={{ background: "#fffde7", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #FFD400" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata del Libro</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="text" placeholder="ISBN (13 dígitos)" className="modal-input" value={recursoEditando?.isbn || ""} onChange={(e) => { setRecursoEditando({ ...recursoEditando, isbn: e.target.value }); setFormErrors(prev => ({ ...prev, isbn: null })); }} style={formErrors.isbn ? errorInputStyle : undefined} />
                    {formErrors.isbn && <div style={errorTextStyle}>{formErrors.isbn}</div>}
                    <input type="number" placeholder="Número de Edición" className="modal-input" value={recursoEditando?.edicion || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, edicion: Number(e.target.value) })} />
                    <textarea placeholder="Ingresa la Sinópsis..." className="modal-input" style={{ gridColumn: "span 2", minHeight: "60px" }} value={recursoEditando?.sinopsis || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, sinopsis: e.target.value })} />
                  </div>
                </div>
              )}

              <label className="detail-label">Lenguaje Principal (Primario)</label>
              <select className="modal-input" value={recursoEditando?.lenguaje_principal_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, lenguaje_principal_id: e.target.value ? Number(e.target.value) : "" })}>
                <option value="">Desconocido / Ninguno</option>
                {metadata.languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              
              {['e_journal', 'e_magazine', 'journal_magazine'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#e8eaf6", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #5c6bc0" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Publicación Periódica</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="text" placeholder="ISSN (8 caracteres)" className="modal-input" value={recursoEditando?.journal_issn || ""} onChange={(e) => { setRecursoEditando({ ...recursoEditando, journal_issn: e.target.value }); setFormErrors(prev => ({ ...prev, journal_issn: null })); }} style={formErrors.journal_issn ? errorInputStyle : undefined} />
                    {formErrors.journal_issn && <div style={errorTextStyle}>{formErrors.journal_issn}</div>}
                    <select className="modal-input" value={recursoEditando?.journal_frequency || "monthly"} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_frequency: e.target.value })}>
                      <option value="daily">Diario</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="annually">Anual</option>
                    </select>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer", fontSize: "14px" }}>
                    <input type="checkbox" checked={recursoEditando?.journal_peer_reviewed ?? false} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_peer_reviewed: e.target.checked })} />
                    ¿Es revisado por pares? (Peer Reviewed)
                  </label>
                </div>
              )}

              {['e_article', 'digital_article'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#e0f2f1", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #26a69a" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Artículo</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="number" placeholder="ID Revista Padre" className="modal-input" value={recursoEditando?.journal_id || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, journal_id: Number(e.target.value) })} />
                    <input type="number" placeholder="Año" className="modal-input" value={recursoEditando?.article_year || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_year: Number(e.target.value) })} />
                    <input type="number" placeholder="Volumen" className="modal-input" value={recursoEditando?.article_volume || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_volume: Number(e.target.value) })} />
                    <input type="number" placeholder="Issue (Número)" className="modal-input" value={recursoEditando?.article_issue || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, article_issue: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {['video', 'audio_music'].includes(recursoEditando?.tipo) && (
                <div style={{ background: "#f3e5f5", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ab47bc" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata Audiovisual</h4>
                  <input type="number" placeholder="Duración (Minutos)" className="modal-input" value={recursoEditando?.audiovisual_minutes || ""} onChange={(e) => { setRecursoEditando({ ...recursoEditando, audiovisual_minutes: Number(e.target.value) }); setFormErrors(prev => ({ ...prev, audiovisual_minutes: null })); }} style={formErrors.audiovisual_minutes ? errorInputStyle : undefined} />
                  {formErrors.audiovisual_minutes && <div style={errorTextStyle}>{formErrors.audiovisual_minutes}</div>}
                </div>
              )}

              {recursoEditando?.tipo === 'map' && (
                <div style={{ background: "#fff3e0", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ff9800" }}>
                  <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Mapa</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <input type="text" placeholder="Escala" className="modal-input" value={recursoEditando?.maps_scale || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_scale: e.target.value })} />
                    <input type="text" placeholder="Tipo de proyección" className="modal-input" value={recursoEditando?.maps_projection_type || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_projection_type: e.target.value })} />
                    <input type="text" placeholder="Tipo de mapa" className="modal-input" style={{ gridColumn: "span 2" }} value={recursoEditando?.maps_type || ""} onChange={(e) => setRecursoEditando({ ...recursoEditando, maps_type: e.target.value })} />
                  </div>
                </div>
              )}

              <label className="detail-label">Géneros Múltiples</label>
              <div className="checkbox-group">
                {metadata.categories.map(c => (
                  <label key={c.id}>
                    <input type="checkbox" checked={(recursoEditando?.generos_ids || []).includes(c.id)} onChange={e => toggleGenero(c.id, e.target.checked)} /> {c.name}
                  </label>
                ))}
              </div>

              <label className="detail-label">Lenguajes de Apoyo</label>
              <div className="checkbox-group">
                {metadata.languages.map(l => (
                  <label key={l.id}>
                    <input type="checkbox" checked={(recursoEditando?.lenguajes_ids || []).includes(l.id)} onChange={e => toggleLenguaje(l.id, e.target.checked)} /> {l.name}
                  </label>
                ))}
              </div>


              {recursoEditando?.id && recursoEditando?.tipo === 'book' && (
                <div style={{ background: "#e3f2fd", padding: "10px", borderRadius: "5px", marginTop: "15px", border: "1px solid #90caf9" }}>
                  <span className="detail-label" style={{ color: "#0d47a1" }}>📝 Recordatorio:</span>
                  <p style={{ color: "#0d47a1", fontSize: "13px" }}>La <strong>Ubicación Física</strong> y <strong>Codebar</strong> deben manejarse desde <strong>"📚 Ejemplares"</strong>.</p>
                </div>
              )}
            </div>
            <div className="modal-botones" style={{ marginTop: "20px" }}>
              <button className="modal-cancelar" onClick={() => { setModalRecursoAbierto(false); setFormErrors({}); }}>Cancelar</button>
              <button className="modal-confirmar" onClick={handleGuardarRecurso}>Guardar Cambios BD</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ejemplares */}
      {modalEjemplaresAbierto && recursoActivo && (
        <div className="modal-overlay" onClick={() => setModalEjemplaresAbierto(false)}>
          <div className="modal-card" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => setModalEjemplaresAbierto(false)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">Gestor de Ejemplares Físicos</h2>
              <p style={{ margin: 0, color: "#666" }}>{recursoActivo.titulo}</p>
            </div>
            <div className="modal-form" style={{ maxHeight: "300px", overflowY: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", marginBottom: "15px", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #ddd" }}>
                    <th>Codebar</th><th>Ubicación</th><th>Salud</th><th>Estado Op</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {ejemplares.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: "10px", textAlign: "center", color: "#888" }}>No hay ejemplares registrados</td></tr>
                  ) : (
                    ejemplares.map(ej => (
                      <tr key={ej.barcode} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "5px 0" }}>{ej.barcode}</td>
                        <td>{ej.example_location_code}</td>
                        <td>{ej.example_health_state}</td>
                        <td>{ej.example_op_state}</td>
                        <td><button style={{ color: "red", border: "none", background: "none", cursor: "pointer" }} onClick={() => handleEliminarEjemplar(ej.barcode)}>🗑️</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input type="text" placeholder="Código de Barras *" className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.barcode} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, barcode: e.target.value })} />
                <input type="text" placeholder="Ubicación Física *" className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.location_code} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, location_code: e.target.value })} />
                <select className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.health_state} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, health_state: e.target.value })}>
                  <option value="good">Good</option>
                  <option value="damaged">Damaged</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="lost">Lost</option>
                </select>
                <select className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.op_state} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, op_state: e.target.value })}>
                  <option value="available">Available</option>
                  <option value="on loan">On Loan</option>
                  <option value="reserved">Reserved</option>
                  <option value="internal consultation only">Internal Consultation Only</option>
                  <option value="in transit">In transit</option>
                </select>
                <button style={{ gridColumn: "span 2", padding: "10px" }} className="modal-confirmar" onClick={handleCrearEjemplar}>Agregar Ejemplar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;