import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase";
import { getUserBranchId, getUserFullName } from "@/lib/roles";
import { isPunchType } from "@/lib/timeclock";
import { getBranch, distanceMeters, BRANCH_RADIUS_M } from "@/lib/branches";

export async function POST(req: Request) {
  try {
    // 1. Validar sesión: solo un usuario autenticado puede marcar, y solo
    //    puede marcar por sí mismo (tomamos su id de la sesión, no del body).
    const sb = await createSupabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return new NextResponse("No autenticado", { status: 401 });
    }

    const body = (await req.json()) as {
      punchType?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };

    if (!isPunchType(body.punchType)) {
      return new NextResponse("Tipo de marcaje inválido", { status: 400 });
    }

    const branchId = getUserBranchId(user);
    const branch = getBranch(branchId);

    const lat = typeof body.latitude === "number" ? body.latitude : null;
    const lng = typeof body.longitude === "number" ? body.longitude : null;

    // 2. Calcular distancia a la sede asignada (si hay coordenadas).
    let distance: number | null = null;
    let withinRange: boolean | null = null;
    if (branch && lat !== null && lng !== null) {
      distance = distanceMeters(lat, lng, branch.lat, branch.lng);
      withinRange = distance <= BRANCH_RADIUS_M;
    }

    // 3. Insertar con el service role (la tabla tiene RLS sin políticas).
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("time_entries")
      .insert({
        user_id: user.id,
        employee_name: getUserFullName(user),
        branch_id: branchId,
        branch_name: branch?.name ?? null,
        punch_type: body.punchType,
        latitude: lat,
        longitude: lng,
        accuracy_m: typeof body.accuracy === "number" ? body.accuracy : null,
        distance_m: distance,
        within_range: withinRange,
      })
      .select("*")
      .single();

    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json({ ok: true, entry: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(msg, { status: 500 });
  }
}
