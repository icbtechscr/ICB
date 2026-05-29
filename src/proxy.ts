import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserRole } from "@/lib/roles";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/admin/login";
  const isApi = path.startsWith("/api/admin");
  const isMarcar = path.startsWith("/marcar");
  const role = user ? getUserRole(user) : null;

  // Marcaje de horario: solo requiere sesión (admins o colaboradores).
  if (isMarcar) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/ingresar";
      return NextResponse.redirect(url);
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
    return NextResponse.redirect(url);
  }

  // Colaborador autenticado intentando entrar al panel → a marcar hora.
  if (user && role === "colaborador" && !isLogin) {
    if (isApi) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/marcar";
    return NextResponse.redirect(url);
  }

  // Ya logueado y entrando al login → mandar a su destino según rol.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = role === "colaborador" ? "/marcar" : "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/marcar/:path*"],
};
