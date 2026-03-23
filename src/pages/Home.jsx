import { useState } from "react";
import "./Home.css";
import landingImage from "../assets/images/landingImage.png";
import duckIcon from "../assets/icons/duckIcon.svg";
import duckIconWhite from "../assets/icons/duckIconWhite.svg";
import { libros } from "../data/Libros.js";
import { useNavigate } from "react-router-dom";

function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
              <div className="sidebar-item active">Inicio</div>
              <div className="sidebar-item" onClick={() => navigate("/usuarios")}>Usuarios</div>
              <div className="sidebar-item">Libros</div>
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
            <span>Soporte</span>
            <span>Notificaciones 🔔</span>
            <span>Usuario 👤</span>
        </div>
        </nav>

        {/* Hero */}
        <div className="hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${landingImage})` }}>
          <h1>Biblioteca Ducky</h1>
        </div>

        {/* Libros */}
        <h2 className="section-title">Nuevo libros disponibles</h2>

        <div className="books-grid">
        {libros.map((libro) => (
            <div className="book-card" key={libro.id}>
            <div className="book-card-top">
                <span className="badge-disponible">Disponible</span>
            </div>
            <div className="book-info">
                <div className="book-cover">📚</div>
                <div className="book-details">
                <p className="book-title">{libro.titulo}</p>
                <p className="book-autor">{libro.autor}</p>
                <p className="book-editorial">{libro.editorial}</p>
                <p className="book-genero">{libro.genero}</p>
                </div>
            </div>
            <div className="book-actions">
                <button className="btn-action">✏️ Editar</button>
                <button className="btn-action">✕ Deshabilitar</button>
            </div>
            </div>
        ))}
        </div>

        <h2 className="ver-mas">Ver más ↓</h2>
      </div>
    </div>
  );
}

export default Home;