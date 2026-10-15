'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { site } from '@/data/site';
import { ease } from '@/lib/motion';
import styles from './Navbar.module.css';

const { nav } = site;

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 8);
    const frame = requestAnimationFrame(update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
    };
  }, []);

  useEffect(() => {
    const sections = ['hero', 'process', 'testimonials', ...nav.items.map(({ id }) => id)]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 960) setIsOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {nav.skipLink}
      </a>

      <header className={`${styles.header} ${isScrolled || isOpen ? styles.scrolled : ''}`}>
        <div className={styles.bar}>
          <a href="#hero" className={styles.brand} aria-label={nav.homeLabel} onClick={close}>
            <Logo size={36} navMark />
          </a>

          <nav className={styles.desktopNav} aria-label={nav.ariaLabel}>
            <ul className={styles.links}>
              {nav.items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`${styles.link} ${activeId === item.id ? styles.active : ''}`}
                    aria-current={activeId === item.id ? 'location' : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <Button href="#contact" size="sm" className={styles.cta}>
              {nav.cta}
            </Button>
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setIsOpen((open) => !open)}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? nav.closeMenu : nav.openMenu}
            >
              {isOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.nav
              id="mobile-menu"
              className={styles.mobileMenu}
              aria-label={nav.ariaLabel}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease }}
            >
              <ul className={styles.mobileLinks}>
                {nav.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={`${styles.mobileLink} ${activeId === item.id ? styles.active : ''}`}
                      aria-current={activeId === item.id ? 'location' : undefined}
                      onClick={close}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Button href="#contact" size="lg" className={styles.mobileCta} onClick={close}>
                {nav.cta}
              </Button>
              <a href={site.phoneHref} className={styles.mobilePhone}>
                {site.phone}
              </a>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};
