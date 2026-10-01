'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { site } from '@/data/site';
import { fadeUp, slideInLeft, slideInRight } from '@/lib/motion';
import styles from './About.module.css';

export const About = () => {
  return (
    <section id="about" className={styles.about}>
      <Container>
        <SectionHeading
          title={site.about.title}
          description={site.about.subtitle}
          align="left"
        />
        
        <div className={styles.content}>
          <motion.div 
            className={styles.textContent}
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <p className={styles.description}>{site.about.description}</p>
            
            <div className={styles.stats}>
              {site.about.stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className={styles.stat}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={styles.statNumber}>{stat.number}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.3 }}
            >
            </motion.div>
          </motion.div>
          
          <motion.div
            className={styles.imageContainer}
            variants={slideInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <img 
              src={site.about.image}
              alt={site.about.imageAlt}
              className={styles.aboutImage}
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
