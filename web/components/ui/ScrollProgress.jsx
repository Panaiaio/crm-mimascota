'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import styles from './ScrollProgress.module.css';

// Barra de progreso de lectura en la parte superior
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return <motion.div className={styles.bar} style={{ scaleX }} aria-hidden="true" />;
};
