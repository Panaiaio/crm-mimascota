'use client';

import { motion } from 'framer-motion';
import { fadeUp, viewportConfig } from '@/lib/motion';

// Componente wrapper reutilizable para animaciones de revelación
export const Reveal = ({ children, variants = fadeUp, className = '', viewport = viewportConfig }) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};
