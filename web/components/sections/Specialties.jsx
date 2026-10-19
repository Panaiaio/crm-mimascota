'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Baby, Bird, Dog, HeartPulse } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/data/site';
import { ease } from '@/lib/motion';
import styles from './Specialties.module.css';

const { specialties } = site;
const icons = [Baby, Dog, HeartPulse, Bird];

export const Specialties = () => {
  const [active, setActive] = useState(0);
  const current = specialties.items[active];
  const Current = icons[active];

  return (
    <section id="specialties" className={`section ${styles.specialties}`} aria-labelledby="specialties-title">
      <PawField variant="d" tone="dark" />
      <div className={styles.shapeA} aria-hidden="true" />
      <div className={styles.shapeB} aria-hidden="true" />
      <Container>
        <SectionHeading
          id="specialties-title"
          eyebrow={specialties.eyebrow}
          title={specialties.title}
          intro={specialties.intro}
          tone="dark"
        />

        <div className={styles.layout}>
          <div className={styles.tabs} role="tablist" aria-label={specialties.title}>
            {specialties.items.map((item, index) => {
              const Icon = icons[index];
              const isActive = index === active;
              return (
                <button
                  key={item.title}
                  type="button"
                  role="tab"
                  id={`tab-${index}`}
                  aria-selected={isActive}
                  aria-controls="specialty-panel"
                  tabIndex={isActive ? 0 : -1}
                  className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                      event.preventDefault();
                      const next = (index + 1) % specialties.items.length;
                      setActive(next);
                      document.getElementById(`tab-${next}`)?.focus();
                    }
                    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                      event.preventDefault();
                      const prev = (index - 1 + specialties.items.length) % specialties.items.length;
                      setActive(prev);
                      document.getElementById(`tab-${prev}`)?.focus();
                    }
                  }}
                >
                  {isActive && (
                    <motion.span layoutId="tab-pill" className={styles.pill} transition={{ type: 'spring', stiffness: 320, damping: 30 }} />
                  )}
                  <span className={styles.tabIcon}>
                    <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className={styles.tabText}>
                    <span className={styles.tabStage}>{item.stage}</span>
                    <span className={styles.tabTitle}>{item.title}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div id="specialty-panel" role="tabpanel" aria-labelledby={`tab-${active}`} className={styles.panel}>
            <AnimatePresence mode="wait">
              <motion.div
                key={current.title}
                className={styles.panelInner}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease }}
              >
                <span className={styles.bigIcon}>
                  <Current size={64} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <p className={styles.stageLabel}>{current.stage}</p>
                <h3 className={styles.title}>{current.title}</h3>
                <p className={styles.description}>{current.description}</p>
                <a href="#contact" className={`${styles.link} hit-44`}>
                  Pedir cita para {current.title.toLowerCase()} →
                </a>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
};
