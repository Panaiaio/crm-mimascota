import styles from './Container.module.css';

export const Container = ({ children, className = '' }) => (
  <div className={`${styles.container} ${className}`.trim()}>{children}</div>
);
