import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSiteContent } from "@/lib/site-content";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0 0 22 12z" />
  </svg>
);
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M23 7.2s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C16.7 3.5 12 3.5 12 3.5s-4.7 0-7.9.4c-.4.1-1.4.1-2.2 1-.7.7-.9 2.3-.9 2.3S.8 9 .8 10.9v1.8C.8 14.5 1 16.3 1 16.3s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1 1.7.2 7.7.3 7.7.3s4.7 0 7.9-.4c.4-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.7v-1.8c0-1.9-.2-3.7-.2-3.7zM9.7 14.6V8.2l6.1 3.2-6.1 3.2z" />
  </svg>
);

export async function Footer() {
  const { footer } = await getSiteContent();
  const telHref = `tel:${footer.phone.replace(/[^+\d]/g, "")}`;
  return (
    <footer className="mt-20 bg-gradient-to-br from-brand-800 via-brand-900 to-ink-900 text-white/80">
      <div className="border-b border-white/10 bg-gradient-to-br from-brand-700 to-brand-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <h3 className="text-2xl font-bold text-white">
              {footer.newsletterTitle}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              {footer.newsletterSubtitle}
            </p>
          </div>
          <form className="flex w-full max-w-md gap-2">
            <input
              type="email"
              required
              placeholder="tu@email.com"
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white outline-none backdrop-blur placeholder:text-white/50 focus:border-accent-500 focus:bg-white/15"
            />
            <button
              type="submit"
              className="rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-accent-400"
            >
              Suscribir
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Image
              src="/icb-logo.png"
              alt="ICB Tech"
              width={200}
              height={64}
              className="h-16 w-auto object-contain brightness-0 invert"
            />
            <p className="mt-4 max-w-sm text-sm text-ink-400">
              {footer.description}
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden />
                <Link href="/sucursales" className="hover:text-white">
                  {footer.locationsText}
                </Link>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-accent-500" aria-hidden />
                <a href={telHref} className="hover:text-white">
                  {footer.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-accent-500" aria-hidden />
                <a href={`mailto:${footer.email}`} className="hover:text-white">
                  {footer.email}
                </a>
              </li>
            </ul>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: FacebookIcon, href: footer.facebook, label: "Facebook" },
                { Icon: InstagramIcon, href: footer.instagram, label: "Instagram" },
                { Icon: YoutubeIcon, href: footer.youtube, label: "YouTube" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-accent-500 hover:text-ink-900"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {footer.columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm">
                {col.items.map((it, i) => (
                  <li key={i}>
                    <Link href={it.href} className="transition-colors hover:text-accent-500">
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink-500 md:flex-row">
          <p>© {new Date().getFullYear()} ICB Technologies. Todos los derechos reservados.</p>
          <p className="text-ink-500">
            Hecho con cuidado en Costa Rica 🇨🇷
          </p>
        </div>
      </div>
    </footer>
  );
}
