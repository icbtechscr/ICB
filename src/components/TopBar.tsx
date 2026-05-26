import { Truck, Phone, ShieldCheck } from "lucide-react";

export function TopBar() {
  return (
    <div className="hidden border-b border-white/10 bg-ink-900/40 text-white backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" aria-hidden />
            Envíos a todo Costa Rica
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden />
            Garantía oficial
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="tel:+50622223333"
            className="inline-flex items-center gap-1.5 hover:text-accent-400 transition-colors"
          >
            <Phone className="size-3.5" aria-hidden />
            +506 2222 3333
          </a>
          <span className="text-white/60">|</span>
          <a href="/contacto" className="hover:text-accent-400 transition-colors">
            Soporte
          </a>
        </div>
      </div>
    </div>
  );
}
