import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Usuarios.css";
import duckIcon from "../assets/icons/duckIcon.svg";
import duckIconWhite from "../assets/icons/duckIconWhite.svg";
import { usuarios } from "../data/Usuarios";
import userIcon from "../assets/icons/userIcon.svg";
import userIconNav from "../assets/icons/userIconNav.svg";
import notificationIcon from "../assets/icons/notificationIcon.svg";
import searchIcon from "../assets/icons/searchIcon.svg";
import buttonCirculo from "../assets/icons/Button-circulo.svg";
import updateIcon from "../assets/icons/updateIcon.svg";
import { permisosIniciales } from "../data/Permisos";

function Usuarios() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();
  const [permisosOriginal] = useState(permisosIniciales);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  // TODO: reemplazar permisosIniciales con fetch a BD cuando esté lista
  // Ejemplo: useEffect(() => { fetch('/api/permisos').then(r => r.json()).then(setPermisos) }, []);
  const [permisos, setPermisos] = useState(permisosIniciales);
  const [rolesAbiertos, setRolesAbiertos] = useState({});
  const [permisosModificados, setPermisosModificados] = useState({});
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    rol: "",
    correo: "",
    contrasena: "",
    foto: null // TODO: reemplazar con upload a BD
    });

  // Preparación para usuario en sesión - luego vendrá de BD/auth
  const usuarioSesion = {
    nombre: "Admin",
    foto: null // TODO: reemplazar con foto de BD
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.rol.toLowerCase().includes(busqueda.toLowerCase())
    );

    const totalPaginas = Math.ceil(usuariosFiltrados.length / registrosPorPagina);

    const usuariosPaginados = usuariosFiltrados.slice(
    (paginaActual - 1) * registrosPorPagina,
    paginaActual * registrosPorPagina
    );

  function toggleRol(rol) {
    setRolesAbiertos(prev => ({ ...prev, [rol]: !prev[rol] }));
  }

  function handlePermiso(rol, seccion, permiso) {
    const key = `${rol}-${seccion}-${permiso}`;
    setPermisosModificados(prev => ({ ...prev, [key]: true }));
    setPermisos(prev => ({
      ...prev,
      [rol]: {
        ...prev[rol],
        [seccion]: {
          ...prev[rol]?.[seccion],
          [permiso]: !prev[rol]?.[seccion]?.[permiso]
        }
      }
    }));
  }

  function hayModificaciones(rol) {
    return Object.keys(permisosModificados).some(k => k.startsWith(rol));
  }

  function cancelarCambios(rol) {
    const keys = Object.keys(permisosModificados).filter(k => k.startsWith(rol));
    const newMod = { ...permisosModificados };
    keys.forEach(k => delete newMod[k]);
    setPermisosModificados(newMod);
    
    // Revertir al estado original de ese rol
    setPermisos(prev => ({
        ...prev,
        [rol]: permisosOriginal[rol]
    }));
  }

  function guardarCambios(rol) {
    const keys = Object.keys(permisosModificados).filter(k => k.startsWith(rol));
    const newMod = { ...permisosModificados };
    keys.forEach(k => delete newMod[k]);
    setPermisosModificados(newMod);
    // TODO: enviar cambios a BD
    alert(`Permisos de ${rol} guardados`);
  }
  
  function toggleSeccion(rol, seccion) {
    const key = `${rol}-${seccion}`;
    setSeccionesAbiertas(prev => ({ ...prev, [key]: !prev[key] }));
 }

  return (
    <div className="usuarios-container">

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
              <div className="sidebar-item active">Usuarios</div>
              <div className="sidebar-item" onClick={() => navigate("/libros")}>Libros</div>
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
              <>
                <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
                <div className="navbar-logo">
                  <img src={duckIcon} alt="Ducky" className="navbar-duck-icon" />
                  <div className="navbar-logo-text">
                    <span className="navbar-ducky">Ducky</span>
                    <span className="navbar-university">University</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="navbar-right">
            <span>Soporte</span>
            <div className="navbar-icon-group">
              <span>Notificaciones</span>
              <img src={notificationIcon} alt="notificaciones" className="nav-icon" />
            </div>
            <div className="navbar-icon-group">
              <span>{usuarioSesion.nombre}</span>
              {/* TODO: reemplazar con usuarioSesion.foto cuando venga de BD */}
              <img src={usuarioSesion.foto || userIconNav} alt="usuario" className="nav-icon" />
            </div>
          </div>
        </nav>

        {/* Contenido */}
        <div className="usuarios-content">

          {/* Lista de usuarios */}
          <div className="usuarios-main">

            {/* Barra de búsqueda */}
            <div className="search-bar">
              <img src={searchIcon} alt="buscar" className="search-icon-img" />
              <input
                type="text"
                placeholder="Buscar usuarios o roles ..."
                value={busqueda}
                onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaActual(1);
                }}
                className="search-input"
              />
            </div>

            {/* Lista */}
            <div className="usuarios-lista">
              {usuariosPaginados.map((usuario) => (
                <div className="usuario-card" key={usuario.id}>
                  <div className="usuario-avatar">
                    {/* TODO: reemplazar por usuario.foto cuando venga de BD */}
                    <img src={usuario.foto || userIcon} alt={usuario.nombre} className="usuario-foto" />
                  </div>
                  <div className="usuario-info">
                    <p className="usuario-nombre">{usuario.nombre}</p>
                    <p className="usuario-rol">{usuario.rol}</p>
                    <p className="usuario-correo">{usuario.correo}</p>
                    <p className="usuario-telefono">{usuario.telefono}</p>
                  </div>
                  <div className="usuario-actions">
                    <span className="badge-activo">Activo</span>
                    <button className="btn-action">
                      <img src={updateIcon} alt="editar" className="btn-icon" /> Editar
                    </button>
                    <button className="btn-action">
                      <img src={searchIcon} alt="buscar" className="btn-icon" /> Busqueda
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
                {totalPaginas > 1 && (
                <div className="paginacion">
                    <button
                    className="pag-btn"
                    onClick={() => setPaginaActual(1)}
                    disabled={paginaActual === 1}
                    >«</button>
                    <button
                    className="pag-btn"
                    onClick={() => setPaginaActual(p => p - 1)}
                    disabled={paginaActual === 1}
                    >‹</button>

                    {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                    <button
                        key={num}
                        className={`pag-btn ${paginaActual === num ? "pag-activa" : ""}`}
                        onClick={() => setPaginaActual(num)}
                    >{num}</button>
                    ))}

                    <button
                    className="pag-btn"
                    onClick={() => setPaginaActual(p => p + 1)}
                    disabled={paginaActual === totalPaginas}
                    >›</button>
                    <button
                    className="pag-btn"
                    onClick={() => setPaginaActual(totalPaginas)}
                    disabled={paginaActual === totalPaginas}
                    >»</button>
                </div>
                )}
          </div>

          {/* Panel de permisos */}
          <div className="permisos-panel">
            <h3 className="permisos-title">Permisos</h3>
            <hr />
            {["Administrador", "Bibliotecario", "Profesor", "Alumno", "Colaborador"].map((rol) => (
              <div className="permiso-rol" key={rol}>
                <div className="permiso-rol-header" onClick={() => toggleRol(rol)}>
                  <span>{rol}</span>
                  <span>{rolesAbiertos[rol] ? "▲" : "▼"}</span>
                </div>

                {rolesAbiertos[rol] && (
                  <div className="permiso-rol-body">

                    {permisos[rol]?.usuarios && (
                        <>
                        <p className="permiso-seccion" onClick={() => toggleSeccion(rol, "usuarios")} style={{cursor: "pointer"}}>
                            Usuarios {seccionesAbiertas[`${rol}-usuarios`] ? "▲" : "▼"}
                        </p>
                        {seccionesAbiertas[`${rol}-usuarios`] && Object.entries(permisos[rol].usuarios).map(([permiso, valor]) => (
                            <label className="permiso-item" key={permiso}>
                            <input
                                type="checkbox"
                                checked={valor}
                                onChange={() => handlePermiso(rol, "usuarios", permiso)}
                            />
                            <span>{permiso.charAt(0).toUpperCase() + permiso.slice(1)}</span>
                            </label>
                        ))}
                        </>
                    )}

                    {permisos[rol]?.libros && (
                        <>
                        <p className="permiso-seccion" onClick={() => toggleSeccion(rol, "libros")} style={{cursor: "pointer"}}>
                            Libros {seccionesAbiertas[`${rol}-libros`] ? "▲" : "▼"}
                        </p>
                        {seccionesAbiertas[`${rol}-libros`] && Object.entries(permisos[rol].libros).map(([permiso, valor]) => (
                            <label className="permiso-item" key={permiso}>
                            <input
                                type="checkbox"
                                checked={valor}
                                onChange={() => handlePermiso(rol, "libros", permiso)}
                            />
                            <span>{permiso.charAt(0).toUpperCase() + permiso.slice(1)}</span>
                            </label>
                        ))}
                        </>
                    )}

                    {hayModificaciones(rol) && (
                        <div className="permiso-acciones">
                        <button className="btn-cancelar" onClick={() => cancelarCambios(rol)}>Cancelar</button>
                        <button className="btn-guardar" onClick={() => guardarCambios(rol)}>Guardar</button>
                        </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
    {/* Botón + flotante */}
    <button className="btn-flotante" onClick={() => setModalAbierto(true)}>
        <img src={buttonCirculo} alt="agregar" className="btn-flotante-icon" />
    </button>

    {/* Modal agregar usuario */}
    {modalAbierto && (
    <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        <button className="modal-cerrar" onClick={() => {
            setModalAbierto(false);
            setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", foto: null });
            }}>✕
        </button>

        <div className="modal-header">
            <h2 className="modal-titulo">Creación de Usuario</h2>
        </div>

        <div className="modal-form">

            {/* Foto */}
            <div className="modal-foto-upload">
            <input
                type="file"
                accept="image/*"
                id="foto-upload"
                style={{ display: "none" }}
                onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                    const url = URL.createObjectURL(file);
                    setNuevoUsuario({ ...nuevoUsuario, foto: url });
                }
                // TODO: reemplazar URL.createObjectURL por upload a BD
                }}
            />
            <label htmlFor="foto-upload" className="modal-foto-label">
                <img
                src={nuevoUsuario.foto || userIcon}
                alt="foto"
                className="modal-avatar-preview"
                />
                <span className="modal-foto-texto">📷 Subir foto</span>
            </label>
            </div>

            <input
            type="text"
            placeholder="Nombre completo"
            value={nuevoUsuario.nombre}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
            className="modal-input"
            />
            <select
            value={nuevoUsuario.rol}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
            className="modal-input"
            >
            <option value="">Rol</option>
            <option value="Administrador">Administrador</option>
            <option value="Bibliotecario">Bibliotecario</option>
            <option value="Profesor">Profesor</option>
            <option value="Alumno">Alumno</option>
            <option value="Colaborador">Colaborador</option>
            </select>
            <input
            type="email"
            placeholder="Correo"
            value={nuevoUsuario.correo}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })}
            className="modal-input"
            />
            <input
            type="password"
            placeholder="Contraseña"
            value={nuevoUsuario.contrasena}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })}
            className="modal-input"
            />
        </div>

        <div className="modal-botones">
            <button className="modal-cancelar" onClick={() => {
                setModalAbierto(false);
                setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", foto: null });
                }}>Cancelar
            </button>
            <button className="modal-confirmar" onClick={() => {
            // TODO: enviar nuevo usuario a BD
            alert(`Usuario ${nuevoUsuario.nombre} creado`);
            setModalAbierto(false);
            setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", foto: null });
            }}>Confirmar</button>
        </div>

        </div>
    </div>
    )}
      </div>
    </div>
  );
}

export default Usuarios;