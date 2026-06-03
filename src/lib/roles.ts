// Rol y sedes de cada usuario viven en auth.users.user_metadata.
// Roles:
//   - admin: acceso al panel, NO marca.
//   - colaborador: solo marca hora.
//   - dev: acceso a todo (como admin) Y marca hora.
// Los usuarios sin `role` se tratan como 'admin' (compatibilidad).

export type UserRole = "admin" | "colaborador" | "dev";

type MetadataCarrier = {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

export function getUserRole(user: MetadataCarrier | null | undefined): UserRole {
  const raw =
    (user?.user_metadata?.role as string | undefined) ??
    (user?.app_metadata?.role as string | undefined);
  if (raw === "colaborador") return "colaborador";
  if (raw === "dev") return "dev";
  return "admin";
}

/** ¿Tiene acceso al panel admin? (admin o dev) */
export function isAdminLike(role: UserRole): boolean {
  return role === "admin" || role === "dev";
}

/** ¿Debe marcar hora? (colaborador o dev) */
export function mustClockIn(role: UserRole): boolean {
  return role === "colaborador" || role === "dev";
}

/** Sedes asignadas. Soporta `branch_ids` (array) y `branch_id` (legacy). */
export function getUserBranchIds(
  user: MetadataCarrier | null | undefined
): string[] {
  const arr = user?.user_metadata?.branch_ids;
  if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string");
  const single = user?.user_metadata?.branch_id as string | undefined;
  return single ? [single] : [];
}

/** Primera sede asignada (compatibilidad con código que espera una). */
export function getUserBranchId(
  user: MetadataCarrier | null | undefined
): string | null {
  return getUserBranchIds(user)[0] ?? null;
}

export function getUserFullName(
  user: (MetadataCarrier & { email?: string | null }) | null | undefined
): string {
  const full = user?.user_metadata?.full_name as string | undefined;
  return full || user?.email?.split("@")[0] || "";
}
