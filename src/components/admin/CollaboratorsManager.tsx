"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  Lock,
  User,
  UserPlus,
  Trash2,
  Pencil,
  Check,
  X,
  ShieldCheck,
  MapPin,
  KeyRound,
} from "lucide-react";
import { BRANCHES } from "@/lib/branches";

export type Collaborator = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "colaborador";
  branchId: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

const BRANCH_NAME: Record<string, string> = Object.fromEntries(
  BRANCHES.map((b) => [b.id, b.city])
);

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CollaboratorsManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: Collaborator[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<Collaborator[]>(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "colaborador">("colaborador");
  const [branchId, setBranchId] = useState<string>(BRANCHES[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "colaborador">("colaborador");
  const [editBranch, setEditBranch] = useState<string>("");

  async function reload() {
    try {
      const res = await fetch("/api/admin/collaborators", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { users: Collaborator[] };
        setUsers(json.users);
      }
    } catch {
      /* ignore */
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          branchId: role === "colaborador" ? branchId : null,
        }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setOk(`Usuario ${email.trim()} creado.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("colaborador");
      await reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(u: Collaborator) {
    setEditId(u.id);
    setEditName(u.name);
    setEditRole(u.role);
    setEditBranch(u.branchId ?? BRANCHES[0]?.id ?? "");
    setError(null);
    setOk(null);
  }

  async function saveEdit(u: Collaborator) {
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/collaborators/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          role: editRole,
          branchId: editRole === "colaborador" ? editBranch : null,
        }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id
            ? {
                ...x,
                name: editName.trim(),
                role: editRole,
                branchId: editRole === "colaborador" ? editBranch : null,
              }
            : x
        )
      );
      setEditId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(u: Collaborator) {
    const np = prompt(`Nueva contraseña para ${u.email} (mínimo 8 caracteres):`);
    if (!np) return;
    if (np.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setBusyId(u.id);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/admin/collaborators/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: np }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setOk(`Contraseña de ${u.email} actualizada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(u: Collaborator) {
    if (!confirm(`¿Eliminar a ${u.email}? Perderá el acceso de inmediato.`))
      return;
    setError(null);
    setOk(null);
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/collaborators/${u.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  const admins = users
    .filter((u) => u.role === "admin")
    .sort((a, b) => a.name.localeCompare(b.name));
  const colabs = users
    .filter((u) => u.role === "colaborador")
    .sort((a, b) => {
      const ba = BRANCH_NAME[a.branchId ?? ""] ?? "";
      const bb = BRANCH_NAME[b.branchId ?? ""] ?? "";
      return ba.localeCompare(bb) || a.name.localeCompare(b.name);
    });

  function userRow(u: Collaborator) {
    const isSelf = u.id === currentUserId;
    const editing = editId === u.id;
    return (
      <li key={u.id} className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                u.role === "admin"
                  ? "bg-brand-50 text-brand-600"
                  : "bg-accent-50 text-accent-700"
              }`}
            >
              {u.role === "admin" ? (
                <ShieldCheck className="size-4" />
              ) : (
                <User className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre"
                  className="w-48 rounded-lg border border-ink-200 bg-transparent px-2 py-1 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              ) : (
                <p className="truncate text-sm font-semibold text-ink-900">
                  {u.name || (
                    <span className="italic text-ink-400">Sin nombre</span>
                  )}
                  {isSelf && (
                    <span className="ml-2 rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-700">
                      Vos
                    </span>
                  )}
                </p>
              )}
              <p className="truncate text-xs text-ink-500">{u.email}</p>
              {u.role === "colaborador" && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-400">
                  <MapPin className="size-3" />
                  {u.branchId
                    ? BRANCH_NAME[u.branchId] ?? u.branchId
                    : "Sin sede"}
                </p>
              )}
              <p className="text-xs text-ink-400">
                Último ingreso {fmt(u.lastSignInAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => saveEdit(u)}
                  disabled={busyId === u.id}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-accent-300 bg-accent-50 text-accent-700 hover:bg-accent-100 disabled:opacity-50"
                >
                  {busyId === u.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => resetPassword(u)}
                  title="Cambiar contraseña"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  <KeyRound className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(u)}
                  title="Editar"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteUser(u)}
                  disabled={isSelf || busyId === u.id}
                  title={
                    isSelf ? "No podés eliminar tu propio usuario" : "Eliminar"
                  }
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyId === u.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3 grid grid-cols-2 gap-3 pl-12">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-500">
                Rol
              </span>
              <select
                value={editRole}
                onChange={(e) =>
                  setEditRole(e.target.value as "admin" | "colaborador")
                }
                className="w-full rounded-lg border border-ink-200 bg-transparent px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-500"
              >
                <option value="colaborador">Colaborador</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-500">
                Sede
              </span>
              <select
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                disabled={editRole === "admin"}
                className="w-full rounded-lg border border-ink-200 bg-transparent px-2 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-500 disabled:opacity-50"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.city}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Crear */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-ink-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="size-5 text-brand-600" />
            <h2 className="text-base font-bold text-ink-900">Agregar usuario</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          {ok && (
            <div className="mb-4 rounded-xl border border-accent-200 bg-accent-50 px-4 py-2.5 text-sm text-accent-700">
              {ok}
            </div>
          )}

          <form onSubmit={createUser}>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                Nombre
              </span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-xl border border-ink-200 bg-transparent py-2.5 pl-10 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                Correo
              </span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@icbtechscr.com"
                  className="w-full rounded-xl border border-ink-200 bg-transparent py-2.5 pl-10 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>
            </label>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                Contraseña
              </span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  className="w-full rounded-xl border border-ink-200 bg-transparent py-2.5 pl-10 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>
            </label>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                  Rol
                </span>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "admin" | "colaborador")
                  }
                  className="w-full rounded-xl border border-ink-200 bg-transparent py-2.5 px-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-500">
                  Sede
                </span>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={role === "admin"}
                  className="w-full rounded-xl border border-ink-200 bg-transparent py-2.5 px-3 text-sm text-ink-900 outline-none focus:border-brand-500 disabled:opacity-50"
                >
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {creating && <Loader2 className="size-4 animate-spin" />}
              Crear usuario
            </button>
          </form>
        </div>
      </div>

      {/* Lista agrupada */}
      <div className="space-y-6">
        <Group
          title="Administradores"
          count={admins.length}
          tint="text-brand-600"
        >
          {admins.length ? (
            <ul className="divide-y divide-ink-100">{admins.map(userRow)}</ul>
          ) : (
            <Empty>Sin administradores.</Empty>
          )}
        </Group>

        <Group
          title="Colaboradores"
          count={colabs.length}
          tint="text-accent-700"
        >
          {colabs.length ? (
            <ul className="divide-y divide-ink-100">{colabs.map(userRow)}</ul>
          ) : (
            <Empty>Aún no hay colaboradores. Agregá uno desde la izquierda.</Empty>
          )}
        </Group>
      </div>
    </div>
  );
}

function Group({
  title,
  count,
  tint,
  children,
}: {
  title: string;
  count: number;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        <span
          className={`rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold ${tint}`}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-ink-400">{children}</p>;
}
