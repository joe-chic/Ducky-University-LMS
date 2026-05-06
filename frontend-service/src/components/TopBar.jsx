import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./TopBar.css";
import duckIcon from "../assets/icons/icon-duck.png";
import menuIcon from "../assets/icons/icon-menu.png";
import supportIcon from "../assets/icons/icon-support.png";
import bellIcon from "../assets/icons/icon-bell.png";
import profileIcon from "../assets/icons/icon-profile.png";
import NotificationsPanel from "./NotificationsPanel";
import ChatbotPanel from "./ChatbotPanel";

function TopBar({ onMenuClick }) {
  const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [chatbotAbierto, setChatbotAbierto] = useState(false);
  const userWrapperRef = useRef(null);
  const navigate = useNavigate();

  const nombre = localStorage.getItem("ducky_nombre") || "Usuario";
  const correo = localStorage.getItem("ducky_correo") || "";
  const rol    = localStorage.getItem("ducky_role")   || "";

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (userWrapperRef.current && !userWrapperRef.current.contains(e.target)) {
        setMenuUsuarioAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("ducky_token");
    localStorage.removeItem("ducky_role");
    localStorage.removeItem("ducky_nombre");
    localStorage.removeItem("ducky_correo");
    localStorage.removeItem("ducky_campus_id");
    navigate("/");
  };

  return (
    <>
      <nav className="topbar">
        <div className="topbar-left">
          <button className="topbar-menu-btn" onClick={onMenuClick}>
            <img src={menuIcon} alt="menu" className="topbar-icon" />
          </button>
          <div className="topbar-logo">
            <img src={duckIcon} alt="Ducky" className="topbar-duck-icon" />
            <div className="topbar-logo-text">
              <span className="topbar-ducky">Ducky</span>
              <span className="topbar-university">University</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          <button className="topbar-action-btn" onClick={() => setChatbotAbierto(true)}>
            <img src={supportIcon} alt="soporte" className="topbar-icon" />
            <span>Soporte</span>
          </button>

          <button className="topbar-action-btn" onClick={() => setNotificacionesAbiertas(true)}>
            <img src={bellIcon} alt="notificaciones" className="topbar-icon" />
            <span>Notificaciones</span>
          </button>

          <div className="topbar-user-wrapper" ref={userWrapperRef}>
            <button
              className="topbar-action-btn"
              onClick={() => setMenuUsuarioAbierto(!menuUsuarioAbierto)}
            >
              <img src={profileIcon} alt="usuario" className="topbar-icon" />
              <span>{nombre}</span>
            </button>

            {menuUsuarioAbierto && (
              <div className="topbar-user-dropdown">
                {/* Avatar */}
                <div className="topbar-profile-avatar">
                  <img src={profileIcon} alt="avatar" className="topbar-profile-avatar-img" />
                </div>

                {/* Info */}
                <div className="topbar-profile-info">
                  <span className="topbar-profile-nombre">{nombre}</span>
                  {correo && <span className="topbar-profile-correo">{correo}</span>}
                  {rol    && <span className="topbar-profile-rol">{rol}</span>}
                </div>

                <div className="topbar-profile-divider" />

                <button className="topbar-logout-btn" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <NotificationsPanel
        isOpen={notificacionesAbiertas}
        onClose={() => setNotificacionesAbiertas(false)}
      />

      <ChatbotPanel
        isOpen={chatbotAbierto}
        onClose={() => setChatbotAbierto(false)}
      />
    </>
  );
}

export default TopBar;
