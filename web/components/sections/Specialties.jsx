'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { site } from '@/data/site';
import { fadeUp, fadeIn } from '@/lib/motion';
import styles from './Specialties.module.css';

export const Specialties = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section id="specialties" className={styles.specialties}>
      <Container>
        <SectionHeading
          title={site.specialties.title}
          description={site.specialties.subtitle}
        />
        
        <div className={styles.content}>
          {/* Lista de especialidades */}
          <div className={styles.list}>
            {site.specialties.items.map((item, index) => {
              return (
                <motion.button
                  key={index}
                  className={`${styles.item} ${activeIndex === index ? styles.active : ''}`}
                  onClick={() => setActiveIndex(index)}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className={styles.itemIcon}>
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className={styles.iconImage}
                    />
                  </div>
                  <div className={styles.itemContent}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <p className={styles.itemPreview}>{item.description.substring(0, 50)}...</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
          
          {/* Panel de detalle */}
          <div className={styles.detail}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className={styles.detailContent}
              >
                <div className={styles.detailIcon}>
                  <img 
                    src={site.specialties.items[activeIndex].image}
                    alt={site.specialties.items[activeIndex].title}
                    className={styles.detailIconImage}
                  />
                </div>
                <h3 className={styles.detailTitle}>
                  {site.specialties.items[activeIndex].title}
                </h3>
                <p className={styles.detailDescription}>
                  {site.specialties.items[activeIndex].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </section>
  );
};
