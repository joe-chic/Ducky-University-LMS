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
  const q = String(input || "").toLowerCase().trim();
  const hasAny = (terms) => terms.some((t) => q.includes(t));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const isQuestion = q.includes("?") || hasAny(["donde", "dónde", "como", "cómo", "que ", "qué ", "cual", "cuál"]);
  const lmsWords = [
    "libro", "libros", "recurso", "recursos", "catalogo", "catálogo",
    "biblioteca", "prestamo", "préstamo", "renovar", "devolucion", "devolución",
    "multa", "multas", "mis prestamos", "mis préstamos", "lms",
    "autor", "isbn", "issn", "editorial", "idioma", "titulo", "título",
  ];
  const isLmsQuery = hasAny(lmsWords);
  const resourceTerms = [
    "libro", "libros", "ebook", "e-book", "e book", "libro digital",
    "audiovisual", "video", "pelicula", "película", "documental",
    "mapa", "mapas", "cartograf",
    "articulo", "artículos", "articulo", "paper",
    "revista", "revistas", "journal", "journals",
    "recurso", "recursos", "material", "materiales",
  ];

  // LMS-first intents
  if (hasAny(["prestamo", "préstamo", "solicitar libro", "pedir libro"])) {
    return "Para hacer un préstamo: entra a Recursos, abre el material y solicita el ejemplar disponible. Si tienes multas pendientes, primero liquídalas para habilitar nuevos préstamos.";
  }
  if (hasAny(["donde veo libros", "dónde veo libros", "donde ver libros", "dónde ver libros", "ver libros", "buscar libros", "catalogo", "catálogo", "recursos"])) {
    return "Puedes ver el catálogo en la sección Recursos del LMS. Ahí puedes buscar por título/autor/tipo y abrir el detalle para revisar disponibilidad o solicitar préstamo.";
  }
  if (hasAny(["autor favorito", "mi autor", "por autor", "buscar autor", "autor"])) {
    return pick([
      "Para encontrar obras de tu autor favorito, entra a Recursos y busca por nombre/apellido del autor. Si aparecen muchos resultados, combina con tipo de recurso o palabras clave del título.",
      "Ve a Recursos y escribe el nombre del autor en la búsqueda. Luego filtra por tipo (libro, e-book, artículo, etc.) para quedarte con lo que te interesa.",
    ]);
  }
  if (hasAny(["isbn", "issn"])) {
    return "Sí puedes buscar por ISBN/ISSN: en Recursos pega el código completo (con o sin guiones). Si no aparece, prueba sin espacios y valida que el número sea exacto.";
  }
  if (hasAny(["editorial", "publisher", "idioma", "language", "titulo", "título", "palabra clave", "keyword"])) {
    return "En Recursos puedes buscar por metadatos como título, editorial, idioma o palabra clave. Escribe el dato y luego refina con el tipo de recurso para resultados más precisos.";
  }
  if (hasAny(resourceTerms)) {
    return pick([
      "Para encontrar ese tipo de contenido, entra a Recursos y usa búsqueda/filtros por tipo (libro, e-book, audiovisual, mapa, artículo o revista). Luego abre el detalle para ver disponibilidad o préstamo.",
      "Ese material se consulta en Recursos. Filtra por tipo (por ejemplo audiovisual, mapa, e-book, journal o artículo), revisa la ficha y desde ahí continúas con préstamo o consulta.",
      "Lo ubicas en Recursos del LMS: busca por palabras clave y tipo de recurso (libros, mapas, audiovisuales, e-books, artículos, revistas/journals). En la ficha verás cómo accederlo.",
    ]);
  }
  if ((hasAny(["cuanto", "cuánto", "dura", "duracion", "duración"]) && hasAny(["prestamo", "préstamo"]))) {
    return "Como referencia general, el préstamo físico dura cerca de 5 días hábiles. La fecha exacta la ves en Mis Préstamos.";
  }
  if (hasAny(["renovar", "renuevo", "renovacion", "renovación"])) {
    return "Para renovar, ve a Préstamos y busca tu préstamo activo. Si la política lo permite, verás la opción de renovar.";
  }
  if (hasAny(["multa", "multas", "sancion", "sanción"])) {
    return "Revisa Mis Préstamos > Mis Multas para ver adeudos. Si ya pagaste en tesorería, valida/actualiza tu estado para levantar la sanción.";
  }

  // Conversational intents
  if (hasAny(["hola", "buenas", "hello", "hi"])) {
    return pick([
      "Hola. Estoy para ayudarte con el LMS y con preguntas generales cortas.",
      "Hola, ¿qué necesitas hoy? Si quieres, te guío paso a paso.",
    ]);
  }
  if (hasAny(["como estas", "cómo estás", "que tal", "qué tal", "how are you"])) {
    return pick([
      "Todo bien por aquí. ¿En qué te ayudo?",
      "Bien, gracias. ¿Quieres ayuda con biblioteca o con una duda general?",
    ]);
  }
  if (hasAny(["gracias", "thanks"])) {
    return pick(["Con gusto.", "De nada, aquí sigo para ayudarte."]);
  }
  if (hasAny(["quien eres", "quién eres", "que puedes hacer", "qué puedes hacer", "ayuda"])) {
    return "Soy el Asistente Ducky: especializado en el LMS de biblioteca y también útil para preguntas generales simples.";
  }

  // General, non-LMS intents
  if (hasAny(["clima", "weather"])) {
    return "No tengo acceso a clima en tiempo real, pero puedes verlo rápido en tu app del clima o en Google con tu ciudad.";
  }
  if (hasAny(["hora", "fecha", "dia", "día"])) {
    return "No leo el reloj del dispositivo desde aquí, pero si quieres te ayudo con tu siguiente paso en el LMS.";
  }
  if (hasAny(["que es ia", "qué es ia", "inteligencia artificial"])) {
    return "La IA es tecnología que aprende patrones para responder, predecir o generar contenido en tareas concretas.";
  }
  if (hasAny(["como estudiar mejor", "cómo estudiar mejor", "tecnicas de estudio", "técnicas de estudio"])) {
    return "Tip rápido: estudia en bloques cortos, practica con preguntas y repasa en varios días para fijar memoria.";
  }
  if ((q.includes("resum") || q.includes("resúm")) && (q.includes("3 puntos") || q.includes("tres puntos"))) {
    return "Claro. Pega el texto y te lo resumo en 3 puntos clave.";
  }

  // Open fallback feels like chatbot, not strict rules.
  if (!isLmsQuery && isQuestion) {
    return pick([
      "No tengo esa información específica en este momento, pero puedo ayudarte con una respuesta breve si me das más contexto.",
      "No estoy conectado a datos en tiempo real para eso. Si quieres, lo intentamos con una versión más general.",
      "Esa sí se me sale un poco de alcance ahora mismo; te puedo dar una orientación rápida si me dices exactamente qué necesitas.",
    ]);
  }
  if (isLmsQuery) {
    return "Puedo ayudarte con eso dentro del LMS. Dime si buscas catálogo, préstamo, renovación o multas y te doy la ruta exacta.";
  }
  return pick([
    "Entiendo. Si quieres, te respondo corto y claro.",
    "Va, te ayudo. Dime tu objetivo en una frase y te doy una respuesta directa.",
  ]);
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
