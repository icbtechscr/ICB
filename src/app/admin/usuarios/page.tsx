import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server";
import { UsersManager, type AdminUser } from "@/components/admin/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const current = await getCurrentUser();
  let users: AdminUser[] = [];
  try {
    const sb = createAdminClient();
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    users = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    }));
  } catch {
    users = [];
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink-900">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Administradores con acceso al panel. Todos tienen permisos
          completos.
        </p>
      </div>
      <UsersManager initialUsers={users} currentUserId={current?.id ?? null} />
    </div>
  );
}
