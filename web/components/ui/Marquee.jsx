'use client';

import { useState } from 'react';
import { Pause, PawPrint, Play } from 'lucide-react';
import { site } from '@/data/site';
import styles from './Marquee.module.css';

// Cinta infinita con los servicios. Lo que se mueve solo debe poder pararse (WCAG 2.2.2)
export const Marquee = () => {
  const [stopped, setStopped] = useState(false);
  const items = [...site.marquee, ...site.marquee];
  return (
    <div className={styles.wrap}>
      <div className={`${styles.marquee} ${stopped ? styles.stopped : ''}`} aria-hidden="true">
        <ul className={styles.track}>
          {items.map((text, index) => (
            <li key={`${text}-${index}`} className={styles.item}>
              <PawPrint size={22} strokeWidth={2} />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className={styles.toggle} onClick={() => setStopped((v) => !v)}>
        {stopped ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        {stopped ? 'Mover la cinta' : 'Parar la cinta'}
      </button>
    </div>
  );
};
