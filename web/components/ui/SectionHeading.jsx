import { Reveal } from '@/components/ui/Reveal';
import styles from './SectionHeading.module.css';

export const SectionHeading = ({ 
  eyebrow, 
  title, 
  description, 
  className = '',
  align = 'center' 
}) => {
  return (
    <div className={`${styles.heading} ${styles[align]} ${className}`}>
      {eyebrow && (
        <Reveal>
          <span className={styles.eyebrow}>{eyebrow}</span>
        </Reveal>
      )}
      <Reveal>
        <h2 className={styles.title}>{title}</h2>
      </Reveal>
      {description && (
        <Reveal>
          <p className={styles.description}>{description}</p>
        </Reveal>
      )}
    </div>
  );
};
