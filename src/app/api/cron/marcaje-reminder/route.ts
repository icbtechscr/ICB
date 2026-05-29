import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";
import { crTodayIso, crDayRangeUtcFromIso } from "@/lib/timeclock";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Seguridad: Vercel Cron envía Authorization: Bearer <CRON_SECRET>.
  // También se acepta ?secret= para pruebas manuales.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qs = new URL(req.url).searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qs !== secret) {
      return new NextResponse("No autorizado", { status: 401 });
    }
  }

  try {
    const admin = createAdminClient();

    // 1. Colaboradores activos.
    const { data: usersData, error: usersErr } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
    if (usersErr) return new NextResponse(usersErr.message, { status: 500 });
    const colaboradores = usersData.users.filter(
      (u) => getUserRole(u) === "colaborador"
    );

    // 2. Quiénes ya marcaron entrada hoy (hora CR).
    const { start, end } = crDayRangeUtcFromIso(crTodayIso());
    const { data: entradas } = await admin
      .from("time_entries")
      .select("user_id")
      .eq("punch_type", "entrada")
      .gte("punched_at", start)
      .lt("punched_at", end);
    const marked = new Set((entradas ?? []).map((e) => e.user_id as string));

    // 3. Colaboradores que NO han marcado.
    const pending = colaboradores.filter((u) => !marked.has(u.id));
    if (pending.length === 0) {
      return NextResponse.json({ ok: true, pending: 0, sent: 0 });
    }

    // 4. Suscripciones push de esos colaboradores.
    const ids = pending.map((u) => u.id);
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", ids);

    let sent = 0;
    let removed = 0;
    for (const s of subs ?? []) {
      const result = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        {
          title: "ICB Marcaje",
          body: "Aún no has marcado tu entrada de hoy. Tocá para marcar.",
          url: "/marcar",
          tag: "marcaje-reminder",
        }
      );
      if (result === "ok") sent++;
      else if (result === "gone") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", s.endpoint);
        removed++;
      }
    }

    return NextResponse.json({
      ok: true,
      pending: pending.length,
      sent,
      removed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
