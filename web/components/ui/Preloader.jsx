'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { LogoMark, LOGO_COLORS } from '@/components/ui/LogoMark';
import { site } from '@/data/site';
import { setLoaded } from '@/lib/loader';
import styles from './Preloader.module.css';

const STORAGE_KEY = 'mm-preloader';
const SAFETY_MS = 6000;
const ANIMAL_OFFSET = 520; // unidades del viewBox del logo (el SVG se dibuja a ~1,1 px por unidad)
const HEART_OFFSET = 1400; // las mitades llegan desde fuera de la pantalla

const rem = (fn) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export const Preloader = () => {
  const [gone, setGone] = useState(false);
  const rootRef = useRef(null);
  const overlayRef = useRef(null);
  const flyerRef = useRef(null);
  const popRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const html = document.documentElement;
    const done = () => {
      html.setAttribute('data-preloader', 'done');
      html.style.overflow = '';
    };

    // Visitas siguientes de la misma sesión: nada que mostrar
    if (rem(() => sessionStorage.getItem(STORAGE_KEY)) === '1' || !overlayRef.current) {
      setLoaded();
      done();
      setGone(true);
      return undefined;
    }

    const root = rootRef.current;
    const layer = (name) => root.querySelector(`[data-layer="${name}"]`);
    const cat = layer('cat');
    const dog = layer('dog');
    const left = layer('heart-left');
    const right = layer('heart-right');
    const catPath = cat.querySelector('path');
    const dogPath = dog.querySelector('path');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    html.setAttribute('data-preloader', 'active');
    html.style.overflow = 'hidden';

    let cancelled = false;
    let started = false;
    const controls = [];
    const timers = [];
    const track = (c) => {
      controls.push(c);
      return c;
    };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const finalState = () => {
      [cat, dog, left, right].forEach((el) => animate(el, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }, { duration: 0 }));
      animate(catPath, { fill: '#fff' }, { duration: 0 });
      animate(dogPath, { fill: '#fff' }, { duration: 0 });
      animate(nameRef.current, { opacity: 1, y: 0 }, { duration: 0 });
    };

    // Teletransporta el logo grande al icono real del Navbar (medido en este momento)
    const travel = async () => {
      if (started || cancelled) return;
      started = true;
      rem(() => sessionStorage.setItem(STORAGE_KEY, '1'));
      timers.forEach(clearTimeout);
      controls.forEach((c) => c.stop());
      finalState();
      setLoaded();

      const flyer = flyerRef.current;
      const target = document.querySelector('[data-nav-logo] svg');
      const landed = () => {
        if (cancelled) return;
        done(); // el icono del Navbar pasa a ser visible justo debajo del logo
        requestAnimationFrame(() => {
          if (!cancelled) setGone(true);
        });
      };

      if (reduce || !target) {
        await animate(overlayRef.current, { opacity: 0 }, { duration: 0.35 }).finished;
        animate(flyer, { opacity: 0 }, { duration: 0 });
        landed();
        return;
      }

      const from = flyer.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);

      animate(nameRef.current, { opacity: 0, y: 8 }, { duration: 0.3 });
      animate(overlayRef.current, { opacity: 0 }, { duration: 0.55, delay: 0.1 });
      await animate(flyer, { x: dx, y: dy, scale }, { duration: 0.75, ease: [0.65, 0, 0.25, 1] }).finished;
      landed();
    };
    rootRef.current.__skip = travel;

    const play = async () => {
      if (reduce) {
        finalState();
        later(travel, 250);
        return;
      }
      const spring = { type: 'spring', stiffness: 70, damping: 13, mass: 0.9 };
      // 1) El gato llega desde la izquierda y el perro desde la derecha, con trote
      track(animate(cat, { x: [-ANIMAL_OFFSET, 0], opacity: [0, 1] }, spring));
      track(animate(dog, { x: [ANIMAL_OFFSET, 0], opacity: [0, 1] }, { ...spring, delay: 0.12 }));
      track(animate(cat, { y: [0, -7, 0, -7, 0, -5, 0], rotate: [0, -3, 0, 3, 0, -2, 0] }, { duration: 1.0, ease: 'easeInOut' }));
      track(animate(dog, { y: [0, -7, 0, -7, 0, -5, 0], rotate: [0, 3, 0, -3, 0, 2, 0] }, { duration: 1.0, delay: 0.12, ease: 'easeInOut' }));
      // 2) Gesto: el gato se estira y el perro ladea la cabeza, con un saltito
      later(() => {
        track(animate(cat, { scaleY: [1, 1.09, 1], scaleX: [1, 0.96, 1], y: [0, -12, 0] }, { duration: 0.5, ease: 'easeOut' }));
        track(animate(dog, { rotate: [0, -5, 4, 0], y: [0, -12, 0] }, { duration: 0.5, ease: 'easeOut' }));
      }, 1050);
      // 3) Las mitades del corazón se cierran alrededor de ellos
      later(() => {
        track(animate(left, { x: [-HEART_OFFSET, 0] }, { duration: 0.6, ease: [0.22, 1, 0.36, 1] }));
        track(animate(right, { x: [HEART_OFFSET, 0] }, { duration: 0.6, ease: [0.22, 1, 0.36, 1] }));
        track(animate(catPath, { fill: ['#7EC31D', '#fff'] }, { duration: 0.35, delay: 0.3 }));
        track(animate(dogPath, { fill: ['#14481E', '#fff'] }, { duration: 0.35, delay: 0.3 }));
      }, 1550);
      // 4) Pequeño "pop" y aparece el nombre
      later(() => {
        track(animate(popRef.current, { scale: [1, 1.1, 1] }, { duration: 0.45, ease: 'easeOut' }));
        track(animate(nameRef.current, { opacity: [0, 1], y: [14, 0] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] }));
      }, 2050);
      // 5) Viaje al Navbar
      later(travel, 2750);
    };

    play();
    later(() => {
      // Seguro: si algo se atasca, se cierra igualmente
      if (!started) travel();
    }, SAFETY_MS);
    later(() => {
      if (!cancelled) {
        done();
        setGone(true);
        setLoaded();
      }
    }, SAFETY_MS + 1500);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      controls.forEach((c) => c.stop());
      html.style.overflow = '';
    };
  }, []);

  if (gone) return null;

  return (
    <div ref={rootRef} className={styles.root} role="status" aria-label={`Cargando ${site.name}`}>
      <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />
      <div ref={flyerRef} className={styles.flyer} aria-hidden="true">
        <div ref={popRef} className={styles.pop}>
          <LogoMark
            size={280}
            className={styles.mark}
            animalFill={{ cat: LOGO_COLORS.lime, dog: LOGO_COLORS.dark }}
            layerProps={{
              cat: { className: styles.cat },
              dog: { className: styles.dog },
              left: { className: styles.left },
              right: { className: styles.right }
            }}
          />
        </div>
      </div>
      <p ref={nameRef} className={styles.name} aria-hidden="true">
        {site.name}
      </p>
      <button type="button" className={styles.skip} onClick={() => rootRef.current?.__skip?.()}>
        Saltar
      </button>
    </div>
  );
};
