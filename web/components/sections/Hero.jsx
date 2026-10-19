'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { PawPrint, ShieldCheck, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Icon } from '@/components/ui/Icon';
import { site } from '@/data/site';
import { useLoaded } from '@/lib/loader';
import { ease, fadeUp, popIn, stagger } from '@/lib/motion';
import styles from './Hero.module.css';

const { hero } = site;

const words = {
  hidden: { opacity: 0, y: '60%', rotate: 4 },
  visible: { opacity: 1, y: '0%', rotate: 0, transition: { duration: 0.7, ease } }
};

const Words = ({ text, className = '' }) =>
  text.split(' ').map((word, index) => (
    <Fragment key={`${word}-${index}`}>
      <span className={styles.wordMask}>
        <motion.span variants={words} className={`${styles.word} ${className}`}>
          {word}
        </motion.span>
      </span>{' '}
    </Fragment>
  ));

export const Hero = () => {
  const loaded = useLoaded();
  const state = loaded ? 'visible' : 'hidden';
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 600], [0, 70]);
  const blobY = useTransform(scrollY, [0, 600], [0, -90]);

  return (
    <section id="hero" className={styles.hero} aria-labelledby="hero-title">
      {/* Decoración de fondo */}
      <motion.div className={`${styles.blob} ${styles.blobOne}`} style={{ y: blobY }} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobTwo}`} aria-hidden="true" />
      <PawPrint className={`${styles.paw} ${styles.pawOne}`} size={64} strokeWidth={1.5} aria-hidden="true" />
      <PawPrint className={`${styles.paw} ${styles.pawTwo}`} size={44} strokeWidth={1.5} aria-hidden="true" />
      <PawPrint className={`${styles.paw} ${styles.pawThree}`} size={52} strokeWidth={1.5} aria-hidden="true" />

      <Container>
        <div className={styles.grid}>
          <motion.div className={styles.text} variants={stagger} initial="hidden" animate={state}>
            <motion.p variants={fadeUp} className="eyebrow">
              {hero.eyebrow}
            </motion.p>
            <h1 id="hero-title" className={styles.title}>
              <motion.span variants={stagger} className={styles.titleInner}>
                <Words text={hero.titleStart} />
                <span className={styles.emphasisWrap}>
                  <Words text={hero.titleEmphasis} className={styles.emphasis} />
                  <svg className={styles.squiggle} viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">
                    <motion.path
                      d="M3 12 C 40 2, 70 2, 100 10 S 170 18, 200 8 S 260 2, 297 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: loaded ? 1 : 0 }}
                      transition={{ duration: 1, delay: 0.9, ease }}
                    />
                  </svg>
                </span>
              </motion.span>
            </h1>
            <motion.p variants={fadeUp} className={styles.description}>
              {hero.description}
            </motion.p>
            <motion.div variants={fadeUp} className={styles.actions}>
              <Button href="#contact" size="lg" arrow>
                {hero.primaryCta}
              </Button>
              <Button href="#services" variant="green" size="lg">
                {hero.secondaryCta}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.media}
            initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
            animate={loaded ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.9, rotate: 3 }}
            transition={{ duration: 0.9, ease, delay: 0.2 }}
          >
            <motion.div className={styles.frame} style={{ y: imageY }}>
              <Image
                src={hero.image}
                alt={hero.imageAlt}
                fill
                priority
                sizes="(min-width: 960px) 520px, 100vw"
                className={styles.image}
              />
            </motion.div>

            <motion.div
              className={`${styles.chip} ${styles.chipTop}`}
              variants={popIn}
              initial="hidden"
              animate={state}
              transition={{ delay: 1 }}
            >
              <span className={styles.chipIcon}>
                <ShieldCheck size={18} strokeWidth={2.25} aria-hidden="true" />
              </span>
              Vacunas al día
            </motion.div>

            <motion.div
              className={`${styles.chip} ${styles.chipRating}`}
              variants={popIn}
              initial="hidden"
              animate={state}
              transition={{ delay: 1.2 }}
            >
              <span className={styles.stars} aria-hidden="true">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </span>
              <span>Familias encantadas</span>
            </motion.div>

            <div className={styles.badge}>
              <span className={styles.badgeNumber}>{hero.badgeNumber}</span>
              <span className={styles.badgeText}>{hero.badgeText}</span>
            </div>
          </motion.div>
        </div>

        <motion.ul
          className={styles.facts}
          variants={stagger}
          initial="hidden"
          animate={state}
          transition={{ delayChildren: 0.6 }}
        >
          {hero.facts.map((fact) => {
            const content = (
              <>
                <span className={styles.factIconWrap}>
                  <Icon name={fact.icon} size={22} className={styles.factIcon} />
                </span>
                <span className={styles.factBody}>
                  <span className={styles.factLabel}>{fact.label}</span>
                  <span className={styles.factValue}>{fact.value}</span>
                </span>
              </>
            );

            return (
              <motion.li key={fact.label} className={styles.fact} variants={fadeUp}>
                {fact.href ? (
                  <a
                    href={fact.href}
                    className={styles.factLink}
                    {...(fact.external && { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={styles.factLink}>{content}</div>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      </Container>
    </section>
  );
};
