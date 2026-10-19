import { ArrowRight } from 'lucide-react';
import styles from './Button.module.css';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  arrow = false,
  className = '',
  ...props
}) => {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ');
  const content = (
    <>
      <span className={styles.label}>{children}</span>
      {arrow && (
        <span className={styles.arrowWrap} aria-hidden="true">
          <ArrowRight className={styles.arrow} size={18} strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {content}
    </button>
  );
};
