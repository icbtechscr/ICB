import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserRole, canSell } from "@/lib/roles";
import { writeAuditEvent } from "@/lib/audit";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requestId = crypto.randomUUID();
  // Nunca confiar en identidad ni contexto enviados por el navegador.
  request.headers.set("x-audit-path", path);
  request.headers.set("x-audit-request-id", requestId);
  request.headers.delete("x-audit-user-id");
  request.headers.delete("x-audit-user-email");
  let response = NextResponse.next({ request });

  const protectedPath = ["/admin", "/api/admin", "/portal", "/marcar", "/vendedor", "/api/vendor"].some(p => path === p || path.startsWith(p + "/"));
  const authenticatedApi = ["/api/portal", "/api/timeclock", "/api/push"].some(p => path === p || path.startsWith(p + "/"));
  if (!protectedPath && !authenticatedApi) {
    if (!/\.[a-z0-9]+$/i.test(path) && !request.headers.has("next-router-prefetch")) {
      await writeAuditEvent({ action: "REQUEST_RECEIVED", table_name: "website", source: path, request_id: requestId,
        details: { method: request.method, outcome: "received", authenticated: false } });
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  let authError: string | null = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error?.message ?? null;
  } catch (error) {
    authError = error instanceof Error ? error.message : String(error);
  }

  if (authError && /refresh token|already used|not found/i.test(authError)) {
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        request.cookies.delete(cookie.name);
        response.cookies.delete(cookie.name);
      }
    }
  }

  if (user) {
    request.headers.set("x-audit-user-id", user.id);
    request.headers.set("x-audit-user-email", user.email || "");
    const savedCookies = response.cookies.getAll();
    response = NextResponse.next({ request });
    for (const cookie of savedCookies) response.cookies.set(cookie);
  }
  if (!request.headers.has("next-router-prefetch") && !path.startsWith("/admin/auditoria")) {
    await writeAuditEvent({ action: user ? "REQUEST_RECEIVED" : "REQUEST_UNAUTHENTICATED", table_name: "website", source: path,
      actor_id: user?.id, actor_email: user?.email, request_id: requestId,
      details: { method: request.method, outcome: "received", authenticated: !!user } });
  }

  if (!protectedPath) return response;

  function redirectWithCookies(url: URL) {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  const isLogin = path === "/admin/login";
  const isApi = path.startsWith("/api/admin");
  // Portal del colaborador (incluye rutas legadas /marcar y /vendedor,
  // que redirigen dentro del portal).
  const isPortal =
    path.startsWith("/portal") ||
    path.startsWith("/marcar") ||
    path.startsWith("/vendedor");
  const isPortalVender =
    path.startsWith("/portal/vender") || path.startsWith("/vendedor");
  const isVendorApi = path.startsWith("/api/vendor");
  const role = user ? getUserRole(user) : null;

  // Portal del colaborador: requiere sesión; vender requiere permiso de venta.
  if (isPortal || isVendorApi) {
    if (!user) {
      if (isVendorApi) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/ingresar";
      return redirectWithCookies(url);
    }
    if ((isPortalVender || isVendorApi) && !canSell(role!)) {
      if (isVendorApi) {
        return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return redirectWithCookies(url);
    }
    return response;
  }

  // Sin sesión → bloquear panel / api admin
  if (!user && !isLogin) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return redirectWithCookies(url);
  }

  // Colaborador autenticado intentando entrar al panel → a su portal.
  if (user && role === "colaborador" && !isLogin) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return redirectWithCookies(url);
  }

  // Ya logueado y entrando al login → mandar a su destino según rol.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = role === "colaborador" ? "/portal" : "/admin";
    return redirectWithCookies(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
