import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import duckIcon from "../assets/icons/duckIcon.svg";

function Login() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const navigate = useNavigate();

  function handleLogin() {
    if (usuario !== "" && contrasena !== "") {
      navigate("/home");
    } else {
      alert("Por favor llena todos los campos");
    }
  }

  function handleCrearCuenta() {
    navigate("/crear-cuenta");
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
            <div className="login-logo-top">
                <img src={duckIcon} alt="Ducky" className="duck-icon" />
                <div className="login-logo-text">
                <span className="logo-ducky">Ducky</span>
                <span className="logo-university">University</span>
                </div>
            </div>
        </div>

        <h2 className="login-title">Inicio de sesión</h2>

        <label>Usuario</label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="login-input"
        />

        <label>Contraseña</label>
        <input
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className="login-input"
        />

        <a href="#" className="login-recover">Recuperar contraseña</a>

        <div className="login-buttons">
          <button onClick={handleCrearCuenta} className="btn-dark">Crear Cuenta</button>
          <button onClick={handleLogin} className="btn-dark">Iniciar sesión</button>
        </div>
      </div>
    </div>
  );
}

export default Login;