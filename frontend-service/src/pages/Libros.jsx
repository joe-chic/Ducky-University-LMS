import { useSidebar } from "../hooks/useSidebar";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Usuarios.css";
import searchIcon from "../assets/icons/searchIcon.svg";
import updateIcon from "../assets/icons/updateIcon.svg";
import buttonCirculo from "../assets/icons/Button-circulo.svg";
import noIcon from "../assets/icons/icon-no.png";
import checkIcon from "../assets/icons/icon-check.png";
import ejemplaresIcon from "../assets/icons/icon-ejemplares.png";
import searchPngIcon from "../assets/icons/icon-search.png";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { bffGet, bffPost, bffPut, getToken } from "../api/bff";

// ── Searchable dropdown filter ────────────────────────────────────────────────
function SearchableSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );
  const displayLabel = value || label;

  return (
    <div ref={ref} style={{ position: "relative", marginTop: "10px" }}>
      <button
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        style={{
          width: "100%", textAlign: "left", padding: "5px 8px",
          background: value ? "#1a1a2e" : "#F8F9FA",
          color: value ? "#FFD400" : "#212529",
          fontSize: "13px", border: "1px solid #212529", borderRadius: "5px",
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}
      >
        <span style={{ textTransform: "capitalize" }}>{displayLabel.replace(/_/g, " ")}</span>
        <span style={{ fontSize: "10px", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: "#fff", border: "1px solid #ddd", borderRadius: "5px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: "200px", overflowY: "auto"
        }}>
          <input
            autoFocus
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "6px 8px", border: "none",
              borderBottom: "1px solid #eee", outline: "none", fontSize: "12px",
              boxSizing: "border-box"
            }}
          />
          {value && (
            <div
              onClick={() => { onChange(""); setOpen(false); }}
              style={{ padding: "6px 10px", color: "#999", fontSize: "12px", cursor: "pointer", fontStyle: "italic" }}
            >
              — Limpiar selección —
            </div>
          )}
          {filtered.length === 0 && (
            <div style={{ padding: "8px 10px", color: "#aaa", fontSize: "12px" }}>Sin resultados</div>
          )}
          {filtered.map(o => (
            <div
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                padding: "6px 10px", fontSize: "13px", cursor: "pointer",
                background: value === o ? "#fff8e1" : "transparent",
                fontWeight: value === o ? 600 : 400,
                textTransform: "capitalize"
              }}
            >
              {o.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Libros() {
  const navigate = useNavigate();

  const userRole = localStorage.getItem("ducky_role");
  const campusId = Number(localStorage.getItem("ducky_campus_id") || 0);
  const isAdmin = userRole === "Administrador";
  const isLib = userRole === "Bibliotecario";
  const hasManagementRole = isAdmin || isLib;
  const isAlumno = !hasManagementRole;

  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const [recursos, setRecursos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [metadata, setMetadata] = useState({ authors: [], publishers: [], categories: [], languages: [] });
  const [filtros, setFiltros] = useState({ lenguaje: "", categoria: "", autor: "", editorial: "", anio: "", tipo: "" });

  const [msgPrestamo, setMsgPrestamo] = useState(null);
  const [loadingPrestamo, setLoadingPrestamo] = useState(false);

  const [modalRecursoAbierto, setModalRecursoAbierto] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [modalEjemplaresAbierto, setModalEjemplaresAbierto] = useState(false);
  const [recursoActivo, setRecursoActivo] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [nuevoEjemplar, setNuevoEjemplar] = useState({ barcode: "", location_code: "", health_state: "good", op_state: "available" });
  const [formErrors, setFormErrors] = useState({});
  const errorInputStyle = { border: "1.5px solid #d32f2f", background: "#fff5f5" };
  const errorTextStyle = { color: "#d32f2f", fontSize: "12px", marginTop: "4px" };

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
      if (filtros.lenguaje)  params.lenguaje  = filtros.lenguaje;
      if (filtros.categoria) params.categoria = filtros.categoria;
      if (filtros.autor)     params.autor     = filtros.autor;
      if (filtros.editorial) params.editorial = filtros.editorial;
      if (filtros.anio)      params.anio      = filtros.anio;
      if (filtros.tipo)      params.tipo      = filtros.tipo;
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
      const raw = await bffGet(`/api/resources/${recurso.id}/examples`, { token });
      const list = Array.isArray(raw) ? raw : [];
      const examples = hasManagementRole ? list : list.filter((ex) => ex.example_op_state !== "disabled");
      const available = examples.find((ex) => ex.example_op_state === "available");
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
    } catch {
      alert(`Error al ${accion} el recurso`);
    }
  };

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
        await bffPost("/api/resources", recursoEditando, { token });
      }
      setModalRecursoAbierto(false);
      fetchRecursos();
    } catch (err) {
      alert(err?.message || "Error al guardar el recurso");
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

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Contenido — mismo layout que Usuarios */}
        <div className="usuarios-content">

          <div className="usuarios-main">

            {/* Barra de búsqueda */}
            <div style={{ display: "flex", alignItems: "center", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "0 16px", marginBottom: "20px" }}>
              <img src={searchIcon} alt="buscar" style={{ width: "18px", height: "18px", marginRight: "10px", opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Buscar libros, géneros, autores..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                style={{ flex: 1, padding: "12px 0", border: "none", outline: "none", fontSize: "0.95rem", background: "transparent" }}
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
                recursos.reduce((acc, recurso, index) => {
                  const currentLetter = (recurso.titulo?.[0] || "#").toUpperCase();
                  const prevLetter = index > 0 ? (recursos[index - 1].titulo?.[0] || "#").toUpperCase() : null;
                  
                  if (!busqueda.trim() && currentLetter !== prevLetter) {
                    acc.push(
                      <div key={`letter-${currentLetter}`} style={{ width: "100%", margin: "20px 0 10px 0", padding: "0 10px" }}>
                        <h2 style={{ margin: 0, color: "#b8860b", borderBottom: "2px solid #e0e0e0", paddingBottom: "5px", fontSize: "1.4rem" }}>
                          {currentLetter}
                        </h2>
                      </div>
                    );
                  }
                  
                  acc.push(
                  <div
                    className="usuario-card"
                    key={recurso.id}
                    onClick={() => navigate(`/libros/${recurso.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Portada */}
                    {recurso.portada ? (
                      <img src={recurso.portada} alt="portada" style={{ width: "56px", height: "72px", objectFit: "cover", borderRadius: "6px", border: "1px solid #212529", flexShrink: 0 }} />
                    ) : (
                      <div className="usuario-avatar" style={{ width: "56px", height: "72px", background: "linear-gradient(135deg, #1a1a2e, #2d2d5e)", borderRadius: "6px", border: "1px solid #212529", flexShrink: 0 }} />
                    )}

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

                      {isAlumno && recurso.disponible && ["e_book", "digital_article"].includes(recurso.tipo) && (
                        <button className="btn-action" onClick={e => handleSolicitarPrestamo(recurso, e)} disabled={loadingPrestamo}>
                          📥 Descargar Recurso
                        </button>
                      )}

                      {hasManagementRole && (
                        <>
                          <button className="btn-action" onClick={e => { e.stopPropagation(); setRecursoEditando({ ...recurso }); setModalRecursoAbierto(true); }}>
                            <img src={updateIcon} alt="editar" className="btn-icon" /> Editar
                          </button>
                          <button className="btn-action" onClick={e => handleToggleEstado(recurso, e)}>
                            <img src={recurso.disponible ? noIcon : checkIcon} alt={recurso.disponible ? "deshabilitar" : "habilitar"} className="btn-icon btn-icon--toggle" />
                            {recurso.disponible ? "Deshabilitar" : "Habilitar"}
                          </button>
                          {recurso.tipo === "book" && (
                            <button className="btn-action" onClick={e => abrirEjemplares(recurso, e)}>
                              <img src={ejemplaresIcon} alt="ejemplares" className="btn-icon" /> Ejemplares
                            </button>
                          )}
                        </>
                      )}

                      <button className="btn-action" onClick={e => { e.stopPropagation(); navigate(`/libros/${recurso.id}`); }}>
                        <img src={searchPngIcon} alt="buscar" className="btn-icon" /> Busqueda
                      </button>
                    </div>
                  </div>
                  );
                  return acc;
                }, [])
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

          {/* Panel filtros */}
          <div className="permisos-panel">
            <h3 className="permisos-title">Filtrar Recursos</h3>
            <hr />

            <SearchableSelect
              label="Idioma"
              value={filtros.lenguaje}
              onChange={v => { setFiltros(p => ({ ...p, lenguaje: v })); setPage(1); }}
              options={metadata.languages.map(l => l.name)}
            />
            <SearchableSelect
              label="Categoría"
              value={filtros.categoria}
              onChange={v => { setFiltros(p => ({ ...p, categoria: v })); setPage(1); }}
              options={metadata.categories.map(c => c.name)}
            />
            <SearchableSelect
              label="Autor"
              value={filtros.autor}
              onChange={v => { setFiltros(p => ({ ...p, autor: v })); setPage(1); }}
              options={metadata.authors.map(a => a.name)}
            />
            <SearchableSelect
              label="Editorial"
              value={filtros.editorial}
              onChange={v => { setFiltros(p => ({ ...p, editorial: v })); setPage(1); }}
              options={metadata.publishers.map(p => p.name)}
            />
            <SearchableSelect
              label="Tipo de Recurso"
              value={filtros.tipo}
              onChange={v => { setFiltros(p => ({ ...p, tipo: v })); setPage(1); }}
              options={[
                "book", "e_book", "digital_article", "e_journal",
                "thesis_dissertation", "reference", "video", "audio_music",
                "conference_proceeding", "dataset", "software", "map", "manuscript"
              ]}
            />
            <SearchableSelect
              label="Año"
              value={filtros.anio}
              onChange={v => { setFiltros(p => ({ ...p, anio: v })); setPage(1); }}
              options={[2024,2023,2022,2021,2020,2019,2018,2015,2010,2005,2000].map(String)}
            />

            {Object.values(filtros).some(v => v) && (
              <div style={{ marginTop: "10px" }}>
                <button
                  onClick={() => { setFiltros({ lenguaje: "", categoria: "", autor: "", editorial: "", anio: "", tipo: "" }); setPage(1); }}
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
            onClick={() => {
              setFormErrors({});
              setRecursoEditando({
                titulo: "",
                tipo: "book",
                disponible: true,
                autor_id: "",
                nuevo_autor_nombre: "",
                nuevo_autor_apellido: "",
                editorial_id: "",
                nueva_editorial: "",
                lenguaje_principal_id: "",
                generos_ids: [],
                lenguajes_ids: [],
                isbn: "",
                edicion: "",
                sinopsis: "",
                costo: 0,
                ano_publicacion: "",
                // Publicación periódica (e-journal / magazines)
                journal_issn: "",
                journal_frequency: "monthly",
                journal_peer_reviewed: false,
                // Audiovisual
                audiovisual_minutes: "",
                // Mapa
                maps_scale: "",
                maps_projection_type: "",
                maps_type: "",
                portada: null,
              });
              setModalRecursoAbierto(true);
            }}
          >
            <img src={buttonCirculo} alt="agregar" className="btn-flotante-icon" />
          </button>
        )}

        {/* Modal Agregar/Editar */}
        {modalRecursoAbierto && (
          <div className="modal-overlay" onClick={() => setModalRecursoAbierto(false)}>
            <div className="modal-card" style={{ maxWidth: "860px", width: "90vw" }} onClick={e => e.stopPropagation()}>
              <button className="modal-cerrar" onClick={() => { setModalRecursoAbierto(false); setFormErrors({}); }}>✕</button>
              <div className="modal-header">
                <h2 className="modal-titulo">{recursoEditando?.id ? "Editar Recurso" : "Registrar Nuevo Recurso"}</h2>
              </div>
              <div className="modal-form" style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: "10px" }}>

                {/* Portada */}
                <div className="modal-foto-upload">
                  <input
                    type="file"
                    accept="image/*"
                    id="portada-upload"
                    style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) setRecursoEditando({ ...recursoEditando, portada: URL.createObjectURL(file), portadaFile: file });
                    }}
                  />
                  <label htmlFor="portada-upload" className="modal-foto-label">
                    {recursoEditando?.portada ? (
                      <img
                        src={recursoEditando.portada}
                        alt="portada"
                        style={{ width: "90px", height: "120px", objectFit: "cover", borderRadius: "6px", border: "3px solid #FFD400" }}
                      />
                    ) : (
                      <div style={{ width: "90px", height: "120px", background: "linear-gradient(135deg, #1a1a2e, #2d2d5e)", borderRadius: "6px", border: "3px solid #FFD400", display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: "11px", textAlign: "center", padding: "8px" }}>
                        Sin portada
                      </div>
                    )}
                    <span className="modal-foto-texto">📷 Subir portada</span>
                  </label>
                </div>

                <label className="detail-label">Título *</label>
                <input type="text" value={recursoEditando?.titulo || ""} onChange={e => { setRecursoEditando({ ...recursoEditando, titulo: e.target.value }); setFormErrors(prev => ({ ...prev, titulo: null })); }} className="modal-input" style={formErrors.titulo ? errorInputStyle : undefined} />
                {formErrors.titulo && <div style={errorTextStyle}>{formErrors.titulo}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                  <div>
                    <label className="detail-label">Tipo *</label>
                    <select className="modal-input" value={recursoEditando?.tipo || "book"} onChange={e => { setRecursoEditando({ ...recursoEditando, tipo: e.target.value }); setFormErrors(prev => ({ ...prev, tipo: null })); }} style={formErrors.tipo ? errorInputStyle : undefined}>
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
                    <select
                      className="modal-input"
                      value={recursoEditando?.autor_id || ""}
                      onChange={e => setRecursoEditando({
                        ...recursoEditando,
                        autor_id: e.target.value === "nuevo" ? "nuevo" : (e.target.value ? Number(e.target.value) : ""),
                      })}
                    >
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
                            value={recursoEditando?.nuevo_autor_nombre || ""}
                            onChange={e => { setRecursoEditando({ ...recursoEditando, nuevo_autor_nombre: e.target.value }); setFormErrors(prev => ({ ...prev, nuevo_autor_nombre: null })); }}
                            style={formErrors.nuevo_autor_nombre ? errorInputStyle : undefined}
                          />
                          {formErrors.nuevo_autor_nombre && <div style={errorTextStyle}>{formErrors.nuevo_autor_nombre}</div>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Apellido(s) del autor"
                            className="modal-input"
                            value={recursoEditando?.nuevo_autor_apellido || ""}
                            onChange={e => { setRecursoEditando({ ...recursoEditando, nuevo_autor_apellido: e.target.value }); setFormErrors(prev => ({ ...prev, nuevo_autor_apellido: null })); }}
                            style={formErrors.nuevo_autor_apellido ? errorInputStyle : undefined}
                          />
                          {formErrors.nuevo_autor_apellido && <div style={errorTextStyle}>{formErrors.nuevo_autor_apellido}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="detail-label">Editorial</label>
                    <select
                      className="modal-input"
                      value={recursoEditando?.editorial_id || ""}
                      onChange={e => setRecursoEditando({
                        ...recursoEditando,
                        editorial_id: e.target.value === "nuevo" ? "nuevo" : (e.target.value ? Number(e.target.value) : ""),
                      })}
                    >
                      <option value="">Desconocida...</option>
                      <option value="nuevo">➕ Registrar Nueva Editorial...</option>
                      {metadata.publishers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {recursoEditando?.editorial_id === "nuevo" && (
                      <input
                        type="text"
                        placeholder="Nombre de la editorial"
                        className="modal-input"
                        value={recursoEditando?.nueva_editorial || ""}
                        onChange={e => { setRecursoEditando({ ...recursoEditando, nueva_editorial: e.target.value }); setFormErrors(prev => ({ ...prev, nueva_editorial: null })); }}
                        style={{ marginTop: "5px", ...(formErrors.nueva_editorial ? errorInputStyle : {}) }}
                      />
                    )}
                    {formErrors.nueva_editorial && <div style={errorTextStyle}>{formErrors.nueva_editorial}</div>}
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
                      <input type="text" placeholder="ISBN" className="modal-input" value={recursoEditando?.isbn || ""} onChange={e => { setRecursoEditando({ ...recursoEditando, isbn: e.target.value }); setFormErrors(prev => ({ ...prev, isbn: null })); }} style={formErrors.isbn ? errorInputStyle : undefined} />
                      {formErrors.isbn && <div style={errorTextStyle}>{formErrors.isbn}</div>}
                      <input type="number" placeholder="Edición" className="modal-input" value={recursoEditando?.edicion || ""} onChange={e => setRecursoEditando({ ...recursoEditando, edicion: Number(e.target.value) })} />
                      <textarea placeholder="Sinópsis..." className="modal-input" style={{ gridColumn: "span 2", minHeight: "60px" }} value={recursoEditando?.sinopsis || ""} onChange={e => setRecursoEditando({ ...recursoEditando, sinopsis: e.target.value })} />
                    </div>
                  </div>
                )}

                <label className="detail-label">Lenguaje Principal (Primario)</label>
                <select
                  className="modal-input"
                  value={recursoEditando?.lenguaje_principal_id || ""}
                  onChange={e => setRecursoEditando({ ...recursoEditando, lenguaje_principal_id: e.target.value ? Number(e.target.value) : "" })}
                >
                  <option value="">Desconocido / Ninguno</option>
                  {metadata.languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>

                {['e_journal', 'e_magazine', 'journal_magazine'].includes(recursoEditando?.tipo) && (
                  <div style={{ background: "#e8eaf6", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #5c6bc0" }}>
                    <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Publicación Periódica</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="ISSN (8 caracteres)"
                        className="modal-input"
                        value={recursoEditando?.journal_issn || ""}
                        onChange={e => { setRecursoEditando({ ...recursoEditando, journal_issn: e.target.value }); setFormErrors(prev => ({ ...prev, journal_issn: null })); }}
                        style={formErrors.journal_issn ? errorInputStyle : undefined}
                      />
                      {formErrors.journal_issn && <div style={errorTextStyle}>{formErrors.journal_issn}</div>}
                      <select
                        className="modal-input"
                        value={recursoEditando?.journal_frequency || "monthly"}
                        onChange={e => setRecursoEditando({ ...recursoEditando, journal_frequency: e.target.value })}
                      >
                        <option value="daily">Diario</option>
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annually">Anual</option>
                      </select>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer", fontSize: "14px" }}>
                      <input
                        type="checkbox"
                        checked={recursoEditando?.journal_peer_reviewed ?? false}
                        onChange={e => setRecursoEditando({ ...recursoEditando, journal_peer_reviewed: e.target.checked })}
                      />
                      ¿Es revisado por pares? (Peer Reviewed)
                    </label>
                  </div>
                )}

                {['video', 'audio_music'].includes(recursoEditando?.tipo) && (
                  <div style={{ background: "#f3e5f5", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ab47bc" }}>
                    <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata Audiovisual</h4>
                    <input
                      type="number"
                      min="1"
                      placeholder="Duración (Minutos)"
                      className="modal-input"
                      value={recursoEditando?.audiovisual_minutes || ""}
                      onChange={e => { setRecursoEditando({ ...recursoEditando, audiovisual_minutes: Number(e.target.value) }); setFormErrors(prev => ({ ...prev, audiovisual_minutes: null })); }}
                      style={formErrors.audiovisual_minutes ? errorInputStyle : undefined}
                    />
                    {formErrors.audiovisual_minutes && <div style={errorTextStyle}>{formErrors.audiovisual_minutes}</div>}
                  </div>
                )}

                {recursoEditando?.tipo === 'map' && (
                  <div style={{ background: "#fff3e0", padding: "15px", borderRadius: "5px", marginBottom: "15px", marginTop: "10px", border: "1px dashed #ff9800" }}>
                    <h4 style={{ marginBottom: "10px", color: "#666" }}>Metadata de Mapa</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Escala (Ej: 1:1000)"
                        className="modal-input"
                        value={recursoEditando?.maps_scale || ""}
                        onChange={e => setRecursoEditando({ ...recursoEditando, maps_scale: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Tipo de proyección"
                        className="modal-input"
                        value={recursoEditando?.maps_projection_type || ""}
                        onChange={e => setRecursoEditando({ ...recursoEditando, maps_projection_type: (e.target.value || "").toLowerCase() })}
                      />
                      <select
                        className="modal-input"
                        style={{ gridColumn: "span 2" }}
                        value={recursoEditando?.maps_type || ""}
                        onChange={e => setRecursoEditando({ ...recursoEditando, maps_type: e.target.value })}
                      >
                        <option value="">Tipo de mapa (opcional)</option>
                        <option value="topograhpic">topograhpic</option>
                        <option value="thematic">thematic</option>
                        <option value="political">political</option>
                        <option value="road">road</option>
                        <option value="nautical">nautical</option>
                        <option value="aeronautical">aeronautical</option>
                        <option value="cadastral">cadastral</option>
                        <option value="satellite">satellite</option>
                        <option value="other">other</option>
                      </select>
                    </div>
                  </div>
                )}
                <label className="detail-label">Géneros</label>
                <div className="checkbox-group">
                  {metadata.categories.map(c => (
                    <label key={c.id}><input type="checkbox" checked={(recursoEditando?.generos_ids || []).includes(c.id)} onChange={e => toggleGenero(c.id, e.target.checked)} /> {c.name}</label>
                  ))}
                </div>
                <label className="detail-label">Lenguajes de Apoyo</label>
                <div className="checkbox-group">
                  {metadata.languages.map(l => (
                    <label key={l.id}><input type="checkbox" checked={(recursoEditando?.lenguajes_ids || []).includes(l.id)} onChange={e => toggleLenguaje(l.id, e.target.checked)} /> {l.name}</label>
                  ))}
                </div>
              </div>
              <div className="modal-botones" style={{ marginTop: "20px" }}>
                <button className="modal-cancelar" onClick={() => { setModalRecursoAbierto(false); setFormErrors({}); }}>Cancelar</button>
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