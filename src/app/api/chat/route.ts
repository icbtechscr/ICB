import { NextResponse } from "next/server";
import { generarRespuesta, type ChatMessage } from "@/lib/ai";
import { searchProductsLoose } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

type Body = { messages?: { role?: string; content?: string }[] };

// Herramienta que el modelo puede invocar para consultar el catálogo real.
const tools = [
  {
    type: "function" as const,
    function: {
      name: "buscar_productos",
      description:
        "Busca productos en el catálogo de ICB Tech por nombre, marca o SKU. " +
        "Úsala cuando el cliente pregunte por un producto, precio, marca o disponibilidad concretos. " +
        "Devuelve nombre, precio en colones (CRC), si está en oferta, disponibilidad y el enlace.",
      parameters: {
        type: "object",
        properties: {
          consulta: {
            type: "string",
            description:
              "Términos de búsqueda, ej. 'cámara dahua', 'laptop', 'switch de red'.",
          },
        },
        required: ["consulta"],
      },
    },
  },
];

const handlers = {
  buscar_productos: async (args: Record<string, unknown>) => {
    const q = String(args.consulta ?? "").trim();
    if (!q) return { productos: [] };
    const found = await searchProductsLoose(q, 8);
    return {
      productos: found.map((p) => ({
        nombre: p.name,
        precioCRC: p.salePriceCRC ?? p.priceCRC,
        precioListaCRC: p.priceCRC,
        enOferta: p.onSale,
        disponible: p.inStock,
        marca: p.brand,
        enlace: `${SITE_URL}/productos/${p.slug}`,
      })),
    };
  },
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const raw = Array.isArray(body.messages) ? body.messages : [];

    // Saneamos: solo roles válidos, contenido no vacío, y limitamos el historial
    // a los últimos 12 turnos para acotar tokens.
    const history: ChatMessage[] = raw
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 2000),
      }))
      .slice(-12);

    if (!history.length || history[history.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "Falta el mensaje del usuario." },
        { status: 400 }
      );
    }

    const { text } = await generarRespuesta(history, { tools, handlers });
    return NextResponse.json({ reply: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // No filtramos detalles internos al cliente.
    console.error("[/api/chat]", msg);
    const status = msg.includes("GROQ_API_KEY") ? 503 : 500;
    return NextResponse.json(
      {
        error:
          "El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.",
      },
      { status }
    );
  }
}
