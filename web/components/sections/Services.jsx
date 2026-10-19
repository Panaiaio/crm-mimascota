'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { PawField } from '@/components/ui/PawField';
import { Icon } from '@/components/ui/Icon';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Button } from '@/components/ui/Button';
import { Drops, Ecg, Paws, Rings, Scan, Snip, Sparkles } from '@/components/ui/Illustrations';
import { site } from '@/data/site';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import styles from './Services.module.css';

const { services } = site;

// Cada servicio tiene su color, su tamaño en el mosaico y su animación propia
const looks = {
  stethoscope: { theme: 'forest', size: 'hero', Decor: Ecg },
  syringe: { theme: 'sun', size: 'm', Decor: Drops },
  'shield-check': { theme: 'lime', size: 'm', Decor: Rings },
  toothbrush: { theme: 'sky', size: 'm', Decor: Sparkles },
  scissors: { theme: 'white', size: 'm', Decor: Snip },
  microscope: { theme: 'violet', size: 'wide', Decor: Scan },
  dog: { theme: 'sun', size: 's', Decor: Paws },
  cat: { theme: 'forest', size: 's', Decor: Paws }
};

export const Services = () => (
  <section id="services" className={`section ${styles.services}`} aria-labelledby="services-title">
      <PawField variant="a" />
    <Container>
      <SectionHeading id="services-title" eyebrow={services.eyebrow} title={services.title} intro={services.intro} />

      <motion.ul
        className={styles.bento}
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {services.items.map((service, index) => {
          const look = looks[service.icon] || { theme: 'white', size: 'm', Decor: null };
          const { Decor } = look;
          return (
            <motion.li
              key={service.title}
              className={`${styles.card} ${styles[look.theme]} ${styles[look.size]}`}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <a href="#contact" className={styles.cardLink} aria-label={`${service.title}: pedir cita`}>
                <span className={styles.number} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {Decor && (
                  <span className={styles.decor} aria-hidden="true">
                    <Decor />
                  </span>
                )}

                <span className={styles.iconWrap}>
                  <Icon name={service.icon} size={look.size === 'hero' ? 44 : 30} strokeWidth={1.75} className={styles.icon} />
                </span>

                <div className={styles.text}>
                  <h3 className={styles.title}>{service.title}</h3>
                  <p className={styles.description}>{service.description}</p>
                </div>

                <span className={styles.go} aria-hidden="true">
                  <ArrowUpRight size={20} strokeWidth={2.5} />
                </span>
              </a>
            </motion.li>
          );
        })}
      </motion.ul>

      <div className={styles.cta}>
        <Button href="#contact" size="lg" arrow>
          {services.cta}
        </Button>
        <Button href={site.phoneHref} variant="outline" size="lg">
          {site.phone}
        </Button>
      </div>
    </Container>
  </section>
);
