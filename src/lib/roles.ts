// Rol y sede de cada usuario viven en auth.users.user_metadata.
// Los administradores existentes no tienen `role` definido: por compatibilidad
// se tratan como 'admin' salvo que explícitamente sean 'colaborador'.

export type UserRole = "admin" | "colaborador";

type MetadataCarrier = {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

export function getUserRole(user: MetadataCarrier | null | undefined): UserRole {
  const raw =
    (user?.user_metadata?.role as string | undefined) ??
    (user?.app_metadata?.role as string | undefined);
  return raw === "colaborador" ? "colaborador" : "admin";
}

export function getUserBranchId(
  user: MetadataCarrier | null | undefined
): string | null {
  return (user?.user_metadata?.branch_id as string | undefined) ?? null;
}

export function getUserFullName(
  user: (MetadataCarrier & { email?: string | null }) | null | undefined
): string {
  const full = user?.user_metadata?.full_name as string | undefined;
  return full || user?.email?.split("@")[0] || "";
}
