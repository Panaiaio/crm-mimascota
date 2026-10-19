import Image from 'next/image';
import { Reveal } from '@/components/ui/Reveal';
import styles from './TeamCard.module.css';

export const TeamCard = ({ member, delay = 0 }) => (
  <Reveal as="li" className={styles.card} delay={delay}>
    <div className={styles.photo}>
      <Image
        src={member.image}
        alt={`Retrato de ${member.name}`}
        fill
        sizes="(min-width: 1024px) 360px, (min-width: 640px) 32vw, 100vw"
        className={styles.image}
      />
      <span className={styles.tag}>{member.specialty}</span>
    </div>
    <div className={styles.body}>
      <h3 className={styles.name}>{member.name}</h3>
      <p className={styles.description}>{member.description}</p>
    </div>
  </Reveal>
);
