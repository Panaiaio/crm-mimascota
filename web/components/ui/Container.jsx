import styles from './Container.module.css';

export const Container = ({ children, className = '', size = 'default' }) => {
  const classes = [
    styles.container,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
};
