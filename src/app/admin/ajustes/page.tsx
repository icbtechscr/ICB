import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AjustesPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Settings className="size-7" />
      </div>
      <h1 className="text-xl font-black text-ink-900">Ajustes</h1>
      <p className="mt-2 text-sm text-ink-500">
        Por ahora no hay configuraciones disponibles. Esta sección estará
        habilitada próximamente.
      </p>
    </div>
  );
}
