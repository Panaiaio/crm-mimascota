import { PawPrint } from 'lucide-react';
import { site } from '@/data/site';
import styles from './Marquee.module.css';

// Cinta infinita con los servicios (solo CSS, sin JavaScript)
export const Marquee = () => {
  const items = [...site.marquee, ...site.marquee];
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.marquee}>
      <ul className={styles.track}>
        {items.map((text, index) => (
          <li key={`${text}-${index}`} className={styles.item}>
            <PawPrint size={22} strokeWidth={2} />
            {text}
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
};
