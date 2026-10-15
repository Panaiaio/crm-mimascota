import { LogoMark } from '@/components/ui/LogoMark';
import { site } from '@/data/site';
import styles from './Logo.module.css';

// navMark: marca el icono como destino de la animación de entrada (Navbar).
export const Logo = ({ className = '', size = 40, tone = 'dark', navMark = false }) => (
  <span className={`${styles.logo} ${styles[tone]} ${className}`}>
    <span className={`${styles.iconWrap} ${navMark ? styles.navMark : ''}`} data-nav-logo={navMark ? '' : undefined}>
      <LogoMark size={size} className={styles.icon} />
    </span>
    <span className={styles.text}>{site.name}</span>
  </span>
);
