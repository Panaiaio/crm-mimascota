'use client';

import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { site } from '@/data/site';
import styles from './Services.module.css';

export const Services = () => {
  return (
    <section id="services" className={styles.services}>
      <Container>
        <SectionHeading
          title={site.services.title}
          description={site.services.subtitle}
        />
        
        <div className={styles.grid}>
          {site.services.items.map((service, index) => (
            <ServiceCard
              key={index}
              image={service.image}
              title={service.title}
              description={service.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};
