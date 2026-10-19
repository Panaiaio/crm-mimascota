import { PawPrint } from 'lucide-react';
import styles from './PawField.module.css';

// Huellas decorativas flotando en el fondo de una sección.
// variant: distribuye las huellas de forma distinta (a, b, c, d) para que no se repitan.
// tone="dark": versión clara para secciones con fondo oscuro.
const layouts = {
  a: [
    { top: '6%', left: '3%', size: 56, rot: -18, delay: 0, alt: false },
    { top: '14%', right: '5%', size: 40, rot: 16, delay: -2, alt: true },
    { top: '52%', left: '1.5%', size: 34, rot: 24, delay: -4, alt: true },
    { bottom: '10%', right: '3%', size: 62, rot: -12, delay: -1, alt: false },
    { bottom: '4%', left: '38%', size: 36, rot: 20, delay: -3, alt: true }
  ],
  b: [
    { top: '8%', right: '4%', size: 58, rot: 14, delay: -1, alt: false },
    { top: '40%', left: '2%', size: 46, rot: -22, delay: -3, alt: true },
    { top: '70%', right: '8%', size: 34, rot: 26, delay: -5, alt: false },
    { bottom: '6%', left: '10%', size: 54, rot: -10, delay: -2, alt: false },
    { top: '4%', left: '44%', size: 30, rot: 8, delay: -4, alt: true }
  ],
  c: [
    { top: '10%', left: '48%', size: 36, rot: -14, delay: -2, alt: true },
    { top: '30%', right: '2.5%', size: 60, rot: 20, delay: 0, alt: false },
    { bottom: '22%', left: '3%', size: 50, rot: -26, delay: -3, alt: false },
    { bottom: '5%', right: '30%', size: 38, rot: 12, delay: -1, alt: true },
    { top: '3%', left: '4%', size: 30, rot: 18, delay: -4, alt: false }
  ],
  d: [
    { top: '6%', right: '10%', size: 52, rot: -16, delay: -1, alt: false },
    { top: '46%', right: '1.5%', size: 36, rot: 22, delay: -3, alt: true },
    { top: '58%', left: '2%', size: 58, rot: 10, delay: -2, alt: false },
    { bottom: '7%', left: '42%', size: 40, rot: -20, delay: -4, alt: true },
    { top: '20%', left: '5%', size: 32, rot: 14, delay: -5, alt: true }
  ]
};

export const PawField = ({ variant = 'a', tone = 'light' }) => (
  <div className={`${styles.field} ${tone === 'dark' ? styles.dark : ''}`} aria-hidden="true">
    {layouts[variant].map((paw, index) => {
      const { size, rot, delay, alt, ...position } = paw;
      return (
        <PawPrint
          key={index}
          className={`${styles.paw} ${alt ? styles.alt : ''}`}
          size={size}
          strokeWidth={1.5}
          style={{ ...position, '--rot': `${rot}deg`, animationDelay: `${delay}s` }}
        />
      );
    })}
  </div>
);
