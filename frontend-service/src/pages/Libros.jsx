import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Home.css";
import duckIcon from "../assets/icons/duckIcon.svg";
import { bffGet, bffPost, bffPut, getToken } from "../api/bff";

function Libros() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";
  const isLib = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  const isAlumno = !hasManagementRole;

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
      setMsgPrestamo({ type: "success", text: `Préstamo solicitado correctamente (ID: ${res.loan_id}).` });
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
      alert("Por favor indique el Título y Tipo del recurso.");
      return;
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

  const alertStyle = (type) => ({
    padding: "12px 16px", borderRadius: "8px", marginBottom: "16px",
    background: type === "success" ? "#e8f5e9" : "#ffebee",
    color: type === "success" ? "#2e7d32" : "#c62828",
    border: `1px solid ${type === "success" ? "#a5d6a7" : "#ef9a9a"}`,
    fontWeight: 500
  });

  return (
    <div className="home-container">

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {sidebarOpen && (
          <div className="sidebar-menu">
            <div className={`sidebar-item ${location.pathname === '/home' ? 'active' : ''}`} onClick={() => navigate("/home")}>Inicio</div>
            {isAdmin && <div className={`sidebar-item ${location.pathname.includes('/usuarios') ? 'active' : ''}`} onClick={() => navigate("/usuarios")}>Usuarios</div>}
            <div className={`sidebar-item ${location.pathname.includes('/libros') ? 'active' : ''}`} onClick={() => navigate("/libros")}>Libros</div>
            {hasManagementRole && <div className={`sidebar-item ${location.pathname === '/prestamos' ? 'active' : ''}`} onClick={() => navigate("/prestamos")}>Prestamos</div>}
            {!hasManagementRole && <div className={`sidebar-item ${location.pathname === '/mis-prestamos' ? 'active' : ''}`} onClick={() => navigate("/mis-prestamos")}>Mis Prestamos</div>}
            {!hasManagementRole && <div className={`sidebar-item ${location.pathname === '/devoluciones' ? 'active' : ''}`} onClick={() => navigate("/devoluciones")}>Devoluciones</div>}
            {!hasManagementRole && <div className={`sidebar-item ${location.pathname === '/soporte' ? 'active' : ''}`} onClick={() => navigate("/soporte")}>Soporte</div>}
          </div>
        )}
      </div>

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

        {/* Contenido */}
        <div style={{ padding: "24px 32px" }}>

          {/* Búsqueda */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>🔍</span>
              <input
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                placeholder="Buscar libros, géneros, autores..."
                style={{ width: "100%", padding: "12px 14px 12px 40px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
              />
              {busqueda && (
                <button onClick={() => { setBusqueda(""); setPage(1); }} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "1.1rem" }}>✕</button>
              )}
            </div>
          </div>

          {msgPrestamo && (
            <div style={alertStyle(msgPrestamo.type)}>
              {msgPrestamo.text}
              <button onClick={() => setMsgPrestamo(null)} style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>
          )}

          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

            {/* Lista de libros */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Cargando...</div>
              ) : recursos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#999", background: "#fafafa", borderRadius: "8px", border: "1px solid #eee" }}>No se encontraron recursos.</div>
              ) : (
                recursos.map(recurso => (
                  <div
                    key={recurso.id}
                    style={{ display: "flex", alignItems: "center", gap: "16px", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "14px 16px", cursor: "pointer", transition: "box-shadow 0.2s" }}
                    onClick={() => navigate(`/libros/${recurso.id}`)}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    {/* Portada */}
                    <div style={{ width: "52px", height: "68px", background: "linear-gradient(135deg, #1a1a2e, #2d2d5e)", borderRadius: "4px", flexShrink: 0 }} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "3px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "bold", fontSize: "0.95rem", color: "#1a1a1a" }}>{recurso.titulo}</span>
                        <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: "bold", background: recurso.disponible ? "#e8f5e9" : "#ffebee", color: recurso.disponible ? "#2e7d32" : "#c62828", border: `1px solid ${recurso.disponible ? "#a5d6a7" : "#ef9a9a"}`, whiteSpace: "nowrap" }}>
                          {recurso.disponible ? "Disponible" : "No disponible"}
                        </span>
                      </div>
                      <p style={{ color: "#555", fontSize: "0.82rem", margin: "0 0 2px" }}>{recurso.autor || "Autor Desconocido"}</p>
                      <p style={{ color: "#888", fontSize: "0.78rem", margin: 0 }}>{recurso.editorial || ""}{recurso.genero ? ` · ${recurso.genero}` : ""}</p>
                    </div>

                    {/* Botones */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      {isAlumno && recurso.disponible && (
                        <button
                          onClick={e => handleSolicitarPrestamo(recurso, e)}
                          disabled={loadingPrestamo}
                          style={{ padding: "6px 14px", background: "#FFD400", color: "#1a1a1a", border: "1px solid #e0c000", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem", whiteSpace: "nowrap" }}
                        >
                          Solicitar Préstamo
                        </button>
                      )}
                      {hasManagementRole && (
                        <button
                          onClick={e => { e.stopPropagation(); setRecursoEditando({ ...recurso }); setModalRecursoAbierto(true); }}
                          style={{ padding: "6px 14px", background: "white", color: "#1a1a1a", border: "1px solid #FFD400", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem" }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/libros/${recurso.id}`); }}
                        style={{ padding: "6px 14px", background: "white", color: "#555", border: "1px solid #e0e0e0", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "0.82rem" }}
                      >
                        Busqueda
                      </button>
                    </div>
                  </div>
                ))
              )}

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button>
                  <span>Página {page} de {totalPages}</span>
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
                </div>
              )}
            </div>

            {/* Panel filtros */}
            <div style={{ width: "200px", flexShrink: 0, background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "18px" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "14px", textAlign: "center" }}>Filtrar Libros</h3>

              {[
                { label: "Idioma", key: "lenguaje", options: metadata.languages.map(l => l.name) },
                { label: "Categoría", key: "categoria", options: metadata.categories.map(c => c.name) },
                { label: "Autor", key: "autor", options: metadata.authors.map(a => a.name) },
                { label: "Editorial", key: "editorial", options: metadata.publishers.map(p => p.name) },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: "10px" }}>
                  <select
                    value={filtros[f.key]}
                    onChange={e => { setFiltros(prev => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.85rem", background: "#fafafa" }}
                  >
                    <option value="">{f.label}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              <div style={{ marginBottom: "10px" }}>
                <select
                  value={filtros.anio}
                  onChange={e => { setFiltros(prev => ({ ...prev, anio: e.target.value })); setPage(1); }}
                  style={{ width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.85rem", background: "#fafafa" }}
                >
                  <option value="">Año</option>
                  {[2024,2023,2022,2021,2020,2019,2018,2015,2010,2005,2000].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {Object.values(filtros).some(v => v) && (
                <button
                  onClick={() => { setFiltros({ lenguaje: "", categoria: "", autor: "", editorial: "", anio: "" }); setPage(1); }}
                  style={{ width: "100%", padding: "7px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer", fontSize: "0.82rem", color: "#555" }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón + flotante */}
      {hasManagementRole && (
        <button
          onClick={() => { setRecursoEditando({ titulo: "", tipo: "book", disponible: true, autor_id: "", editorial_id: "", generos_ids: [], lenguajes_ids: [], isbn: "", edicion: "", sinopsis: "", costo: 0, ano_publicacion: "" }); setModalRecursoAbierto(true); }}
          style={{ position: "fixed", bottom: "32px", right: "32px", width: "56px", height: "56px", borderRadius: "50%", background: "#FFD400", border: "none", fontSize: "28px", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          +
        </button>
      )}

      {/* Modal Editar/Agregar Recurso */}
      {modalRecursoAbierto && (
        <div className="modal-overlay" onClick={() => setModalRecursoAbierto(false)}>
          <div className="modal-card" style={{ maxWidth: "860px", width: "90vw" }} onClick={e => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => setModalRecursoAbierto(false)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">{recursoEditando?.id ? "Editar Información del Recurso" : "Registrar Nuevo Recurso"}</h2>
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
                <div style={{ background: "#fffde7", padding: "15px", borderRadius: "5px", marginTop: "10px", marginBottom: "15px", border: "1px dashed #FFD400" }}>
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
              <button className="modal-confirmar" onClick={handleGuardarRecurso}>Guardar Cambios BD</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ejemplares */}
      {modalEjemplaresAbierto && recursoActivo && (
        <div className="modal-overlay" onClick={() => setModalEjemplaresAbierto(false)}>
          <div className="modal-card" style={{ maxWidth: "600px" }} onClick={e => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => setModalEjemplaresAbierto(false)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">Ejemplares Físicos</h2>
              <p style={{ margin: 0, color: "#666" }}>{recursoActivo.titulo}</p>
            </div>
            <div className="modal-form" style={{ maxHeight: "350px", overflowY: "auto" }}>
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
  );
}

export default Libros;