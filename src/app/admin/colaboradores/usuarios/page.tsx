import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, getUserBranchId } from "@/lib/roles";
import {
  CollaboratorsManager,
  type Collaborator,
} from "@/components/admin/CollaboratorsManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPermisosPage() {
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
      <p className="mb-4 text-sm text-ink-600">
        Colaboradores y administradores. Los colaboradores solo acceden a
        marcar hora; los administradores acceden a este panel.
      </p>
      <CollaboratorsManager
        initialUsers={users}
        currentUserId={current?.id ?? null}
      />
    </div>
  );
}
