import React from 'react';
import styles from './StaleIndicator.module.css';

export interface StaleIndicatorProps {
  reason: string;
  markedAt?: string;
  className?: string;
}

const WarningIcon: React.FC = () => (
  <svg
    className={styles['icon']}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M7.134 1.5a1 1 0 0 1 1.732 0l6.062 10.5A1 1 0 0 1 14.062 13.5H1.938a1 1 0 0 1-.866-1.5L7.134 1.5Z"
      fill="currentColor"
      opacity="0.15"
      stroke="currentColor"
      strokeWidth="1"
    />
    <text
      x="8"
      y="11.5"
      textAnchor="middle"
      fill="currentColor"
      fontSize="9"
      fontWeight="bold"
      fontFamily="sans-serif"
    >
      !
    </text>
  </svg>
);

export const StaleIndicator: React.FC<StaleIndicatorProps> = ({ reason, markedAt, className }) => {
  const classNames = [styles['indicator'], className].filter(Boolean).join(' ');

  return (
    <div className={classNames} role="alert">
      <div className={styles['header']}>
        <WarningIcon />
        <span className={styles['label']}>Stale</span>
      </div>
      <span className={styles['reason']}>{reason}</span>
      {markedAt && (
        <time className={styles['timestamp']} dateTime={markedAt}>
          {markedAt}
        </time>
      )}
    </div>
  );
};
