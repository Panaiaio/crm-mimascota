// Pequeñas ilustraciones animadas (solo SVG y CSS) para las tarjetas de servicios
import styles from './Illustrations.module.css';

export const Ecg = () => (
  <svg className={styles.ecg} viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true">
    <path
      className={styles.ecgLine}
      d="M0 55 H90 L110 55 L125 15 L145 90 L162 40 L176 55 H260 L276 55 L290 28 L306 78 L318 55 H400"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Drops = () => (
  <span className={styles.drops} aria-hidden="true">
    <i /> <i /> <i />
  </span>
);

export const Rings = () => (
  <span className={styles.rings} aria-hidden="true">
    <i /> <i /> <i />
  </span>
);

export const Sparkles = () => (
  <span className={styles.sparkles} aria-hidden="true">
    {[0, 1, 2, 3].map((n) => (
      <svg key={n} viewBox="0 0 24 24" className={styles[`spark${n}`]}>
        <path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4Z" fill="currentColor" />
      </svg>
    ))}
  </span>
);

export const Snip = () => (
  <svg className={styles.snip} viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true">
    <line x1="0" y1="10" x2="200" y2="10" stroke="currentColor" strokeWidth="3" strokeDasharray="8 10" strokeLinecap="round" />
  </svg>
);

export const Scan = () => (
  <span className={styles.scan} aria-hidden="true">
    <span className={styles.scanGrid} />
    <span className={styles.scanBar} />
  </span>
);

export const Paws = () => (
  <span className={styles.paws} aria-hidden="true">
    {[0, 1, 2, 3].map((n) => (
      <svg key={n} viewBox="0 0 24 24" className={styles.paw} style={{ '--i': n }}>
        <g fill="currentColor">
          <ellipse cx="12" cy="16.5" rx="5" ry="4" />
          <ellipse cx="5" cy="10" rx="2.2" ry="3" />
          <ellipse cx="9.5" cy="5.5" rx="2.2" ry="3" />
          <ellipse cx="14.5" cy="5.5" rx="2.2" ry="3" />
          <ellipse cx="19" cy="10" rx="2.2" ry="3" />
        </g>
      </svg>
    ))}
  </span>
);
