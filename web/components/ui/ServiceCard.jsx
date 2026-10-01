'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import styles from './ServiceCard.module.css';

export const ServiceCard = ({ image, title, description, delay = 0 }) => {
  const cardVariants = {
    ...fadeUp,
    visible: {
      ...fadeUp.visible,
      transition: { ...fadeUp.visible.transition, delay }
    }
  };

  return (
    <motion.div
      className={styles.card}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <div className={styles.iconContainer}>
        <img 
          src={image} 
          alt={title}
          className={styles.icon}
        />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
    </motion.div>
  );
};
