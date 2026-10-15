'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { site } from '@/data/site';
import { ease, fadeUp, popIn, stagger, viewportOnce } from '@/lib/motion';
import styles from './Process.module.css';

const { process } = site;
const themes = ['sun', 'lime', 'forest'];
const WAVE = 'M167 40 Q 333 -14 500 40 Q 667 -14 833 40';

export const Process = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section id="process" className={`section ${styles.process}`} aria-labelledby="process-title">
      <PawField variant="b" />
      <Container>
        <SectionHeading
          id="process-title"
          eyebrow={process.eyebrow}
          title={process.title}
          intro={process.intro}
          layout="center"
        />

        <motion.ol className={styles.steps} variants={stagger} initial="hidden" whileInView="visible" viewport={viewportOnce}>
          {/* Camino horizontal (escritorio): un único punto lo recorre sin parar */}
          <svg className={styles.pathH} viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
            <motion.path
              d={WAVE}
              fill="none"
              stroke="var(--color-lime)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="2 12"
              vectorEffect="non-scaling-stroke"
              variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 1.4, ease, delay: 0.3 } } }}
            />
            {!reduceMotion && (
              <circle r="9" fill="var(--color-accent)" className={styles.dotH}>
                <animateMotion dur="5s" repeatCount="indefinite" path={WAVE} />
              </circle>
            )}
          </svg>

          {/* Camino vertical (móvil) */}
          <span className={styles.pathV} aria-hidden="true">
            <span className={styles.dotV} />
          </span>

          {process.steps.map((step, index) => (
            <motion.li key={step.title} className={`${styles.step} ${styles[themes[index]]}`} variants={fadeUp}>
              <motion.span className={styles.badge} variants={popIn}>
                <Icon name={step.icon} size={34} strokeWidth={1.9} />
                <span className={styles.count} aria-hidden="true">
                  {index + 1}
                </span>
              </motion.span>

              <div className={styles.card}>
                <span className={styles.ghost} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.chip}>{step.tag}</span>
                <h3 className={styles.title}>{step.title}</h3>
                <p className={styles.description}>{step.description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div className={styles.cta} variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewportOnce}>
          <Button href="#contact" size="lg" arrow>
            {site.nav.cta}
          </Button>
        </motion.div>
      </Container>
    </section>
  );
};
