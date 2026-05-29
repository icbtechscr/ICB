import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserBranchId, getUserFullName } from "@/lib/roles";
import { getBranch } from "@/lib/branches";
import { listMyEntriesRange } from "@/lib/timeclock-server";
import { crTodayIso } from "@/lib/timeclock";
import { PunchPanel } from "@/components/timeclock/PunchPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Marcar hora — ICB Technologies",
};

export default async function MarcarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const branchId = getUserBranchId(user);
  const branch = getBranch(branchId);
  // Hoy + últimos 13 días de historial.
  const today = crTodayIso();
  const from = crTodayIso(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  const entries = await listMyEntriesRange(user.id, from, today);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-10">
        <PunchPanel
          employeeName={getUserFullName(user)}
          branch={
            branch
              ? { id: branch.id, name: branch.name, address: branch.address }
              : null
          }
          initialEntries={entries}
        />
      </div>
    </div>
  );
}
