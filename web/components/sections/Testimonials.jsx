'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { TestimonialCard } from '@/components/ui/TestimonialCard';
import { site } from '@/data/site';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Testimonials.module.css';

export const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Detectar prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    
    const handleChange = (e) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Autoplay
  useEffect(() => {
    if (!isAutoplay || isReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % site.testimonials.items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoplay, isReducedMotion]);

  const nextTestimonial = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % site.testimonials.items.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + site.testimonials.items.length) % site.testimonials.items.length);
  }, []);

  const goToTestimonial = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        prevTestimonial();
      } else if (e.key === 'ArrowRight') {
        nextTestimonial();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nextTestimonial, prevTestimonial]);

  return (
    <section id="testimonials" className={styles.testimonials}>
      <Container>
        <SectionHeading
          title={site.testimonials.title}
        />
        
        <div 
          className={styles.carousel}
          onMouseEnter={() => setIsAutoplay(false)}
          onMouseLeave={() => setIsAutoplay(true)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className={styles.testimonialWrapper}
            >
              <TestimonialCard testimonial={site.testimonials.items[currentIndex]} />
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <button
            className={styles.navButton}
            onClick={prevTestimonial}
            aria-label="Testimonio anterior"
          >
            <ChevronLeft />
          </button>
          
          <button
            className={styles.navButton}
            onClick={nextTestimonial}
            aria-label="Siguiente testimonio"
          >
            <ChevronRight />
          </button>

          {/* Indicators */}
          <div className={styles.indicators}>
            {site.testimonials.items.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                onClick={() => goToTestimonial(index)}
                aria-label={`Ir al testimonio ${index + 1}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
