import { CircleAlert } from 'lucide-react';
import styles from './Field.module.css';

// Campo de formulario con label visible y mensaje de error accesible
export const Field = ({ id, label, error, multiline = false, className = '', ...inputProps }) => {
  const Input = multiline ? 'textarea' : 'input';
  const errorId = `${id}-error`;

  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <Input
        id={id}
        name={id}
        className={`${styles.input} ${multiline ? styles.textarea : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        required
        {...inputProps}
      />
      {error && (
        <p id={errorId} className={styles.error}>
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
};
