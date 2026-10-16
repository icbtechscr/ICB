import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, isAdminLike } from "@/lib/roles";
import { ScheduleBoard } from "@/components/admin/ScheduleBoard";

export const dynamic = "force-dynamic";
export default async function CronogramaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isAdminLike(getUserRole(user))) redirect("/portal");
  return <ScheduleBoard canManage={getUserRole(user) === "dev"} />;
}
