import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Se comparte una única instancia para evitar carreras de refresh-token entre
// componentes que montan el cliente al mismo tiempo.
let browserClient: SupabaseClient | null = null;

export function createSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return browserClient;
}

export async function signOutWithAudit() {
  try { await fetch("/api/auth/logout", { method: "POST", signal: AbortSignal.timeout(10000) }); }
  catch { /* Mantener la posibilidad de salir si el servidor no responde. */ }
  return createSupabaseBrowser().auth.signOut();
}
