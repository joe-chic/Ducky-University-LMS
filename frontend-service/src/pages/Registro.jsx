// =============================================================================
// INTEGRACIÓN PENDIENTE: Backend registro de usuarios
//
// Cuando el compañero conecte el backend, descomentar el bloque en handleRegistro.
// El BFF debe exponer:
//   POST /api/auth/register
//   Body: { nombre, correo, matricula, rol }
//   Response: { message: "Usuario creado", user: { id, nombre, correo, rol } }
//
// El rol que llega aquí es uno de: "Alumno" | "Bibliotecario" | "Profesor"
// Un Administrador solo puede ser creado directamente desde el panel de Usuarios.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registro.css";
import duckIcon from "../assets/icons/duckIcon.svg";

const ROLES = [
  {
    id: "Alumno",
    label: "Alumno",
    icon: "🎓",
    desc: "Accede al catálogo y solicita préstamos",
  },
  {
    id: "Bibliotecario",
    label: "Bibliotecario",
    icon: "📚",
    desc: "Gestiona recursos y préstamos de la biblioteca",
  },
  {
    id: "Profesor",
    label: "Profesor",
    icon: "🧑‍🏫",
    desc: "Consulta el catálogo y solicita materiales de apoyo",
  },
];

export default function Registro() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [form, setForm] = useState({ nombre: "", correo: "", matricula: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSeleccionarRol(rol) {
    setRolSeleccionado(rol);
    setPaso(2);
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleRegistro() {
    if (!form.nombre.trim() || !form.correo.trim() || !form.matricula.trim()) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    setError("");

    // TODO: descomentar cuando el endpoint POST /api/auth/register esté disponible
    // try {
    //   const res = await fetch(`${process.env.REACT_APP_BFF_URL}/api/auth/register`, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       nombre:    form.nombre.trim(),
    //       correo:    form.correo.trim(),
    //       matricula: form.matricula.trim(),
    //       rol:       rolSeleccionado.id,
    //     }),
    //   });
    //   const data = await res.json();
    //   if (!res.ok) throw new Error(data.message || "Error al crear la cuenta");
    //   navigate("/");
    // } catch (err) {
    //   setError(err.message);
    // } finally {
    //   setLoading(false);
    // }

    // Simulación temporal mientras el backend no está listo
    setTimeout(() => {
      setLoading(false);
      alert(`Cuenta creada para ${form.nombre} (${rolSeleccionado.id}). Próximamente activo.`);
      navigate("/");
    }, 800);
  }

  return (
    <div className="registro-bg">
      <div className="registro-card">

        {/* Logo */}
        <div className="registro-logo">
          <img src={duckIcon} alt="Ducky" className="registro-duck-icon" />
          <div className="registro-logo-text">
            <span className="registro-ducky">Ducky</span>
            <span className="registro-university">University</span>
          </div>
        </div>

        {/* Paso 1: Selección de rol */}
        {paso === 1 && (
          <>
            <h2 className="registro-title">Crear cuenta</h2>
            <p className="registro-subtitle">¿Cuál es tu rol en la universidad?</p>

            <div className="registro-roles">
              {ROLES.map(rol => (
                <button
                  key={rol.id}
                  className="registro-rol-card"
                  onClick={() => handleSeleccionarRol(rol)}
                >
                  <span className="registro-rol-icon">{rol.icon}</span>
                  <span className="registro-rol-label">{rol.label}</span>
                  <span className="registro-rol-desc">{rol.desc}</span>
                </button>
              ))}
            </div>

            <button className="registro-link" onClick={() => navigate("/")}>
              ← Volver al inicio de sesión
            </button>
          </>
        )}

        {/* Paso 2: Datos personales */}
        {paso === 2 && (
          <>
            <div className="registro-paso2-header">
              <button className="registro-back-btn" onClick={() => { setPaso(1); setError(""); }}>←</button>
              <div>
                <h2 className="registro-title" style={{ textAlign: "left", marginBottom: 2 }}>
                  {rolSeleccionado.icon} {rolSeleccionado.label}
                </h2>
                <p className="registro-subtitle" style={{ textAlign: "left" }}>
                  Completa tus datos para registrarte
                </p>
              </div>
            </div>

            <div className="registro-form">
              <div className="registro-field">
                <label className="registro-label">Nombre completo</label>
                <input
                  className="registro-input"
                  type="text"
                  name="nombre"
                  placeholder="Ej. Juan García López"
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>

              <div className="registro-field">
                <label className="registro-label">Correo institucional</label>
                <input
                  className="registro-input"
                  type="email"
                  name="correo"
                  placeholder="correo@udem.edu"
                  value={form.correo}
                  onChange={handleChange}
                />
              </div>

              <div className="registro-field">
                <label className="registro-label">
                  {rolSeleccionado.id === "Alumno" ? "Matrícula" : "Número de identificación"}
                </label>
                <input
                  className="registro-input"
                  type="text"
                  name="matricula"
                  placeholder={rolSeleccionado.id === "Alumno" ? "Ej. 0123456" : "Ej. 98765"}
                  value={form.matricula}
                  onChange={handleChange}
                />
              </div>

              {error && <p className="registro-error">{error}</p>}

              <button
                className="registro-btn-submit"
                onClick={handleRegistro}
                disabled={loading}
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </div>

            <button className="registro-link" onClick={() => navigate("/")}>
              ← Volver al inicio de sesión
            </button>
          </>
        )}

      </div>
    </div>
  );
}
