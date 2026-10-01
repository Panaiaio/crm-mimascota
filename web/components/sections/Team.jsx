'use client';

import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { TeamCard } from '@/components/ui/TeamCard';
import { site } from '@/data/site';
import styles from './Team.module.css';

export const Team = () => {
  return (
    <section id="team" className={styles.team}>
      <Container>
        <SectionHeading
          title={site.team.title}
          description={site.team.subtitle}
        />
        
        <div className={styles.grid}>
          {site.team.members.map((member, index) => (
            <TeamCard 
              key={index} 
              member={member} 
              delay={index * 0.1}
            />
          ))}
        </div>
      </Container>
    </section>
  );
};
