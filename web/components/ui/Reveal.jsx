'use client';

import { motion } from 'framer-motion';
import { fadeUp, viewportOnce } from '@/lib/motion';

const withDelay = (variants, delay) =>
  delay
    ? { ...variants, visible: { ...variants.visible, transition: { ...variants.visible.transition, delay } } }
    : variants;

export const Reveal = ({ children, as = 'div', variants = fadeUp, delay = 0, className, ...props }) => {
  const Component = motion[as];

  return (
    <Component
      className={className}
      variants={withDelay(variants, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      {...props}
    >
      {children}
    </Component>
  );
};
