import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dark = (await cookies()).get("admin-theme")?.value === "dark";
  return <AdminShell initialDark={dark}>{children}</AdminShell>;
}
