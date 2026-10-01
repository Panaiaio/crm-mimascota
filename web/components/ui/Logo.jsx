import Image from 'next/image';
import { site } from '@/data/site';
import styles from './Logo.module.css';

export const Logo = ({ className = '' }) => {
  return (
    <div className={`${styles.logo} ${className}`}>
      <Image 
        src={site.logo}
        alt="Logo huella veterinaria"
        width={56}
        height={56}
        className={styles.icon}
        priority
      />
      <span className={styles.text}>{site.name}</span>
    </div>
  );
};
