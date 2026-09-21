import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SGI_ORIGIN = "https://sgi.icbtechscr.com";

function safeDestination(value: string | null) {
  if (!value) return `${SGI_ORIGIN}/`;
  try {
    const url = new URL(value);
    return url.origin === SGI_ORIGIN ? url.toString() : `${SGI_ORIGIN}/`;
  } catch {
    return `${SGI_ORIGIN}/`;
  }
}

export async function GET(request: NextRequest) {
  const destination = safeDestination(request.nextUrl.searchParams.get("next"));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("https://icbtechscr.com/ingresar");
    login.searchParams.set("next", `/api/portal/sgi?next=${encodeURIComponent(destination)}`);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.redirect(destination);
  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith("sb-")) continue;
    response.cookies.set(cookie.name, cookie.value, {
      domain: ".icbtechscr.com",
      path: "/",
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return response;
}
