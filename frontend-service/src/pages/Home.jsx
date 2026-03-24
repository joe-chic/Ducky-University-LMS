import { useEffect, useState } from "react";
import "./Home.css";
import landingImage from "../assets/images/landingImage.png";
import duckIcon from "../assets/icons/duckIcon.svg";
import duckIconWhite from "../assets/icons/duckIconWhite.svg";
import { useNavigate } from "react-router-dom";
import { bffGet, bffPut, bffDelete, bffPost, getToken } from "../api/bff";

function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const [recursos, setRecursos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [recursoEditando, setRecursoEditando] = useState(null);
  const [modalRecursoAbierto, setModalRecursoAbierto] = useState(false);
  const userRole = localStorage.getItem("ducky_role");
  const isAdmin = userRole === 'Administrador';
  const isLib = userRole === 'Bibliotecario';
  const isAdminOrLib = isAdmin || isLib;
  
  // Ejemplares físicos
  const [modalEjemplaresAbierto, setModalEjemplaresAbierto] = useState(false);
  const [recursoActivo, setRecursoActivo] = useState(null);
  const [ejemplares, setEjemplares] = useState([]);
  const [nuevoEjemplar, setNuevoEjemplar] = useState({ barcode: "", location_code: "", health_state: "good", op_state: "available" });

  const fetchRecursos = async (cancelToken) => {
    setLoading(true);
    try {
      const token = getToken();
      const data = await bffGet("/api/resources", { token, params: { search: busqueda, pageSize: 50 } });
      if (!cancelToken.cancelled) setRecursos(data.items || []);
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
  }, [busqueda]);

  const handleLogout = () => {
    localStorage.removeItem("ducky_token");
    navigate("/");
  };

  const handleGuardarRecurso = async () => {
    if (!recursoEditando || !recursoEditando.titulo || !recursoEditando.tipo) {
        alert("Por favor indique el Título y Tipo del recurso.");
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
      fetchRecursos({cancelled: false});
    } catch (err) {
      alert("Error al guardar el recurso");
    }
  };

  const handleToggleEstadoRecurso = async (recurso) => {
    const accion = recurso.disponible ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que deseas ${accion} este recurso?`)) return;
    try {
      const token = getToken();
      await bffPut(`/api/resources/${recurso.id}`, {
        ...recurso,
        disponible: !recurso.disponible
      }, { token });
      setRecursos(prev => prev.map(r => r.id === recurso.id ? { ...r, disponible: !recurso.disponible } : r));
    } catch (err) {
      alert(`Error al ${accion} el recurso`);
    }
  };

  const abrirEjemplares = async (recurso) => {
      setRecursoActivo(recurso);
      setModalEjemplaresAbierto(true);
      try {
        const token = getToken();
        const data = await bffGet(`/api/resources/${recurso.id}/examples`, { token });
        setEjemplares(data || []);
      } catch(err) {
        alert("Error cargando ejemplares");
      }
  };

  const handleCrearEjemplar = async () => {
      if(!nuevoEjemplar.barcode || !nuevoEjemplar.location_code) {
          alert("Barcode y Location code son obligatorios."); return;
      }
      try {
        const token = getToken();
        await bffPost(`/api/resources/${recursoActivo.id}/examples`, nuevoEjemplar, { token });
        setEjemplares([...ejemplares, { ...nuevoEjemplar, example_health_state: nuevoEjemplar.health_state, example_op_state: nuevoEjemplar.op_state, example_location_code: nuevoEjemplar.location_code }]);
        setNuevoEjemplar({ barcode: "", location_code: "", health_state: "good", op_state: "available" });
      } catch(err) {
          alert("Error agregando ejemplar");
      }
  };

  const handleEliminarEjemplar = async (barcode) => {
      if(!window.confirm("¿Eliminar ejemplar?")) return;
      try {
        const token = getToken();
        await bffDelete(`/api/resources/${recursoActivo.id}/examples/${barcode}`, { token });
        setEjemplares(prev => prev.filter(e => e.barcode !== barcode));
      } catch(err) {
        alert("Error eliminando ejemplar");
      }
  }

  return (
    <div className="home-container">

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {sidebarOpen ? (
          <>
            <div className="sidebar-logo">
              <img src={duckIconWhite} alt="Ducky" className="sidebar-duck-icon" />
              <div className="sidebar-logo-text">
                <span className="sidebar-ducky">Ducky</span>
                <span className="sidebar-university">University</span>
              </div>
              <button className="sidebar-arrow" onClick={() => setSidebarOpen(false)}>◀</button>
            </div>
            <div className="sidebar-menu">
              <div className="sidebar-item" onClick={() => navigate("/home")}>Inicio</div>
              {isAdmin && <div className="sidebar-item" onClick={() => navigate("/usuarios")}>Usuarios</div>}
              {isAdminOrLib && <div className="sidebar-item active" onClick={() => navigate("/libros")}>Recursos</div>}
            </div>
          </>
        ) : (
          <div className="sidebar-collapsed-content">
            <img src={duckIconWhite} alt="Ducky" className="sidebar-duck-icon-collapsed" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="main-content">

        {/* Navbar */}
        <nav className="navbar">
        <div className="navbar-left">
            {!sidebarOpen && (
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            )}
            {!sidebarOpen && (
            <div className="navbar-logo">
                <img src={duckIcon} alt="Ducky" className="navbar-duck-icon" />
                <div className="navbar-logo-text">
                <span className="navbar-ducky">Ducky</span>
                <span className="navbar-university">University</span>
                </div>
            </div>
            )}
        </div>
        <div className="navbar-right">
            <span style={{cursor: "pointer"}} onClick={() => alert("Próximamente")}>Soporte</span>
            <span style={{cursor: "pointer"}} onClick={() => alert("Próximamente")}>Notificaciones 🔔</span>
            <div style={{ position: "relative", cursor: "pointer", display: "inline-block" }} onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}>
              <span>Usuario 👤</span>
              {menuUsuarioAbierto && (
                <div style={{ position: "absolute", top: "100%", right: 0, backgroundColor: "#fff", color: "#333", padding: "10px", borderRadius: "4px", boxShadow: "0 2px 5px rgba(0,0,0,0.2)", zIndex: 10, minWidth: "120px" }}>
                  <button onClick={handleLogout} style={{ border: "none", background: "none", cursor: "pointer", color: "red", padding: "5px", width: "100%", textAlign: "left" }}>Cerrar sesión</button>
                </div>
              )}
            </div>
        </div>
        </nav>

        {/* Hero */}
        <div className="hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${landingImage})` }}>
          <h1>Biblioteca de Recursos</h1>
        </div>

        {/* Recursos */}
        <div style={{ padding: "0 60px" }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", marginBottom: "20px"}}>
                <h2 className="section-title" style={{margin: 0}}>Recursos Registrados</h2>
                {isAdminOrLib && (
                <button className="btn-action" style={{backgroundColor: "#4CAF50", color: "white"}} onClick={() => { setRecursoEditando({ titulo: "", tipo: "book", disponible: true }); setModalRecursoAbierto(true); }}>
                    ➕ Agregar Recurso
                </button>
                )}
            </div>

            <div className="books-search" style={{margin: "0 0 30px 0"}}>
            <input
                className="search-input"
                style={{width: "100%"}}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar recursos ..."
            />
            </div>

            <div className="books-grid" style={{margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "25px"}}>
            {loading ? (
            <div> Cargando...</div>
            ) : (
            recursos.map((recurso) => (
                <div className="book-card" key={recurso.id}>
                <div className="book-card-top">
                <span className="badge-disponible" style={{backgroundColor: recurso.disponible ? "#2E8B57" : "#aa0000"}}>{recurso.disponible ? "Disponible" : "No disponible"}</span>
                </div>
                <div className="book-info">
                    <div className="book-cover">📦</div>
                    <div className="book-details">
                    <p className="book-title">{recurso.titulo}</p>
                    <p className="book-autor" style={{textTransform: "capitalize", fontWeight: "bold"}}>{recurso.tipo.replace('_', ' ')}</p>
                    <p className="book-editorial">{recurso.editorial || "Sin editorial"}</p>
                    <p className="book-genero">{recurso.ano_publicacion ? `Año: ${recurso.ano_publicacion}` : ""}</p>
                    </div>
                </div>
                {isAdminOrLib && (
                <div className="book-actions">
                    <button className="btn-action" onClick={() => { setRecursoEditando({ ...recurso }); setModalRecursoAbierto(true); }}>✏️ Editar</button>
                    <button className="btn-action" onClick={() => handleToggleEstadoRecurso(recurso)}>
                    {recurso.disponible ? "🚫 Deshabilitar" : "✅ Habilitar"}
                    </button>
                    {recurso.tipo === 'book' && (
                        <button className="btn-action" style={{border: "1px solid #2196F3"}} onClick={() => abrirEjemplares(recurso)}>📚 Ejemplares</button>
                    )}
                </div>
                )}
                </div>
            ))
            )}
            </div>

            <h2 className="ver-mas" style={{marginTop: "50px", marginBottom: "50px"}}>Ver más ↓</h2>
        </div>
      </div>

      {/* Modal editar recurso */}
      {modalRecursoAbierto && (
        <div className="modal-overlay" onClick={() => setModalRecursoAbierto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => setModalRecursoAbierto(false)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">{recursoEditando?.id ? "Editar Recurso" : "Nuevo Recurso"}</h2>
            </div>
            <div className="modal-form">
              <input
                type="text"
                placeholder="Título *"
                value={recursoEditando?.titulo || ""}
                onChange={(e) => setRecursoEditando({ ...recursoEditando, titulo: e.target.value })}
                className="modal-input"
              />
              <select
                className="modal-input"
                value={recursoEditando?.tipo || "book"}
                onChange={(e) => setRecursoEditando({ ...recursoEditando, tipo: e.target.value })}
              >
                  <option value="book">Book</option>
                  <option value="journal_magazine">Journal / Magazine</option>
                  <option value="thesis_dissertation">Thesis / Dissertation</option>
                  <option value="reference">Reference</option>
                  <option value="digital_article">Digital Article</option>
                  <option value="e_book">E-Book</option>
                  <option value="video">Video</option>
                  <option value="audio_music">Audio / Music</option>
              </select>
              
              <input
                type="number"
                placeholder="Año de Publicación"
                value={recursoEditando?.ano_publicacion || ""}
                onChange={(e) => setRecursoEditando({ ...recursoEditando, ano_publicacion: Number(e.target.value) })}
                className="modal-input"
              />
              
              <input
                type="number"
                placeholder="Costo"
                value={recursoEditando?.costo || ""}
                onChange={(e) => setRecursoEditando({ ...recursoEditando, costo: Number(e.target.value) })}
                className="modal-input"
                step="0.01"
              />

              <label style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={recursoEditando?.disponible ?? true}
                  onChange={(e) => setRecursoEditando({ ...recursoEditando, disponible: e.target.checked })}
                />
                Marcar como Disponible
              </label>
            </div>
            <div className="modal-botones" style={{ marginTop: "20px" }}>
              <button className="modal-cancelar" onClick={() => setModalRecursoAbierto(false)}>Cancelar</button>
              <button className="modal-confirmar" onClick={handleGuardarRecurso}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ejemplares Fisicos */}
      {modalEjemplaresAbierto && recursoActivo && (
          <div className="modal-overlay" onClick={() => setModalEjemplaresAbierto(false)}>
          <div className="modal-card" style={{maxWidth: "600px"}} onClick={(e) => e.stopPropagation()}>
            <button className="modal-cerrar" onClick={() => setModalEjemplaresAbierto(false)}>✕</button>
            <div className="modal-header">
              <h2 className="modal-titulo">Ejemplares Físicos</h2>
              <p style={{margin: 0, color: "#666"}}>{recursoActivo.titulo}</p>
            </div>
            <div className="modal-form" style={{maxHeight: "300px", overflowY: "auto"}}>
                <table style={{width: "100%", textAlign: "left", borderCollapse: "collapse", marginBottom: "15px"}}>
                    <thead>
                        <tr style={{borderBottom: "1px solid #ddd"}}>
                            <th>Barcode</th>
                            <th>Ubicación</th>
                            <th>Salud</th>
                            <th>Estado Op</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ejemplares.length === 0 ? (
                            <tr><td colSpan="5" style={{padding: "10px", textAlign: "center", color: "#888"}}>No hay ejemplares registrados</td></tr>
                        ) : (
                            ejemplares.map(ej => (
                                <tr key={ej.barcode} style={{borderBottom: "1px solid #eee"}}>
                                    <td style={{padding: "5px 0"}}>{ej.barcode}</td>
                                    <td>{ej.example_location_code}</td>
                                    <td>{ej.example_health_state}</td>
                                    <td>{ej.example_op_state}</td>
                                    <td><button style={{color: "red", border: "none", background: "none", cursor: "pointer"}} onClick={() => handleEliminarEjemplar(ej.barcode)}>🗑️</button></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div style={{background: "#f9f9f9", padding: "15px", borderRadius: "5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
                    <input type="text" placeholder="Código de Barras *" className="modal-input" style={{margin: 0}} value={nuevoEjemplar.barcode} onChange={e => setNuevoEjemplar({...nuevoEjemplar, barcode: e.target.value})} />
                    <input type="text" placeholder="Ubicación *" className="modal-input" style={{margin: 0}} value={nuevoEjemplar.location_code} onChange={e => setNuevoEjemplar({...nuevoEjemplar, location_code: e.target.value})} />
                    <select className="modal-input" style={{margin: 0}} value={nuevoEjemplar.health_state} onChange={e => setNuevoEjemplar({...nuevoEjemplar, health_state: e.target.value})}>
                        <option value="good">Good</option>
                        <option value="damaged">Damaged</option>
                        <option value="incomplete">Incomplete</option>
                        <option value="lost">Lost</option>
                    </select>
                    <select className="modal-input" style={{margin: 0}} value={nuevoEjemplar.op_state} onChange={e => setNuevoEjemplar({...nuevoEjemplar, op_state: e.target.value})}>
                        <option value="available">Available</option>
                        <option value="on loan">On Loan</option>
                        <option value="reserved">Reserved</option>
                        <option value="internal consultation only">Internal Consultation Only</option>
                        <option value="in transit">In transit</option>
                    </select>
                    <button style={{gridColumn: "span 2", padding: "10px"}} className="modal-confirmar" onClick={handleCrearEjemplar}>Agregar Ejemplar</button>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Home;