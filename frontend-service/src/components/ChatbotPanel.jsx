// =============================================================================
// INTEGRACIÓN PENDIENTE: Ollama vía Docker + chatbot-microservice
//
// Arquitectura esperada:
//   Frontend → BFF (POST /api/chatbot/message) → chatbot-microservice → Ollama
//
// Docker Compose del chatbot-microservice debe incluir:
//   ollama:
//     image: ollama/ollama
//     ports: ["11434:11434"]
//     volumes: ["ollama_data:/root/.ollama"]
//
//   chatbot-service:
//     build: ./chatbot-microservice
//     environment:
//       OLLAMA_URL: http://ollama:11434
//       OLLAMA_MODEL: llama3          # o mistral, phi3, etc.
//     ports: ["4005:4005"]
//
// El BFF expone:
//   POST /api/chatbot/message
//   Headers: { Authorization: "Bearer <token>" }
//   Body:    { message: string, history?: { role, text }[] }
//   Response:{ reply: string }
//
// Para activar la integración, descomentar el bloque en sendMessage() y
// eliminar el setTimeout de simulación.
// =============================================================================

import { useState, useRef, useEffect } from "react";
import { bffPost, getToken } from "../api/bff";
import "./ChatbotPanel.css";
import duckIcon from "../assets/icons/icon-duck.png";

const QUICK_REPLIES = [
  "¿Cómo hago un préstamo?",
  "¿Cuánto dura un préstamo?",
  "¿Cómo renuevo un libro?",
  "¿Tengo multas pendientes?",
];

const INITIAL_MESSAGES = [
  {
    id: "0",
    role: "bot",
    text: "¡Hola! Soy el asistente de la Biblioteca Ducky\n¿En qué puedo ayudarte hoy?",
    time: new Date(),
  },
];

function formatTime(date) {
  return new Date(date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ msg }) {
  const isBot = msg.role === "bot";
  return (
    <div className={`chat-bubble-wrap ${isBot ? "chat-bubble-wrap--bot" : "chat-bubble-wrap--user"}`}>
      {isBot && (
        <div className="chat-bot-avatar"><img src={duckIcon} alt="Ducky" className="chat-bot-avatar-img" /></div>
      )}
      <div className={`chat-bubble ${isBot ? "chat-bubble--bot" : "chat-bubble--user"}`}>
        <p className="chat-bubble-text">{msg.text}</p>
        <span className="chat-bubble-time">{formatTime(msg.time)}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-bubble-wrap chat-bubble-wrap--bot">
      <div className="chat-bot-avatar">🦆</div>
      <div className="chat-bubble chat-bubble--bot chat-bubble--typing">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

export default function ChatbotPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll al último mensaje
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Foco en el input al abrir
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || typing) return;

    const userMsg = { id: Date.now().toString(), role: "user", text: trimmed, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const token = getToken();
      const data = await bffPost(
        "/api/chatbot/message",
        {
          message: trimmed,
          history: [...messages, userMsg].map((m) => ({ role: m.role, text: m.text })),
        },
        { token }
      );
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: data?.reply || "No pude generar una respuesta en este momento.",
        time: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (_err) {
      const errMsg = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: "Lo siento, hubo un error al conectar con el asistente. Intenta de nuevo. 🙏",
        time: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showQuickReplies = messages.length <= 2;

  return (
    <>
      {/* Overlay */}
      <div
        className={`chatbot-overlay${isOpen ? " chatbot-overlay--visible" : ""}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`chatbot-panel${isOpen ? " chatbot-panel--open" : ""}`}>

        {/* Header */}
        <div className="chatbot-header">
          <button className="chatbot-back-btn" onClick={onClose}>←</button>
          <div className="chatbot-header-info">
            <div className="chatbot-header-avatar"><img src={duckIcon} alt="Ducky" className="chatbot-header-avatar-img" /></div>
            <div>
              <p className="chatbot-header-name">Asistente Ducky</p>
              <p className="chatbot-header-status">
                <span className="chatbot-status-dot" />
                En línea
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="chatbot-messages" ref={listRef}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {typing && <TypingIndicator />}
        </div>

        {/* Quick replies */}
        {showQuickReplies && (
          <div className="chatbot-quick-replies">
            {QUICK_REPLIES.map(q => (
              <button
                key={q}
                className="chatbot-quick-btn"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="chatbot-input-row">
          <textarea
            ref={inputRef}
            className="chatbot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            rows={1}
            maxLength={500}
          />
          <button
            className={`chatbot-send-btn${!input.trim() || typing ? " chatbot-send-btn--disabled" : ""}`}
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
          >
            ➤
          </button>
        </div>
      </div>
    </>
  );
}
