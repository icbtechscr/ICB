"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = createSupabaseBrowser();
      const { error } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Correo o contraseña incorrectos."
            : error.message
        );
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-accent-400/20 to-brand-500/20 blur-2xl" />
      <form
        onSubmit={onSubmit}
        className="rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
            <ShieldCheck className="size-7 text-accent-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">ICB Admin</h1>
          <p className="mt-1 text-sm text-white/70">
            Ingresá tus credenciales para continuar.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-sm text-red-100">
            {error}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/70">
            Correo
          </span>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/50" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@icbtechscr.com"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none backdrop-blur placeholder:text-white/40 focus:border-accent-400 focus:bg-white/15"
            />
          </div>
        </label>

        <label className="mb-6 block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/70">
            Contraseña
          </span>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/50" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm text-white outline-none backdrop-blur placeholder:text-white/40 focus:border-accent-400 focus:bg-white/15"
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </button>
      </form>
    </div>
  );
}
