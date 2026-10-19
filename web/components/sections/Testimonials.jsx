'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, Quote } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { Reveal } from '@/components/ui/Reveal';
import { site } from '@/data/site';
import { ease } from '@/lib/motion';
import styles from './Testimonials.module.css';

const { testimonials } = site;
const total = testimonials.items.length;

export const Testimonials = () => {
  const [[index, direction], setPage] = useState([0, 1]);
  const [paused, setPaused] = useState(false);
  // Pausa elegida por la persona (botón): manda sobre el ratón y el foco
  const [stopped, setStopped] = useState(false);
  const reduceMotion = useReducedMotion();
  const autoplay = !paused && !stopped && !reduceMotion;

  const go = useCallback((step) => setPage(([current]) => [(current + step + total) % total, step]), []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => go(1), 7000);
    return () => clearInterval(timer);
  }, [autoplay, go]);

  const item = testimonials.items[index];
  const meta = item.species ? `${item.pet} · ${item.species}` : item.pet;

  return (
    <section id="testimonials" className={`section ${styles.testimonials}`} aria-labelledby="testimonials-title">
      <PawField variant="b" />
      <Container>
        <Reveal className={styles.heading}>
          <p className="eyebrow">{testimonials.eyebrow}</p>
          <h2 id="testimonials-title" className={styles.title}>
            {testimonials.title}
          </h2>
        </Reveal>

        <div
          className={styles.carousel}
          role="group"
          aria-roledescription="carrusel"
          aria-label={testimonials.title}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Quote className={styles.quoteMark} size={120} strokeWidth={1} aria-hidden="true" />

          <div className={styles.stage} aria-live={autoplay ? 'off' : 'polite'}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.figure
                key={index}
                className={styles.card}
                custom={direction}
                variants={{
                  enter: (d) => ({ opacity: 0, x: d * 60 }),
                  center: { opacity: 1, x: 0 },
                  exit: (d) => ({ opacity: 0, x: d * -60 })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease }}
              >
                <blockquote className={styles.quote}>
                  <p>{item.text}</p>
                </blockquote>
                <figcaption className={styles.author}>
                  <span className={styles.avatar} aria-hidden="true">
                    {item.name.charAt(0)}
                  </span>
                  <span className={styles.who}>
                    <span className={styles.name}>{item.name}</span>
                    <span className={styles.pet}>{meta}</span>
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          <div className={styles.controls}>
            <button type="button" className={styles.arrow} onClick={() => go(-1)} aria-label="Opinión anterior">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div className={styles.dots}>
              {testimonials.items.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
                  onClick={() => setPage([i, i > index ? 1 : -1])}
                  aria-label={`Ver opinión de ${t.name}`}
                  aria-current={i === index}
                />
              ))}
            </div>
            <button type="button" className={styles.arrow} onClick={() => go(1)} aria-label="Opinión siguiente">
              <ChevronRight size={22} aria-hidden="true" />
            </button>
            {!reduceMotion && (
              <button
                type="button"
                className={styles.pause}
                onClick={() => setStopped((v) => !v)}
              >
                {stopped ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
                {stopped ? 'Reanudar' : 'Pausar'}
              </button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};
