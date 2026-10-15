'use client';

import { MotionConfig } from 'framer-motion';

export const MotionProvider = ({ children }) => (
  <MotionConfig reducedMotion="user">{children}</MotionConfig>
);
