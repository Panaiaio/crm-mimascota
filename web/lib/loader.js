'use client';

import { useSyncExternalStore } from 'react';

// Pequeño "interruptor" compartido: la pantalla de carga avisa cuando termina
// y el resto de la web (por ejemplo la portada) empieza sus animaciones entonces.
let loaded = false;
const listeners = new Set();

export const setLoaded = () => {
  if (loaded) return;
  loaded = true;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLoaded = () =>
  useSyncExternalStore(
    subscribe,
    () => loaded,
    () => false
  );
