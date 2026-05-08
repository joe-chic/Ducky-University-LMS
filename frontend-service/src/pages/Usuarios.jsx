import { useSidebar } from "../hooks/useSidebar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Usuarios.css";
import userIcon from "../assets/icons/userIcon.svg";
import searchIcon from "../assets/icons/searchIcon.svg";
import buttonCirculo from "../assets/icons/Button-circulo.svg";
import updateIcon from "../assets/icons/updateIcon.svg";
import noIcon from "../assets/icons/icon-no.png";
import checkIcon from "../assets/icons/icon-check.png";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { permisosIniciales } from "../data/Permisos";
import { bffDelete, bffGet, bffPost, bffPut, getToken } from "../api/bff";

function Usuarios() {
  const [sidebarOpen, setSidebarOpen] = useSidebar();
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();
  const [permisosOriginal] = useState(permisosIniciales);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;
  const [usuarios, setUsuarios] = useState([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const userRole = localStorage.getItem("ducky_role");
  const isAdmin = userRole === "Administrador";

  useEffect(() => {
    if (!isAdmin) navigate("/home");
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!getToken()) navigate("/");
  }, [navigate]);

  const [permisos, setPermisos] = useState(permisosIniciales);
  const [rolesAbiertos, setRolesAbiertos] = useState({});
  const [permisosModificados, setPermisosModificados] = useState({});
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({});
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", rol: "", correo: "", contrasena: "", matricula: "", foto: null });

  const totalPaginas = Math.ceil(totalUsuarios / registrosPorPagina);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const token = getToken();
      try {
        setLoadingUsuarios(true);
        setErrorUsuarios(null);
        const data = await bffGet("/api/users", { token, params: { search: busqueda, page: paginaActual, pageSize: registrosPorPagina } });
        if (cancelled) return;
        setUsuarios(data.items || []);
        setTotalUsuarios(data.total || 0);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setErrorUsuarios(err?.message || "No se pudieron cargar los usuarios.");
        setUsuarios([]);
        setTotalUsuarios(0);
      } finally {
        if (!cancelled) setLoadingUsuarios(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [busqueda, paginaActual, refreshKey]);

  function toggleRol(rol) {
    setRolesAbiertos(prev => ({ ...prev, [rol]: !prev[rol] }));
  }

  function handlePermiso(rol, seccion, permiso) {
    const key = `${rol}-${seccion}-${permiso}`;
    setPermisosModificados(prev => ({ ...prev, [key]: true }));
    setPermisos(prev => ({ ...prev, [rol]: { ...prev[rol], [seccion]: { ...prev[rol]?.[seccion], [permiso]: !prev[rol]?.[seccion]?.[permiso] } } }));
  }

  function hayModificaciones(rol) {
    return Object.keys(permisosModificados).some(k => k.startsWith(rol));
  }

  function cancelarCambios(rol) {
    const keys = Object.keys(permisosModificados).filter(k => k.startsWith(rol));
    const newMod = { ...permisosModificados };
    keys.forEach(k => delete newMod[k]);
    setPermisosModificados(newMod);
    setPermisos(prev => ({ ...prev, [rol]: permisosOriginal[rol] }));
  }

  function guardarCambios(rol) {
    const keys = Object.keys(permisosModificados).filter(k => k.startsWith(rol));
    const newMod = { ...permisosModificados };
    keys.forEach(k => delete newMod[k]);
    setPermisosModificados(newMod);
    alert(`Permisos de ${rol} guardados`);
  }

  function toggleSeccion(rol, seccion) {
    const key = `${rol}-${seccion}`;
    setSeccionesAbiertas(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="usuarios-container">

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">

        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Contenido */}
        <div className="usuarios-content">

          {/* Lista de usuarios */}
          <div className="usuarios-main">
            <div style={{ display: "flex", alignItems: "center", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "0 16px", marginBottom: "20px" }}>
              <img src={searchIcon} alt="buscar" style={{ width: "18px", height: "18px", marginRight: "10px", opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Buscar usuarios o roles ..."
                value={busqueda}
                onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                style={{ flex: 1, padding: "12px 0", border: "none", outline: "none", fontSize: "0.95rem", background: "transparent" }}
              />
            </div>

            <div className="usuarios-lista">
              {loadingUsuarios ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>Cargando...</div>
              ) : usuarios.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                  {errorUsuarios || "No se encontraron usuarios."}
                </div>
              ) : (
                usuarios.reduce((acc, usuario, index) => {
                  const currentLetter = (usuario.nombre?.[0] || "#").toUpperCase();
                  const prevLetter = index > 0 ? (usuarios[index - 1].nombre?.[0] || "#").toUpperCase() : null;
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
                    <div className="usuario-card" key={usuario.id}>
                      <div className="usuario-avatar">
                        <img src={usuario.foto || userIcon} alt={usuario.nombre} className="usuario-foto" />
                      </div>
                      <div className="usuario-info">
                        <p className="usuario-nombre">{usuario.nombre}</p>
                        <p className="usuario-rol">{usuario.rol}</p>
                        <p className="usuario-correo">{usuario.correo}</p>
                        <p className="usuario-telefono">{usuario.telefono}</p>
                      </div>
                      <div className="usuario-actions">
                        <span className={usuario.activo ? "badge-activo" : "badge-inactivo"}>{usuario.activo ? "Activo" : "Inactivo"}</span>
                        <button
                          className="btn-action"
                          onClick={() => {
                            setUsuarioEditando(usuario);
                            setNuevoUsuario({ nombre: usuario.nombre, rol: usuario.rol, correo: usuario.correo, contrasena: "", matricula: usuario.matricula || "", foto: null });
                            setModalAbierto(true);
                          }}
                        >
                          <img src={updateIcon} alt="editar" className="btn-icon" /> Editar
                        </button>
                        <button
                          className="btn-action"
                          onClick={async () => {
                            const accion = usuario.activo ? "deshabilitar" : "habilitar";
                            if (!window.confirm(`¿Seguro que deseas ${accion} este usuario?`)) return;
                            try {
                              const token = getToken();
                              if (usuario.activo) {
                                await bffDelete(`/api/users/${usuario.id}`, { token });
                                setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, activo: false } : u));
                              } else {
                                await bffPut(`/api/users/${usuario.id}`, { nombre: usuario.nombre, rol: usuario.rol, correo: usuario.correo, activo: true }, { token });
                                setUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, activo: true } : u));
                              }
                            } catch (err) {
                              alert(err.message || `No se pudo ${accion} el usuario`);
                            }
                          }}
                        >
                          <img src={usuario.activo ? noIcon : checkIcon} alt={usuario.activo ? "deshabilitar" : "habilitar"} className="btn-icon" />
                          {usuario.activo ? "Deshabilitar" : "Habilitar"}
                        </button>
                      </div>
                    </div>
                  );
                  return acc;
                }, []) ) }
            </div>

            {totalPaginas > 1 && (
              <div className="paginacion">
                <button className="pag-btn" onClick={() => setPaginaActual(1)} disabled={paginaActual === 1}>«</button>
                <button className="pag-btn" onClick={() => setPaginaActual(p => p - 1)} disabled={paginaActual === 1}>‹</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                  <button key={num} className={`pag-btn ${paginaActual === num ? "pag-activa" : ""}`} onClick={() => setPaginaActual(num)}>{num}</button>
                ))}
                <button className="pag-btn" onClick={() => setPaginaActual(p => p + 1)} disabled={paginaActual === totalPaginas}>›</button>
                <button className="pag-btn" onClick={() => setPaginaActual(totalPaginas)} disabled={paginaActual === totalPaginas}>»</button>
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
                        <p className="permiso-seccion" onClick={() => toggleSeccion(rol, "usuarios")} style={{ cursor: "pointer" }}>
                          Usuarios {seccionesAbiertas[`${rol}-usuarios`] ? "▲" : "▼"}
                        </p>
                        {seccionesAbiertas[`${rol}-usuarios`] && Object.entries(permisos[rol].usuarios).map(([permiso, valor]) => (
                          <label className="permiso-item" key={permiso}>
                            <input type="checkbox" checked={valor} onChange={() => handlePermiso(rol, "usuarios", permiso)} />
                            <span>{permiso.charAt(0).toUpperCase() + permiso.slice(1)}</span>
                          </label>
                        ))}
                      </>
                    )}
                    {permisos[rol]?.libros && (
                      <>
                        <p className="permiso-seccion" onClick={() => toggleSeccion(rol, "libros")} style={{ cursor: "pointer" }}>
                          Libros {seccionesAbiertas[`${rol}-libros`] ? "▲" : "▼"}
                        </p>
                        {seccionesAbiertas[`${rol}-libros`] && Object.entries(permisos[rol].libros).map(([permiso, valor]) => (
                          <label className="permiso-item" key={permiso}>
                            <input type="checkbox" checked={valor} onChange={() => handlePermiso(rol, "libros", permiso)} />
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
        <button className="btn-flotante" onClick={() => { setUsuarioEditando(null); setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", matricula: "", foto: null }); setModalAbierto(true); }}>
          <img src={buttonCirculo} alt="agregar" className="btn-flotante-icon" />
        </button>

        {/* Modal usuario */}
        {modalAbierto && (
          <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-cerrar" onClick={() => { setModalAbierto(false); setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", matricula: "", foto: null }); }}>✕</button>
              <div className="modal-header">
                <h2 className="modal-titulo">{usuarioEditando ? "Edición de Usuario" : "Creación de Usuario"}</h2>
              </div>
              <div className="modal-form">
                <div className="modal-foto-upload">
                  <input type="file" accept="image/*" id="foto-upload" style={{ display: "none" }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) setNuevoUsuario({ ...nuevoUsuario, foto: URL.createObjectURL(file) });
                  }} />
                  <label htmlFor="foto-upload" className="modal-foto-label">
                    <img src={nuevoUsuario.foto || userIcon} alt="foto" className="modal-avatar-preview" />
                    <span className="modal-foto-texto">📷 Subir foto</span>
                  </label>
                </div>
                <input type="text" placeholder="Nombre completo" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} className="modal-input" />
                <select value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })} className="modal-input">
                  <option value="">Rol</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Bibliotecario">Bibliotecario</option>
                  <option value="Profesor">Profesor</option>
                  <option value="Alumno">Alumno</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
                <input type="email" placeholder="Correo" value={nuevoUsuario.correo} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })} className="modal-input" />
                <input type="password" placeholder="Contraseña" value={nuevoUsuario.contrasena} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, contrasena: e.target.value })} className="modal-input" />
                {nuevoUsuario.rol === "Alumno" && (
                  <input type="text" placeholder="Matrícula" value={nuevoUsuario.matricula} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, matricula: e.target.value })} className="modal-input" />
                )}
                {(nuevoUsuario.rol === "Profesor" || nuevoUsuario.rol === "Bibliotecario") && (
                  <input type="text" placeholder="Número de identificación" value={nuevoUsuario.matricula} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, matricula: e.target.value })} className="modal-input" />
                )}
              </div>
              <div className="modal-botones">
                <button className="modal-cancelar" onClick={() => { setModalAbierto(false); setUsuarioEditando(null); setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", matricula: "", foto: null }); }}>Cancelar</button>
                <button className="modal-confirmar" onClick={async () => {
                  if (!nuevoUsuario.nombre || !nuevoUsuario.rol || !nuevoUsuario.correo) { alert("Por favor, llena los campos: Nombre, Rol y Correo."); return; }
                  if (!usuarioEditando && !nuevoUsuario.contrasena) { alert("Por favor, ingresa una contraseña para el nuevo usuario."); return; }
                  try {
                    const token = getToken();

                    // -------------------------------------------------------------------------
                    // TODO: INTEGRACIÓN PENDIENTE — Verificación de credenciales institucionales
                    //
                    // Antes de crear el usuario, validar que la matrícula o número de
                    // identificación exista en el microservicio correspondiente:
                    //
                    //   Alumno      → ducky-scholar-service   (base: ducky_scholar_db)
                    //   Profesor    → ducky-human-capital-service (base: ducky_human_capital_db)
                    //   Bibliotecario → ducky-human-capital-service
                    //
                    // El BFF debe exponer un endpoint proxy, por ejemplo:
                    //   POST /api/validate/credenciales
                    //   Headers: { Authorization: "Bearer <token>" }
                    //   Body:    { rol: string, matricula: string, correo: string }
                    //   Response:{ valido: boolean, mensaje?: string }
                    //
                    // Flujo esperado:
                    //   1. Llamar al endpoint de validación
                    //   2. Si valido === false → mostrar error y NO crear usuario
                    //   3. Si valido === true  → continuar con bffPost
                    //
                    // if (!usuarioEditando && nuevoUsuario.matricula) {
                    //   const validacion = await bffPost("/api/validate/credenciales", {
                    //     rol: nuevoUsuario.rol,
                    //     matricula: nuevoUsuario.matricula,
                    //     correo: nuevoUsuario.correo,
                    //   }, { token });
                    //   if (!validacion.valido) {
                    //     alert(validacion.mensaje || "Las credenciales no fueron encontradas en el sistema institucional.");
                    //     return;
                    //   }
                    // }
                    // -------------------------------------------------------------------------

                    if (usuarioEditando) {
                      await bffPut(`/api/users/${usuarioEditando.id}`, { nombre: nuevoUsuario.nombre, rol: nuevoUsuario.rol, correo: nuevoUsuario.correo, telefono: null, contrasena: nuevoUsuario.contrasena, matricula: nuevoUsuario.matricula, activo: usuarioEditando.activo, foto: null }, { token });
                    } else {
                      await bffPost("/api/users", { nombre: nuevoUsuario.nombre, rol: nuevoUsuario.rol, correo: nuevoUsuario.correo, telefono: null, contrasena: nuevoUsuario.contrasena, matricula: nuevoUsuario.matricula, activo: true, foto: null }, { token });
                    }
                    setModalAbierto(false);
                    setUsuarioEditando(null);
                    setNuevoUsuario({ nombre: "", rol: "", correo: "", contrasena: "", matricula: "", foto: null });
                    setRefreshKey(k => k + 1);
                  } catch (err) {
                    alert(err.message || "No se pudo guardar el usuario");
                  }
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