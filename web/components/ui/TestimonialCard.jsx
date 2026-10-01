'use client';

import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import styles from './TestimonialCard.module.css';

export const TestimonialCard = ({ testimonial }) => {
  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.icon}>
        <Quote />
      </div>
      
      <p className={styles.text}>{testimonial.text}</p>
      
      <div className={styles.author}>
        <div className={styles.authorInfo}>
          <div className={styles.name}>{testimonial.name}</div>
          <div className={styles.pet}>Padre de {testimonial.pet}</div>
        </div>
      </div>
    </motion.div>
  );
};
