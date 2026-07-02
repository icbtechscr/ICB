import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, getUserFullName } from "@/lib/roles";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: {
    default: "Portal del colaborador — ICB Technologies",
    template: "%s — Portal ICB",
  },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  return (
    <PortalShell name={getUserFullName(user)} role={getUserRole(user)}>
      {children}
    </PortalShell>
  );
}
