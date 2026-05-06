// =============================================================================
// INTEGRACIÓN PENDIENTE: Redis + RabbitMQ
//
// Este componente está preparado para conectarse a un servicio de notificaciones
// en tiempo real. Cuando el compañero integre el backend, solo hay que:
//
//  1. FETCH INICIAL (Redis cache)
//     Descomentar el useEffect de fetchNotificaciones. El BFF expone:
//       GET /api/notifications?userId=<id>
//     Redis guarda las últimas N notificaciones por usuario para respuesta rápida.
//
//  2. TIEMPO REAL (RabbitMQ → WebSocket)
//     Descomentar el useEffect del WebSocket. El BFF expone:
//       WS ws://<host>/ws/notifications?token=<jwt>
//     RabbitMQ publica eventos (préstamo_vencido, multa, etc.) en una exchange
//     de tipo "topic". El BFF consume esa queue y los reenvía al cliente por WS.
//     Cada mensaje que llega se hace push al estado `notificaciones`.
//
//  3. MARCAR COMO LEÍDA (Redis + DB)
//     Descomentar la llamada en marcarLeida. El BFF expone:
//       PATCH /api/notifications/:id/read
//     Actualiza el flag en la BD y borra el cache de Redis para ese usuario.
//
//  4. MARCAR TODAS LEÍDAS
//     Descomentar la llamada en marcarTodasLeidas:
//       PATCH /api/notifications/read-all
//
// Estructura esperada de cada notificación que llega del API:
// {
//   id:      string,
//   tipo:    "prestamo_vencido" | "multa_pendiente" | "devolucion" | "prestamo_nuevo",
//   titulo:  string,
//   mensaje: string,
//   fecha:   ISO string,
//   leida:   boolean,
// }
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { getToken } from "../api/bff";
import "./NotificationsPanel.css";

