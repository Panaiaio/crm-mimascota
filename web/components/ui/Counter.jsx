'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

const format = (value) => new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(Math.round(value));

// Muestra el número final en el HTML (sin JS o con movimiento reducido)
// y lo anima una sola vez desde 0 cuando entra en pantalla.
export const Counter = ({ value, suffix = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.8 });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || reduceMotion) return;
    if (!isInView) {
      node.textContent = format(0);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      }
    });
    return () => controls.stop();
  }, [isInView, reduceMotion, value]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {format(value)}
      </span>
      {suffix && <span aria-hidden="true">{suffix}</span>}
      <span className="visually-hidden">{`${format(value)}${suffix}`}</span>
    </>
  );
};
