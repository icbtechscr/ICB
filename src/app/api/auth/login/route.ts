import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const email = typeof credentials.email === "string" ? credentials.email.trim() : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Ingresá el correo y la contraseña." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");

  // La sesión anterior no debe intervenir en un nuevo inicio de sesión.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) response.cookies.delete(cookie.name);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        {
          error:
            error.message === "Invalid login credentials"
              ? "Correo o contraseña incorrectos."
              : error.message,
        },
        { status: 401 }
      );
    }
    return response;
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Intentá de nuevo." },
      { status: 503 }
    );
  }
}
