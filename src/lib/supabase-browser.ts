import { createBrowserClient } from "@supabase/ssr";

// Se comparte una única instancia para evitar carreras de refresh-token entre
// componentes que montan el cliente al mismo tiempo.
let browserClient: any = null;

export function createSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
  }
  return browserClient;
}
