'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { site } from '@/data/site';
import { fadeUp, fadeIn, staggerContainer } from '@/lib/motion';
import { Clock, Stethoscope, Heart } from 'lucide-react';
import styles from './Hero.module.css';

export const Hero = () => {
  const containerVariants = {
    ...staggerContainer,
    visible: {
      ...staggerContainer.visible,
      transition: {
        ...staggerContainer.visible.transition,
        staggerChildren: 0.1
      }
    }
  };

  return (
    <section id="hero" className={styles.hero}>
      <Container>
        <motion.div
          className={styles.content}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Columna izquierda: contenido */}
          <div className={styles.textContent}>
            <motion.span variants={fadeUp} className={styles.eyebrow}>
              {site.hero.eyebrow}
            </motion.span>
            
            <motion.h1 variants={fadeUp} className={styles.title}>
              {site.hero.title}
            </motion.h1>
            
            <motion.p variants={fadeUp} className={styles.description}>
              {site.hero.description}
            </motion.p>
            
            <motion.div variants={fadeUp} className={styles.buttons}>
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {site.hero.primaryCta}
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {site.hero.secondaryCta}
              </Button>
            </motion.div>
            
            <motion.div variants={fadeUp} className={styles.trustIndicators}>
              {site.hero.trustIndicators.map((indicator, index) => {
                const Icon = indicator.icon === 'clock' ? Clock :
                            indicator.icon === 'stethoscope' ? Stethoscope :
                            indicator.icon === 'heart' ? Heart : null;
                
                return (
                  <div key={index} className={styles.indicator}>
                    <Icon className={styles.indicatorIcon} />
                    <span className={styles.indicatorText}>{indicator.text}</span>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Columna derecha: imagen */}
          <motion.div variants={fadeIn} className={styles.illustration}>
            <img 
              src={site.hero.image}
              alt={site.hero.imageAlt}
              className={styles.heroImage}
            />
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
};
