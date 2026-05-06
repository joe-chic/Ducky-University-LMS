import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Home.css";
import "./LibroDetalle.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPut, bffPost, getToken } from "../api/bff";

function LibroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";
  const isLib = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  const isAlumno = !hasManagementRole;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [libro, setLibro] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [loadingPrestamo, setLoadingPrestamo] = useState(false);
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
      setMsg({ type: "success", text: `Préstamo solicitado correctamente (ID: ${res.loan_id}). Recoge tu libro en biblioteca.` });
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
  const enPrestamo = ejemplares.filter(e => e.example_op_state === "on loan").length;

  return (
    <div className="home-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Contenido */}
        <div className="libro-detalle-container">

          <div className="libro-breadcrumb">
            <span onClick={() => navigate("/libros")} style={{ cursor: "pointer", color: "#b8860b" }}>Libros</span>
            <span> › </span>
            <span>{libro?.titulo || "Detalle"}</span>
          </div>

          <button className="libro-back-btn" onClick={() => navigate("/libros")}>←</button>

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
                  <div className="libro-portada-placeholder">
                    <span>{libro.tipo?.replace(/_/g, " ")}</span>
                  </div>
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
                    <div className="libro-dato">
                      <span className="libro-dato-label">ISBN</span>
                      <span className="libro-dato-valor">{libro.isbn || "N/A"}</span>
                    </div>
                    <div className="libro-dato">
                      <span className="libro-dato-label">Editorial</span>
                      <span className="libro-dato-valor">{libro.editorial || "N/A"}</span>
                    </div>
                    <div className="libro-dato">
                      <span className="libro-dato-label">Año</span>
                      <span className="libro-dato-valor">{libro.ano_publicacion || "N/A"}</span>
                    </div>
                    <div className="libro-dato">
                      <span className="libro-dato-label">Edición</span>
                      <span className="libro-dato-valor">{libro.edicion ? `${libro.edicion}ra edición` : "N/A"}</span>
                    </div>
                    <div className="libro-dato">
                      <span className="libro-dato-label">Estado</span>
                      <span className="libro-dato-valor" style={{ color: libro.disponible ? "#2e7d32" : "#c62828", fontWeight: "bold" }}>
                        {libro.disponible ? "Disponible" : "No disponible"}
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

              <div className="libro-ubicacion">
                <h3>Ubicación en biblioteca</h3>
                {ejemplares.length === 0 ? (
                  <p style={{ color: "#999" }}>No hay ejemplares físicos registrados.</p>
                ) : (
                  <div className="libro-ubicacion-card">
                    <div className="libro-ubicacion-icon">📍</div>
                    <div>
                      <p className="libro-ubicacion-texto">{libro.ubicacion || "Sin ubicación registrada"}</p>
                      <div className="libro-ubicacion-badges">
                        <span className="libro-badge-disponible">{disponibles} Disponible{disponibles !== 1 ? "s" : ""}</span>
                        {enPrestamo > 0 && <span className="libro-badge-prestamo">{enPrestamo} en Préstamo</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <hr className="libro-divider" />

              <div className="libro-acciones">
                {isAlumno && libro.disponible && (
                  <button className="libro-btn-prestamo" onClick={handleSolicitarPrestamo} disabled={loadingPrestamo}>
                    {loadingPrestamo ? "Procesando..." : "Solicitar Préstamo"}
                  </button>
                )}
                {isAlumno && !libro.disponible && (
                  <p style={{ color: "#c62828", fontWeight: 600 }}>No disponible para préstamo en este momento.</p>
                )}
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