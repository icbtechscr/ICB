import styles from "./HalloweenCatalogAccent.module.css";

/** Adornos estáticos: no suman animaciones por cada tarjeta del catálogo. */
export function HalloweenCatalogAccent({ variant = "section" }: { variant?: "section" | "card" }) {
  return <span aria-hidden="true" className={`${styles.accent} ${variant === "card" ? styles.card : styles.section}`}>
    <svg viewBox="0 0 52 46" width="32" height="28">
      <path d="M24 12Q20 3 29 2L31 6Q25 6 28 13" fill="#718447" />
      <ellipse cx="26" cy="28" rx="23" ry="17" fill="#dc6826" />
      <ellipse cx="26" cy="28" rx="13" ry="17" fill="#fba44b" />
      <path d="M12 25L21 19L22 28Z M30 28L32 19L41 25Z M13 32L21 35L25 32L30 36L39 31Q35 42 25 41Q17 40 13 32" fill="#563452" />
      <path d="M15 25L20 22L20 26Z M33 26L34 22L38 25Z" fill="#fff0bf" />
    </svg>
    {variant === "section" && <svg viewBox="0 0 68 30" width="32" height="16" className={styles.bat}>
      <path d="M34 16L29 7L26 13Q15 13 2 2Q3 23 14 24Q18 15 23 26Q29 21 34 29Q39 21 45 26Q50 15 54 24Q65 23 66 2Q53 13 42 13L39 7Z" fill="currentColor" />
    </svg>}
  </span>;
}