const TIPO_CONFIG = {
  prestamo_vencido: { icon: "📚", color: "#c62828", bg: "#ffebee" },
  multa_pendiente:  { icon: "💰", color: "#e65100", bg: "#fff3e0" },
  devolucion:       { icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
  prestamo_nuevo:   { icon: "📖", color: "#1565c0", bg: "#e3f2fd" },
  default:          { icon: "🔔", color: "#6c757d", bg: "#f8f9fa" },
};

// TODO: eliminar cuando el backend esté listo
const MOCK_NOTIFICACIONES = [
  { id: "1", tipo: "prestamo_vencido", titulo: "Préstamo vencido",   mensaje: '"Hamlet" venció hace 3 días. Devuélvelo para evitar multas.', fecha: new Date(Date.now() - 2 * 3600000),    leida: false },
  { id: "2", tipo: "multa_pendiente",  titulo: "Multa pendiente",    mensaje: "Tienes $50.00 MXN sin pagar por devolución tardía.",          fecha: new Date(Date.now() - 86400000),        leida: false },
  { id: "3", tipo: "devolucion",       titulo: "Devolución exitosa", mensaje: '"The Alchemist" fue devuelto correctamente.',                 fecha: new Date(Date.now() - 3 * 86400000),    leida: true  },
  { id: "4", tipo: "prestamo_nuevo",   titulo: "Préstamo aprobado",  mensaje: 'Tu solicitud de "1984" fue aprobada. ¡Pasa a recogerlo!',    fecha: new Date(Date.now() - 5 * 86400000),    leida: true  },
];

function timeAgo(fecha) {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} día${days > 1 ? "s" : ""}`;
}

function NotifCard({ notif, onClick }) {
  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.default;
  return (
    <button
      className={`notif-card${notif.leida ? "" : " notif-card--unread"}`}
      onClick={() => onClick(notif)}
    >
      <div className="notif-icon-wrap" style={{ backgroundColor: cfg.bg }}>
        <span className="notif-icon-text">{cfg.icon}</span>
      </div>
      <div className="notif-body">
        <div className="notif-header">
          <span className="notif-titulo">{notif.titulo}</span>
          {!notif.leida && <span className="notif-dot" />}
        </div>
        <p className="notif-mensaje">{notif.mensaje}</p>
        <span className="notif-time">{timeAgo(notif.fecha)}</span>
      </div>
    </button>
  );
}

export default function NotificationsPanel({ isOpen, onClose }) {
  const [filtro, setFiltro] = useState("todas");
  const [notificaciones, setNotificaciones] = useState(MOCK_NOTIFICACIONES);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 1. FETCH INICIAL — Redis cache vía BFF
  //    Activar cuando el endpoint GET /api/notifications esté disponible.
  //    Redis sirve las notificaciones del usuario sin golpear la BD en cada open.
  // ---------------------------------------------------------------------------
  // useEffect(() => {
  //   if (!isOpen) return;
  //   const token = getToken();
  //   if (!token) return;
  //
  //   setLoading(true);
  //   fetch(`${process.env.REACT_APP_BFF_URL}/api/notifications`, {
  //     headers: { Authorization: `Bearer ${token}` },
  //   })
  //     .then(r => r.json())
  //     .then(data => setNotificaciones(Array.isArray(data) ? data : []))
  //     .catch(console.error)
  //     .finally(() => setLoading(false));
  // }, [isOpen]);

  // ---------------------------------------------------------------------------
  // 2. TIEMPO REAL — WebSocket alimentado por RabbitMQ
  //    El BFF consume la queue de RabbitMQ y reenvía cada evento por WS.
  //    Conectar al abrir el panel; desconectar al cerrar o desmontar.
  //    Cada mensaje push se agrega al inicio de la lista (más reciente primero).
  // ---------------------------------------------------------------------------
  // useEffect(() => {
  //   const token = getToken();
  //   if (!token) return;
  //
  //   const ws = new WebSocket(
  //     `${process.env.REACT_APP_WS_URL}/ws/notifications?token=${token}`
  //   );
  //
  //   ws.onmessage = (event) => {
  //     const notif = JSON.parse(event.data);
  //     setNotificaciones(prev => [{ ...notif, leida: false }, ...prev]);
  //   };
  //
  //   ws.onerror = (err) => console.error("WS notifications error:", err);
  //
  //   wsRef.current = ws;
  //   return () => ws.close();
  // }, []);

  // ---------------------------------------------------------------------------
  // 3. MARCAR COMO LEÍDA — actualiza Redis + BD vía BFF
  // ---------------------------------------------------------------------------
  const marcarLeida = async (notif) => {
    setNotificaciones(prev =>
      prev.map(n => n.id === notif.id ? { ...n, leida: true } : n)
    );

    // TODO: activar cuando el endpoint esté disponible
    // try {
    //   const token = getToken();
    //   await fetch(`${process.env.REACT_APP_BFF_URL}/api/notifications/${notif.id}/read`, {
    //     method: "PATCH",
    //     headers: { Authorization: `Bearer ${token}` },
    //   });
    // } catch (err) {
    //   console.error("Error marcando notificación como leída:", err);
    // }
  };

  // ---------------------------------------------------------------------------
  // 4. MARCAR TODAS COMO LEÍDAS — borra cache Redis del usuario
  // ---------------------------------------------------------------------------
  const marcarTodasLeidas = async () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));

    // TODO: activar cuando el endpoint esté disponible
    // try {
    //   const token = getToken();
    //   await fetch(`${process.env.REACT_APP_BFF_URL}/api/notifications/read-all`, {
    //     method: "PATCH",
    //     headers: { Authorization: `Bearer ${token}` },
    //   });
    // } catch (err) {
    //   console.error("Error marcando todas como leídas:", err);
    // }
  };

  const sinLeer = notificaciones.filter(n => !n.leida);
  const mostrar = filtro === "sin_leer" ? sinLeer : notificaciones;

  return (
    <>
      {/* Overlay */}
      <div
        className={`notif-overlay${isOpen ? " notif-overlay--visible" : ""}`}
        onClick={onClose}
      />

      {/* Panel lateral derecho */}
      <div className={`notif-panel${isOpen ? " notif-panel--open" : ""}`}>

        {/* Header */}
        <div className="notif-panel-header">
          <button className="notif-back-btn" onClick={onClose}>←</button>
          <span className="notif-panel-title">Notificaciones</span>
          {sinLeer.length > 0 && (
            <button className="notif-mark-all" onClick={marcarTodasLeidas}>
              Marcar todas
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="notif-filtros">
          <button
            className={`notif-filtro-btn${filtro === "todas" ? " notif-filtro-btn--active" : ""}`}
            onClick={() => setFiltro("todas")}
          >
            Todas
          </button>
          <button
            className={`notif-filtro-btn${filtro === "sin_leer" ? " notif-filtro-btn--active" : ""}`}
            onClick={() => setFiltro("sin_leer")}
          >
            Sin leer{sinLeer.length > 0 ? ` (${sinLeer.length})` : ""}
          </button>
        </div>

        {/* Lista */}
        <div className="notif-list">
          {loading ? (
            <div className="notif-empty">
              <p className="notif-empty-title">Cargando...</p>
            </div>
          ) : mostrar.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon">🔔</span>
              <p className="notif-empty-title">No hay notificaciones</p>
              <p className="notif-empty-msg">
                {filtro === "sin_leer"
                  ? "No tienes notificaciones sin leer."
                  : "Cuando tengas notificaciones aparecerán aquí."}
              </p>
            </div>
          ) : (
            mostrar.map(n => (
              <NotifCard key={n.id} notif={n} onClick={marcarLeida} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
