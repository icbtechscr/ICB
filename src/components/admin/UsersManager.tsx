"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  Lock,
  UserPlus,
  Trash2,
  ShieldCheck,
} from "lucide-react";

export type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: AdminUser[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function reload() {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { users: AdminUser[] };
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
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setOk(`Usuario ${email.trim()} creado.`);
      setEmail("");
      setPassword("");
      await reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(u: AdminUser) {
    if (
      !confirm(
        `¿Eliminar a ${u.email}? Perderá el acceso al panel de inmediato.`
      )
    )
      return;
    setError(null);
    setOk(null);
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
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
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* Crear usuario */}
      <div className="rounded-2xl border border-ink-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="size-5 text-brand-600" />
          <h2 className="text-base font-bold text-ink-900">
            Nuevo administrador
          </h2>
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
              Correo
            </span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nuevo@icbtechscr.com"
                className="w-full rounded-xl border border-ink-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </label>
          <label className="mb-4 block">
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
                className="w-full rounded-xl border border-ink-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <span className="mt-1 block text-xs text-ink-400">
              Compartila con el nuevo admin. Podrá cambiarla luego.
            </span>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            Crear administrador
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-ink-200 bg-white p-6">
        <h2 className="mb-4 text-base font-bold text-ink-900">
          Administradores ({users.length})
        </h2>
        <ul className="divide-y divide-ink-100">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-700">
                          Vos
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      Creado {fmt(u.createdAt)} · Último ingreso{" "}
                      {fmt(u.lastSignInAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteUser(u)}
                  disabled={isSelf || deletingId === u.id}
                  title={
                    isSelf
                      ? "No podés eliminar tu propio usuario"
                      : "Eliminar"
                  }
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-500"
                >
                  {deletingId === u.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            );
          })}
          {users.length === 0 && (
            <li className="py-6 text-center text-sm text-ink-400">
              No se pudieron cargar los usuarios.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
