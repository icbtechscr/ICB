// Lógica del asistente virtual con IA (Groq).
// Adaptado del chatbot de WhatsApp de Centralia al contexto de la tienda ICB.
import Groq from "groq-sdk";
import { ICB_KNOWLEDGE } from "./chatbot-knowledge";
import { SITE_NAME } from "./site";

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

// Definición de tipos mínimos para las herramientas (function-calling).
type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};
type ToolHandlers = Record<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
>;

// Cliente perezoso: el módulo se importa aunque falte la API key; solo falla
// al intentar responder (no rompe el build ni otras rutas).
let groq: Groq | null = null;
function getGroq(): Groq {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Falta la variable GROQ_API_KEY");
    groq = new Groq({ apiKey });
  }
  return groq;
}

function buildSystemPrompt(): string {
  return `Eres el asistente virtual de atención al cliente de "${SITE_NAME}" y respondes en el chat de la tienda en línea.
Tu trabajo es contestar preguntas de clientes de forma amable, clara y breve, como lo haría un asesor competente que conoce bien el negocio.

Usa ÚNICAMENTE la información del negocio que aparece abajo y los resultados de la herramienta de búsqueda de productos. No inventes precios, productos, ni datos que no tengas.
Si te preguntan por un producto, precio o disponibilidad concreta, usa la herramienta "buscar_productos" antes de responder.
Si te preguntan algo que no está en esta información y no puedes consultarlo, dilo con honestidad y ofrece contactar a una persona o visitar una sucursal.
Responde siempre en español de Costa Rica, con un tono cercano y profesional. Mantén las respuestas cortas (2-4 frases) salvo que pidan más detalle.

================ INFORMACIÓN DEL NEGOCIO ================
${ICB_KNOWLEDGE}
========================================================`;
}

/**
 * Genera la respuesta de la IA para el historial de conversación dado.
 * @param history mensajes [{role, content}] (incluye el último del usuario).
 * @param opts.tools / opts.handlers para function-calling (búsqueda de productos).
 */
export async function generarRespuesta(
  history: ChatMessage[],
  opts: { tools?: ToolDef[] | null; handlers?: ToolHandlers | null } = {}
): Promise<{ text: string; tokens: number }> {
  const { tools = null, handlers = null } = opts;

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt() },
    ...history.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })),
  ];

  const fallback = "Disculpa, no pude procesar tu mensaje. ¿Puedes repetirlo?";

  // ---- Con herramientas: bucle de function-calling ----
  if (tools && tools.length && handlers) {
    let totalTokens = 0;
    for (let step = 0; step < 5; step++) {
      const completion = await getGroq().chat.completions.create({
        model: GROQ_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 600,
        tools,
        tool_choice: "auto",
      });
      totalTokens += completion.usage?.total_tokens || 0;
      const msg = completion.choices[0]?.message;
      if (!msg) break;
      messages.push(msg);

      const calls = msg.tool_calls || [];
      if (!calls.length) {
        return { text: (msg.content || "").trim() || fallback, tokens: totalTokens };
      }
      for (const tc of calls) {
        let result: unknown;
        try {
          const args = JSON.parse(tc.function?.arguments || "{}");
          const fn = handlers[tc.function?.name];
          result = fn ? await fn(args) : { error: "herramienta desconocida" };
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }
    return { text: fallback, tokens: totalTokens };
  }

  // ---- Sin herramientas: Q&A simple ----
  const completion = await getGroq().chat.completions.create({
    model: GROQ_MODEL,
    messages,
    temperature: 0.4,
    max_tokens: 500,
  });
  const text = completion.choices[0]?.message?.content?.trim() || fallback;
  return { text, tokens: completion.usage?.total_tokens || 0 };
}
