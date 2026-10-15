import { Reveal } from '@/components/ui/Reveal';
import styles from './SectionHeading.module.css';

export const SectionHeading = ({ id, eyebrow, title, intro, layout = 'split', tone = 'light', className = '' }) => {
  const classes = [styles.heading, styles[layout], styles[tone], className].filter(Boolean).join(' ');

  return (
    <Reveal className={classes}>
      <div className={styles.titleBlock}>
        {eyebrow && <p className={`eyebrow ${styles.eyebrow}`}>{eyebrow}</p>}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
      </div>
      {intro && <p className={styles.intro}>{intro}</p>}
    </Reveal>
  );
};
