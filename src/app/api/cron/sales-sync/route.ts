import { NextResponse } from "next/server";
import { syncCpiSales } from "@/lib/cpi-sales";
import { syncCpiProductSales } from "@/lib/cpi-products";
import { cpiConfigured } from "@/lib/cpi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sync horario disparado por Vercel Cron (Authorization: Bearer CRON_SECRET).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return new NextResponse("No autorizado", { status: 401 });
    }
  }
  if (!cpiConfigured()) {
    return NextResponse.json({ skipped: true, reason: "CPI sin configurar" });
  }
  try {
    const [sales, products] = await Promise.all([
      syncCpiSales(),
      syncCpiProductSales(),
    ]);
    return NextResponse.json({ sales, products });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
