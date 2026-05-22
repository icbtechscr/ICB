import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BackgroundShader } from "@/components/ui/background-shader";

export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.35} />

      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">{title}</span>
        </nav>

        <h1 className="text-4xl font-black tracking-tight drop-shadow md:text-5xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-3 text-sm leading-relaxed text-white/80">{intro}</p>
        )}
        {updated && (
          <p className="mt-2 text-xs text-white/55">
            Última actualización: {updated}
          </p>
        )}

        <div className="legal-prose mt-10 space-y-6 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{heading}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-white/80">
        {children}
      </div>
    </section>
  );
}
