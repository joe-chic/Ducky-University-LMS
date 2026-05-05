import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Usuarios.css";
import duckIcon from "../assets/icons/duckIcon.svg";
import searchIcon from "../assets/icons/searchIcon.svg";
import updateIcon from "../assets/icons/updateIcon.svg";
import buttonCirculo from "../assets/icons/Button-circulo.svg";
import Sidebar from "../components/Sidebar";
import { bffGet, bffPost, bffPut, getToken } from "../api/bff";

function Libros() {
  const navigate = useNavigate();

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";
  const isLib = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  const isAlumno = !hasManagementRole;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [metadata, setMetadata] = useState({ authors: [], publishers: [], categories: [], languages: [] });
  const [filtros, setFiltros] = useState({ lenguaje: "", categoria: "", autor: "", editorial: "", anio: "" });

  const [msgPrestamo, setMsgPrestamo] = useState(null);
  const [loadingPrestamo, setLoadingPrestamo] = useState(false);

  const [modalRecursoAbierto, setModalRecursoAbierto] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [modalEjemplaresAbierto, setModalEjemplaresAbierto] = useState(false);
  const [recursoActivo, setRecursoActivo] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [nuevoEjemplar, setNuevoEjemplar] = useState({ barcode: "", location_code: "", health_state: "good", op_state: "available" });

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

  const fetchRecursos = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = { search: busqueda, page, pageSize };
      if (filtros.lenguaje) params.lenguaje = filtros.lenguaje;
      if (filtros.categoria) params.categoria = filtros.categoria;
      if (filtros.autor) params.autor = filtros.autor;
      if (filtros.editorial) params.editorial = filtros.editorial;
      if (filtros.anio) params.anio = filtros.anio;
      const data = await bffGet("/api/resources", { token, params });
      setRecursos(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setRecursos([]);
    } finally {
      setLoading(false);
    }
  }, [busqueda, page, filtros]);

  useEffect(() => {
    const t = setTimeout(fetchRecursos, 300);
    return () => clearTimeout(t);
  }, [fetchRecursos]);

  const handleLogout = () => {
    localStorage.removeItem("ducky_token");
    localStorage.removeItem("ducky_role");
    localStorage.removeItem("ducky_campus_id");
    localStorage.removeItem("ducky_nombre");
    navigate("/");
  };

  const handleSolicitarPrestamo = async (recurso, e) => {
    e.stopPropagation();
    setMsgPrestamo(null);
    if (!campusId) {
      setMsgPrestamo({ type: "error", text: "No se encontró tu ID de campus. Vuelve a iniciar sesión." });
      return;
    }
    let targetBarcode = null;
    try {
      const token = getToken();
      const examples = await bffGet(`/api/resources/${recurso.id}/examples`, { token });
      const available = (examples || []).find(ex => ex.example_op_state === "available");
      if (!available) {
        setMsgPrestamo({ type: "error", text: "No hay ejemplares disponibles en este momento." });
        return;
      }
      targetBarcode = available.barcode;
    } catch {
      if (recurso.codebar) targetBarcode = recurso.codebar.split(", ")[0].trim();
    }
    if (!targetBarcode) {
      setMsgPrestamo({ type: "error", text: "Este recurso no tiene ejemplares físicos registrados." });
      return;
    }
    setLoadingPrestamo(true);
    try {
      const token = getToken();
      const res = await bffPost("/api/loans", { barcode: targetBarcode, campus_id: campusId }, { token });
      setMsgPrestamo({ type: "success", text: `Préstamo solicitado (ID: ${res.loan_id}).` });
      fetchRecursos();
    } catch (err) {
      setMsgPrestamo({ type: "error", text: err.message || "Error al solicitar el préstamo." });
    } finally {
      setLoadingPrestamo(false);
    }
  };

  const handleToggleEstado = async (recurso, e) => {
    e.stopPropagation();
    const accion = recurso.disponible ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que deseas ${accion} este recurso?`)) return;
    try {
      const token = getToken();
      await bffPut(`/api/resources/${recurso.id}`, { ...recurso, disponible: !recurso.disponible }, { token });
      setRecursos(prev => prev.map(r => r.id === recurso.id ? { ...r, disponible: !recurso.disponible } : r));
    } catch {
      alert(`Error al ${accion} el recurso`);
    }
  };

  const handleGuardarRecurso = async () => {
    if (!recursoEditando?.titulo || !recursoEditando?.tipo) {
      alert("Por favor indique el Título y Tipo del recurso."); return;
    }
    try {
      const token = getToken();
      if (recursoEditando.id) {
        await bffPut(`/api/resources/${recursoEditando.id}`, recursoEditando, { token });
      } else {
        await bffPost("/api/resources", recursoEditando, { token });
      }
      setModalRecursoAbierto(false);
      fetchRecursos();
    } catch {
      alert("Error al guardar el recurso");
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
    } catch { alert("Error cargando ejemplares"); }
  };

  const handleCrearEjemplar = async () => {
    if (!nuevoEjemplar.barcode || !nuevoEjemplar.location_code) {
      alert("Barcode y Location code son obligatorios."); return;
    }
    try {
      const token = getToken();
      await bffPost(`/api/resources/${recursoActivo.id}/examples`, nuevoEjemplar, { token });
      setEjemplares(prev => [...prev, { barcode: nuevoEjemplar.barcode, example_location_code: nuevoEjemplar.location_code, example_health_state: nuevoEjemplar.health_state, example_op_state: nuevoEjemplar.op_state }]);
      setNuevoEjemplar({ barcode: "", location_code: "", health_state: "good", op_state: "available" });
    } catch { alert("Error agregando ejemplar"); }
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
    <div className="usuarios-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        {/* Navbar */}
        <nav className="navbar">
          <div className="navbar-left">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <div className="navbar-logo">
              <img src={duckIcon} alt="Ducky" className="navbar-duck-icon" />
              <div className="navbar-logo-text">
                <span className="navbar-ducky">Ducky</span>
                <span className="navbar-university">University</span>
              </div>
            </div>
          </div>
          <div className="navbar-right">
            <span style={{ cursor: "pointer" }} onClick={() => alert("Próximamente")}>Soporte</span>
            <span style={{ cursor: "pointer" }} onClick={() => alert("Próximamente")}>Notificaciones</span>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}>
              <span>Usuario</span>
              {menuUsuarioAbierto && (
                <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "#fff", color: "#333", padding: "10px", borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10, minWidth: "120px" }}>
                  <button onClick={handleLogout} style={{ border: "none", background: "none", cursor: "pointer", color: "red", padding: "5px", width: "100%", textAlign: "left" }}>Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Contenido — mismo layout que Usuarios */}
        <div className="usuarios-content">

          <div className="usuarios-main">

            {/* Barra de búsqueda — igual que Usuarios */}
            <div className="search-bar">
              <img src={searchIcon} alt="buscar" className="search-icon-img" />
              <input
                type="text"
                placeholder="Buscar libros, géneros, autores..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                className="search-input"
              />
            </div>

            {/* Mensaje préstamo */}
            {msgPrestamo && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: msgPrestamo.type === "success" ? "#e8f5e9" : "#ffebee", color: msgPrestamo.type === "success" ? "#2e7d32" : "#c62828", border: `1px solid ${msgPrestamo.type === "success" ? "#a5d6a7" : "#ef9a9a"}`, fontWeight: 500, fontSize: "0.9rem" }}>
                {msgPrestamo.text}
                <button onClick={() => setMsgPrestamo(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
              </div>
            )}

            {/* Lista de libros — misma estructura que lista de usuarios */}
            <div className="usuarios-lista">
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Cargando...</div>
              ) : recursos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>No se encontraron recursos.</div>
              ) : (
                recursos.map(recurso => (
                  <div
                    className="usuario-card"
                    key={recurso.id}
                    onClick={() => navigate(`/libros/${recurso.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Portada — mismo tamaño que avatar */}
                    <div className="usuario-avatar" style={{ width: "56px", height: "72px", background: "linear-gradient(135deg, #1a1a2e, #2d2d5e)", borderRadius: "6px", border: "1px solid #212529", flexShrink: 0 }} />

                    {/* Info — mismo estilo que usuario-info */}
                    <div className="usuario-info">
                      <p className="usuario-nombre">{recurso.titulo}</p>
                      <p className="usuario-rol" style={{ textTransform: "capitalize" }}>{recurso.tipo?.replace(/_/g, " ")}</p>
                      <p className="usuario-correo">{recurso.autor || "Autor Desconocido"}</p>
                      <p className="usuario-telefono">{recurso.editorial || ""}{recurso.genero ? ` · ${recurso.genero}` : ""}</p>
                    </div>

                    {/* Acciones — misma estructura que usuario-actions */}
                    <div className="usuario-actions" onClick={e => e.stopPropagation()}>
                      <span className="badge-activo" style={{ background: recurso.disponible ? "#2E8B57" : "#aa0000" }}>
                        {recurso.disponible ? "Disponible" : "No disponible"}
                      </span>

                      {isAlumno && recurso.disponible && (
                        <button className="btn-action" onClick={e => handleSolicitarPrestamo(recurso, e)} disabled={loadingPrestamo}>
                          Solicitar Préstamo
                        </button>
                      )}

                      {hasManagementRole && (
                        <>
                          <button className="btn-action" onClick={e => { e.stopPropagation(); setRecursoEditando({ ...recurso }); setModalRecursoAbierto(true); }}>
                            <img src={updateIcon} alt="editar" className="btn-icon" /> Editar
                          </button>
                          <button className="btn-action" onClick={e => handleToggleEstado(recurso, e)}>
                            <span style={{ marginRight: "4px", fontSize: "14px" }}>{recurso.disponible ? "🚫" : "✅"}</span>
                            {recurso.disponible ? "Deshabilitar" : "Habilitar"}
                          </button>
                          {recurso.tipo === "book" && (
                            <button className="btn-action" onClick={e => abrirEjemplares(recurso, e)}>
                              Ejemplares
                            </button>
                          )}
                        </>
                      )}

                      <button className="btn-action" onClick={e => { e.stopPropagation(); navigate(`/libros/${recurso.id}`); }}>
                        Busqueda
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación — igual que Usuarios */}
            {totalPages > 1 && (
              <div className="paginacion">
                <button className="pag-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                <button className="pag-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <button key={num} className={`pag-btn ${page === num ? "pag-activa" : ""}`} onClick={() => setPage(num)}>{num}</button>
                ))}
                <button className="pag-btn" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
                <button className="pag-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
              </div>
            )}
          </div>

          {/* Panel filtros — misma clase y estilo que panel de permisos */}
          <div className="permisos-panel">
            <h3 className="permisos-title">Filtrar Libros</h3>
            <hr />

            {[
              { label: "Idioma", key: "lenguaje", options: metadata.languages.map(l => l.name) },
              { label: "Categoría", key: "categoria", options: metadata.categories.map(c => c.name) },
              { label: "Autor", key: "autor", options: metadata.authors.map(a => a.name) },
              { label: "Editorial", key: "editorial", options: metadata.publishers.map(p => p.name) },
            ].map(f => (
              <div key={f.key} style={{ marginTop: "10px" }}>
                <select
                  value={filtros[f.key]}
                  onChange={e => { setFiltros(prev => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
                  className="permiso-rol-header"
                  style={{ width: "100%", cursor: "pointer", background: "#F8F9FA", fontSize: "14px", border: "1px solid #212529", borderRadius: "5px", padding: "4px 8px" }}
                >
                  <option value="">{f.label}</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}

            <div style={{ marginTop: "10px" }}>
              <select
                value={filtros.anio}
                onChange={e => { setFiltros(prev => ({ ...prev, anio: e.target.value })); setPage(1); }}
                className="permiso-rol-header"
                style={{ width: "100%", cursor: "pointer", background: "#F8F9FA", fontSize: "14px", border: "1px solid #212529", borderRadius: "5px", padding: "4px 8px" }}
              >
                <option value="">Año</option>
                {[2024,2023,2022,2021,2020,2019,2018,2015,2010,2005,2000].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {Object.values(filtros).some(v => v) && (
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={() => { setFiltros({ lenguaje: "", categoria: "", autor: "", editorial: "", anio: "" }); setPage(1); }}
                  className="btn-cancelar"
                  style={{ width: "100%", fontSize: "12px" }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Botón + flotante — igual que Usuarios */}
        {hasManagementRole && (
          <button
            className="btn-flotante"
            onClick={() => { setRecursoEditando({ titulo: "", tipo: "book", disponible: true, autor_id: "", editorial_id: "", generos_ids: [], lenguajes_ids: [], isbn: "", edicion: "", sinopsis: "", costo: 0, ano_publicacion: "" }); setModalRecursoAbierto(true); }}
          >
            <img src={buttonCirculo} alt="agregar" className="btn-flotante-icon" />
          </button>
        )}

        {/* Modal Agregar/Editar */}
        {modalRecursoAbierto && (
          <div className="modal-overlay" onClick={() => setModalRecursoAbierto(false)}>
            <div className="modal-card" style={{ maxWidth: "860px", width: "90vw" }} onClick={e => e.stopPropagation()}>
              <button className="modal-cerrar" onClick={() => setModalRecursoAbierto(false)}>✕</button>
              <div className="modal-header">
                <h2 className="modal-titulo">{recursoEditando?.id ? "Editar Recurso" : "Registrar Nuevo Recurso"}</h2>
              </div>
              <div className="modal-form" style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "10px" }}>
                <label className="detail-label">Título *</label>
                <input type="text" value={recursoEditando?.titulo || ""} onChange={e => setRecursoEditando({ ...recursoEditando, titulo: e.target.value })} className="modal-input" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label className="detail-label">Tipo *</label>
                    <select className="modal-input" value={recursoEditando?.tipo || "book"} onChange={e => setRecursoEditando({ ...recursoEditando, tipo: e.target.value })}>
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
                    <select className="modal-input" value={recursoEditando?.autor_id || ""} onChange={e => setRecursoEditando({ ...recursoEditando, autor_id: e.target.value ? Number(e.target.value) : "" })}>
                      <option value="">Desconocido...</option>
                      {metadata.authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="detail-label">Editorial</label>
                    <select className="modal-input" value={recursoEditando?.editorial_id || ""} onChange={e => setRecursoEditando({ ...recursoEditando, editorial_id: e.target.value ? Number(e.target.value) : "" })}>
                      <option value="">Desconocida...</option>
                      {metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="detail-label">Año</label>
                    <input type="number" value={recursoEditando?.ano_publicacion || ""} onChange={e => setRecursoEditando({ ...recursoEditando, ano_publicacion: Number(e.target.value) })} className="modal-input" />
                  </div>
                </div>
                {recursoEditando?.tipo === "book" && (
                  <div style={{ background: "#fffde7", padding: "15px", borderRadius: "5px", marginTop: "10px", marginBottom: "10px", border: "1px dashed #FFD400" }}>
                    <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata del Libro</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input type="text" placeholder="ISBN" className="modal-input" value={recursoEditando?.isbn || ""} onChange={e => setRecursoEditando({ ...recursoEditando, isbn: e.target.value })} />
                      <input type="number" placeholder="Edición" className="modal-input" value={recursoEditando?.edicion || ""} onChange={e => setRecursoEditando({ ...recursoEditando, edicion: Number(e.target.value) })} />
                      <textarea placeholder="Sinópsis..." className="modal-input" style={{ gridColumn: "span 2", minHeight: "60px" }} value={recursoEditando?.sinopsis || ""} onChange={e => setRecursoEditando({ ...recursoEditando, sinopsis: e.target.value })} />
                    </div>
                  </div>
                )}
                <label className="detail-label">Géneros</label>
                <div className="checkbox-group">
                  {metadata.categories.map(c => (
                    <label key={c.id}><input type="checkbox" checked={(recursoEditando?.generos_ids || []).includes(c.id)} onChange={e => toggleGenero(c.id, e.target.checked)} /> {c.name}</label>
                  ))}
                </div>
                <label className="detail-label">Lenguajes</label>
                <div className="checkbox-group">
                  {metadata.languages.map(l => (
                    <label key={l.id}><input type="checkbox" checked={(recursoEditando?.lenguajes_ids || []).includes(l.id)} onChange={e => toggleLenguaje(l.id, e.target.checked)} /> {l.name}</label>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer", fontWeight: "bold", background: "#f0f0f0", padding: "10px", borderRadius: "5px" }}>
                  <input type="checkbox" checked={recursoEditando?.disponible ?? true} onChange={e => setRecursoEditando({ ...recursoEditando, disponible: e.target.checked })} />
                  Marcar como Visible/Disponible al Público
                </label>
              </div>
              <div className="modal-botones" style={{ marginTop: "20px" }}>
                <button className="modal-cancelar" onClick={() => setModalRecursoAbierto(false)}>Cancelar</button>
                <button className="modal-confirmar" onClick={handleGuardarRecurso}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ejemplares */}
        {modalEjemplaresAbierto && recursoActivo && (
          <div className="modal-overlay" onClick={() => setModalEjemplaresAbierto(false)}>
            <div className="modal-card" style={{ maxWidth: "600px", width: "90vw" }} onClick={e => e.stopPropagation()}>
              <button className="modal-cerrar" onClick={() => setModalEjemplaresAbierto(false)}>✕</button>
              <div className="modal-header">
                <h2 className="modal-titulo">Ejemplares Físicos</h2>
              </div>
              <p style={{ color: "#666", margin: "-10px 0 10px" }}>{recursoActivo.titulo}</p>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", marginBottom: "15px", fontSize: "14px" }}>
                  <thead><tr style={{ borderBottom: "1px solid #ddd" }}><th>Barcode</th><th>Ubicación</th><th>Salud</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {ejemplares.length === 0 ? (
                      <tr><td colSpan="5" style={{ padding: "10px", textAlign: "center", color: "#888" }}>Sin ejemplares</td></tr>
                    ) : ejemplares.map(ej => (
                      <tr key={ej.barcode} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "6px 0" }}>{ej.barcode}</td>
                        <td>{ej.example_location_code}</td>
                        <td>{ej.example_health_state}</td>
                        <td>{ej.example_op_state}</td>
                        <td><button style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>🗑️</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ background: "#f9f9f9", padding: "15px", borderRadius: "5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input type="text" placeholder="Código de Barras *" className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.barcode} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, barcode: e.target.value })} />
                  <input type="text" placeholder="Ubicación *" className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.location_code} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, location_code: e.target.value })} />
                  <select className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.health_state} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, health_state: e.target.value })}>
                    <option value="good">Good</option><option value="damaged">Damaged</option><option value="incomplete">Incomplete</option><option value="lost">Lost</option>
                  </select>
                  <select className="modal-input" style={{ margin: 0 }} value={nuevoEjemplar.op_state} onChange={e => setNuevoEjemplar({ ...nuevoEjemplar, op_state: e.target.value })}>
                    <option value="available">Available</option><option value="on loan">On Loan</option><option value="reserved">Reserved</option>
                  </select>
                  <button style={{ gridColumn: "span 2", padding: "10px" }} className="modal-confirmar" onClick={handleCrearEjemplar}>Agregar Ejemplar</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Libros;