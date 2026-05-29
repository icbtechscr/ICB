import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, getUserBranchId } from "@/lib/roles";
import {
  CollaboratorsManager,
  type Collaborator,
} from "@/components/admin/CollaboratorsManager";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const current = await getCurrentUser();
  let users: Collaborator[] = [];
  try {
    const sb = createAdminClient();
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
    users = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.full_name as string) ?? "",
      role: getUserRole(u),
      branchId: getUserBranchId(u),
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    }));
  } catch {
    users = [];
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-ink-900">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Configuración del panel y gestión de accesos.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Users className="size-5 text-brand-600" />
          <h2 className="text-lg font-bold text-ink-900">Usuarios y permisos</h2>
        </div>
        <p className="mb-4 text-sm text-ink-600">
          Administradores (acceso al panel) y colaboradores (marcaje de horario).
          Asigná el rol y la sede de cada quien.
        </p>
        <CollaboratorsManager
          initialUsers={users}
          currentUserId={current?.id ?? null}
        />
      </section>
    </div>
  );
}
