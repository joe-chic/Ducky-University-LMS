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
  const isLib   = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  // Only actual students/employees (non-management) can request loans online
  const isAlumno = !hasManagementRole;

  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Only digital resources (e-books and digital articles) can be requested online.
  // Physical books must be borrowed in person through the librarian.
  const isDigital = libro => ["e_book", "digital_article"].includes(libro?.tipo);

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
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Estado Físico</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#555" }}>Disponibilidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ejemplares.map((ej, i) => {
                          const opState = ej.example_op_state;
                          const available = opState === "available";
                          const badgeColor = available ? "#2E8B57" : opState === "on loan" ? "#b71c1c" : "#795548";
                          const badgeLabel = opState === "available" ? "Disponible"
                            : opState === "on loan" ? "En Préstamo"
                            : opState === "reserved" ? "Reservado"
                            : opState === "internal consultation only" ? "Consulta Interna"
                            : opState === "in transit" ? "En Tránsito"
                            : opState;
                          return (
                            <tr key={ej.barcode || i} style={{ borderBottom: "1px solid #eee" }}>
                              <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: "0.85rem", color: "#333" }}>{ej.barcode}</td>
                              <td style={{ padding: "8px 12px", color: "#555" }}>{ej.example_location_code}</td>
                              <td style={{ padding: "8px 12px", textTransform: "capitalize", color: "#666" }}>{ej.example_health_state}</td>
                              <td style={{ padding: "8px 12px" }}>
                                <span style={{ background: badgeColor, color: "#fff", borderRadius: "12px", padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                                  {badgeLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <hr className="libro-divider" />

              <div className="libro-acciones">
                {isAlumno && isDigital(libro) && libro.disponible && (
                  <button className="libro-btn-prestamo" onClick={handleSolicitarPrestamo} disabled={loadingPrestamo}>
                    {loadingPrestamo ? "Procesando..." : "Solicitar Préstamo"}
                  </button>
                )}
                {isAlumno && isDigital(libro) && !libro.disponible && (
                  <p style={{ color: "#c62828", fontWeight: 600 }}>No disponible para préstamo en este momento.</p>
                )}
                {isAlumno && !isDigital(libro) && (
                  <p style={{ color: "#795548", fontWeight: 500, fontSize: "0.9rem", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "6px", padding: "10px 14px" }}>
                    📚 Para solicitar este recurso físico, preséntate en persona en la biblioteca. El personal registrará el préstamo.
                  </p>
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