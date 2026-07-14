import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, canSell } from "@/lib/roles";
import { getConnection, meliConfigured } from "@/lib/meli";
import { MeliTool } from "@/components/portal/MeliTool";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MercadoLibre",
};

export default async function MercadoLibrePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  const role = getUserRole(user);
  if (!canSell(role)) redirect("/portal");

  const sp = await searchParams;
  const conn = await getConnection(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <MeliTool
        configured={meliConfigured()}
        connected={Boolean(conn)}
        nickname={conn?.nickname ?? null}
        ok={sp.ok === "1"}
        error={sp.error ?? null}
      />
    </div>
  );
}
