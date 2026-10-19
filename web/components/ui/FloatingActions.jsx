'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Phone } from 'lucide-react';
import { site } from '@/data/site';
import styles from './FloatingActions.module.css';

// Botón de llamada siempre visible + botón para volver arriba
export const FloatingActions = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 700);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div className={styles.wrap}>
      <AnimatePresence>
        {showTop && (
          <motion.a
            href="#hero"
            className={`${styles.btn} ${styles.top}`}
            aria-label="Volver arriba"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ y: -3 }}
          >
            <ArrowUp size={20} strokeWidth={2.25} aria-hidden="true" />
          </motion.a>
        )}
      </AnimatePresence>
      <a href={site.phoneHref} className={`${styles.btn} ${styles.call}`} aria-label={`Llamar al ${site.phone}`}>
        <span className={styles.pulse} aria-hidden="true" />
        <Phone size={22} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
};
