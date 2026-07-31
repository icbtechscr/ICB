// Adorno del Dia de la Madre: flores y petalos muy suaves detras del
// encabezado. Es puramente decorativo (aria-hidden) y no intercepta clics, para
// que no estorbe la busqueda ni el carrito. Todo es SVG en linea: cero
// peticiones extra y cero impacto en la carga.

function Flower({
  size,
  className,
  style,
}: {
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx="20"
          cy="11"
          rx="5.4"
          ry="8.6"
          fill="currentColor"
          transform={`rotate(${deg} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="4.2" fill="#f6c453" />
    </svg>
  );
}

function Heart({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M12 21s-7.5-4.7-9.5-9.2C1 8.4 2.7 5 6.2 5c2 0 3.4 1.1 4.3 2.4l.7 1 .7-1C12.8 6.1 14.2 5 16.2 5c3.5 0 5.2 3.4 3.7 6.8C17.9 16.3 12 21 12 21z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Franja delgada arriba de todo con el saludo de la temporada. */
export function MothersDayBar() {
  return (
    <div
      className="w-full border-b border-pink-200/60 dark:border-pink-300/15"
      style={{
        background:
          "linear-gradient(90deg, rgba(252,231,243,0.55) 0%, rgba(251,207,232,0.85) 50%, rgba(252,231,243,0.55) 100%)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-3 py-1.5 sm:px-4">
        <Flower size={14} className="text-pink-500/70" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-700 sm:text-xs dark:text-pink-300">
          Mes de la mamá
        </span>
        <Flower size={14} className="text-pink-500/70" aria-hidden />
      </div>
    </div>
  );
}

/**
 * Florecillas sueltas por toda la pagina. Van en una capa fija sobre el
 * contenido pero con opacidad muy baja, para que se vean incluso encima de las
 * secciones blancas sin estorbar la lectura. No recibe clics ni se lee en
 * lectores de pantalla, y en pantallas chicas se muestran menos.
 */
export function MothersDayPageDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5] select-none overflow-hidden"
    >
      <Flower
        size={110}
        className="absolute -left-8 top-[22vh] text-pink-400/[0.07] dark:text-pink-200/[0.05]"
        style={{ transform: "rotate(-14deg)" }}
      />
      <Flower
        size={64}
        className="absolute right-[4vw] top-[38vh] hidden text-rose-400/[0.08] sm:block dark:text-rose-200/[0.05]"
        style={{ transform: "rotate(22deg)" }}
      />
      <Flower
        size={46}
        className="absolute left-[12vw] bottom-[14vh] hidden text-pink-400/[0.08] md:block dark:text-pink-200/[0.05]"
        style={{ transform: "rotate(8deg)" }}
      />
      <Flower
        size={88}
        className="absolute -right-6 bottom-[6vh] text-rose-400/[0.07] dark:text-rose-200/[0.05]"
        style={{ transform: "rotate(-24deg)" }}
      />
      <Heart
        size={26}
        className="absolute left-[6vw] top-[62vh] hidden text-rose-400/[0.09] lg:block dark:text-rose-200/[0.06]"
      />
      <Heart
        size={20}
        className="absolute right-[16vw] bottom-[30vh] hidden text-pink-400/[0.09] lg:block dark:text-pink-200/[0.06]"
      />
    </div>
  );
}

export function MothersDayDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/* Velo rosado apenas perceptible, para dar calidez sin tapar nada. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(244,114,182,0.10) 0%, rgba(244,114,182,0) 42%, rgba(244,114,182,0) 62%, rgba(236,72,153,0.12) 100%)",
        }}
      />

      {/* Ramillete izquierdo */}
      <Flower
        size={72}
        className="absolute -left-5 -top-6 text-pink-400/25 dark:text-pink-300/15"
        style={{ transform: "rotate(-18deg)" }}
      />
      <Flower
        size={38}
        className="absolute left-12 -top-3 text-rose-300/30 dark:text-rose-200/15"
        style={{ transform: "rotate(12deg)" }}
      />
      <Heart
        size={16}
        className="absolute left-24 top-8 text-rose-400/25 dark:text-rose-200/15"
      />

      {/* Ramillete derecho */}
      <Flower
        size={84}
        className="absolute -right-7 -bottom-9 text-rose-400/20 dark:text-rose-300/12"
        style={{ transform: "rotate(24deg)" }}
      />
      <Flower
        size={40}
        className="absolute right-16 -bottom-4 text-pink-300/28 dark:text-pink-200/15"
        style={{ transform: "rotate(-10deg)" }}
      />
      <Heart
        size={14}
        className="absolute right-36 bottom-6 hidden text-pink-400/25 sm:block dark:text-pink-200/15"
      />

      {/* Hilo inferior en degradado, en vez del borde plano de siempre. */}
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(236,72,153,0) 0%, rgba(236,72,153,0.45) 22%, rgba(244,114,182,0.55) 50%, rgba(236,72,153,0.45) 78%, rgba(236,72,153,0) 100%)",
        }}
      />
    </div>
  );
}
