const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 4005);
const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "tinyllama";

function fallbackReply(input) {
  const q = String(input || "").toLowerCase();
  if (q.includes("prestamo") || q.includes("préstamo")) {
    return "Para hacer un préstamo: 1) ve a Recursos, 2) abre el recurso, 3) solicita el préstamo del ejemplar disponible. Si tienes multas pendientes, el sistema bloqueará nuevos préstamos hasta pagarlas.";
  }
  if (q.includes("dura") || q.includes("cuanto") || q.includes("cuánto")) {
    return "La duración típica del préstamo físico es de alrededor de 5 días hábiles. Para la fecha exacta, revisa el detalle del préstamo en Mis Préstamos.";
  }
  if (q.includes("renuevo") || q.includes("renovar")) {
    return "Para renovar: entra a la sección de Préstamos y busca tu préstamo activo; si está habilitado, usa el botón Renovar.";
  }
  if (q.includes("multa") || q.includes("multas")) {
    return "Para verificar multas pendientes: ve a Mis Préstamos > Mis Multas. Si tienes adeudos, primero realiza el pago y luego valida/actualiza la sanción en el flujo de biblioteca.";
  }
  return "Puedo ayudarte con préstamos, renovaciones, devoluciones y multas. Prueba con: '¿Cómo hago un préstamo?' o '¿Tengo multas pendientes?'.";
}

const LMS_SYSTEM_PROMPT = `
Eres "Asistente Ducky", un chatbot de soporte del LMS de biblioteca.
Tu tarea es guiar al usuario paso a paso dentro del sitio, con respuestas breves, claras y accionables.

Contexto del sitio:
- Frontend principal (Biblioteca LMS): login, catalogo, prestamos, devoluciones, mis prestamos, mis multas.
- Hay roles: Alumno, Bibliotecario, Administrador.
- Alumno puede iniciar sesion aunque tenga multas/sancion.
- Si tiene multas pendientes, no puede solicitar nuevos prestamos hasta pagar.
- "Mis Prestamos" muestra prestamos activos/historial y "Mis Multas".
- Biblioteca aplica reglas generales: prestamo fisico con duracion aproximada de 5 dias habiles y renovaciones sujetas a politicas del sistema.
- El usuario tambien puede pagar multas en tesoreria y luego validar/actualizar estado de sancion en el flujo de biblioteca.

Comportamiento deseado:
- Si preguntan "Como hago un prestamo": indicar ruta y pasos (buscar recurso, solicitar, validar estado de cuenta/multas).
- Si preguntan "Cuanto dura un prestamo": explicar duracion general y recomendar revisar fecha limite exacta en detalle/boleta.
- Si preguntan "Como renuevo un libro": indicar seccion de prestamos y boton renovar si esta habilitado.
- Si preguntan "Tengo multas pendientes": indicar revisar "Mis Prestamos > Mis Multas" y, si aplica, tesoreria para pago.
- Si falta precision, dilo y guia a donde verificar en la UI.
- Nunca inventes endpoints internos ni credenciales.
- Responder siempre en espanol.
`;

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: OLLAMA_MODEL });
});

app.post("/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    if (!message) return res.status(400).json({ message: "message es requerido." });

    const messages = [
      { role: "system", content: LMS_SYSTEM_PROMPT.trim() },
      ...history
        .filter((h) => (h?.role === "user" || h?.role === "bot") && String(h?.text || "").trim())
        .slice(-12)
        .map((h) => ({ role: h.role === "bot" ? "assistant" : "user", content: String(h.text) })),
      { role: "user", content: message },
    ];

    const response = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: { temperature: 0.3 },
      },
      { timeout: 8_000 }
    );

    const reply = response?.data?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ message: "No se obtuvo respuesta del modelo." });
    }
    return res.json({ reply });
  } catch (_err) {
    // Fast fallback when model is still downloading / unavailable.
    return res.json({ reply: fallbackReply(req.body?.message) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`chatbot-microservice on :${PORT} model=${OLLAMA_MODEL}`);
});
