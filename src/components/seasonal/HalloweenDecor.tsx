import styles from "./HalloweenDecor.module.css";

function Pumpkin({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 100 88" width="100" height="88" aria-hidden="true" className={`${styles.pumpkin} ${className}`}>
    <path d="M47 20Q42 7 56 4L61 10Q50 10 54 22" fill="#748947" />
    <path d="M51 22Q67 9 76 20Q68 26 53 24" fill="#a1b861" />
    <ellipse cx="50" cy="52" rx="44" ry="32" fill="#c44d15" />
    <ellipse cx="34" cy="52" rx="24" ry="32" fill="#ed731e" />
    <ellipse cx="67" cy="52" rx="23" ry="32" fill="#e46a1b" />
    <ellipse cx="50" cy="52" rx="20" ry="33" fill="#ff922d" />
    <path d="M26 44L40 34L43 48Z M58 48L62 34L76 44Z M46 54L51 47L56 54Z M26 59L38 65L43 60L49 68L56 61L62 65L75 57Q69 78 51 77Q34 77 26 59" fill="#33202e" />
    <g className={styles.eyes} fill="#ffe59b">
      <path d="M29 43L38 38L40 45Z M61 45L64 38L73 43Z" />
      <path d="M33 64L38 68L43 65L49 73L56 66L62 69L68 64Q59 77 48 74Q38 72 33 64" />
    </g>
    <path d="M21 31Q14 40 15 49" fill="none" stroke="#ffbd69" strokeWidth="3" strokeLinecap="round" opacity=".7" />
  </svg>;
}

function Bat({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 90 40" width="90" height="40" aria-hidden="true" className={`${styles.bat} ${className}`}>
    <path d="M45 20L40 8L36 17Q20 17 3 2Q4 28 18 29Q22 17 30 32Q37 24 45 39Q53 24 60 32Q68 17 72 29Q86 28 87 2Q70 17 54 17L50 8Z" fill="currentColor" />
  </svg>;
}

export function HalloweenBar({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return <div className={styles.bar} data-paused={paused}>
    <div className={styles.barInner}>
      <div className={styles.greeting}><Pumpkin /><span>Mes de terror</span><Pumpkin className={styles.secondPumpkin} /></div>
      <button type="button" className={styles.toggle} onClick={onToggle} aria-pressed={paused} aria-label={paused ? "Activar animaciones de Halloween" : "Pausar animaciones de Halloween"} title={paused ? "Activar animaciones" : "Pausar animaciones"}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{paused ? <path d="M3 1L11 6L3 11Z" fill="currentColor" /> : <path d="M3 2V10M9 2V10" stroke="currentColor" strokeWidth="2" />}</svg>
      </button>
    </div>
  </div>;
}

export function HalloweenHeaderDecor({ paused }: { paused: boolean }) {
  return <div aria-hidden="true" className={styles.headerDecor} data-paused={paused}>
    <svg className={styles.web} width="105" height="90" viewBox="0 0 105 90"><g fill="none" stroke="currentColor" strokeWidth="1"><path d="M0 0L100 0M0 0L86 44M0 0L51 78M0 0L0 90M24 0Q24 12 20 11Q18 21 12 19Q7 25 0 24M48 0Q47 24 40 21Q35 39 25 38Q13 49 0 47M73 0Q72 35 61 32Q54 60 38 57Q20 74 0 71" /></g></svg>
    <Bat className={styles.batLeft} /><Bat className={styles.batRight} />
    <Pumpkin className={styles.cornerPumpkin} />
  </div>;
}

/** Solo tres siluetas SVG, animadas con transform; no interceptan interacción. */
export function HalloweenFlyingBats({ paused }: { paused: boolean }) {
  return <div aria-hidden="true" data-halloween-flight data-paused={paused} className={styles.flightLayer}>
    <span className={`${styles.flight} ${styles.flightOne}`}><Bat className={styles.flappingBat} /></span>
    <span className={`${styles.flight} ${styles.flightTwo}`}><Bat className={styles.flappingBat} /></span>
    <span className={`${styles.flight} ${styles.flightThree}`}><Bat className={styles.flappingBat} /></span>
  </div>;
}
