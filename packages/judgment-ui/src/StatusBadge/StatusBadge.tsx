import React from 'react';
import styles from './StatusBadge.module.css';

export type JudgmentStatus =
  | 'candidate'
  | 'pending'
  | 'investigating'
  | 'resolved'
  | 'delegated'
  | 'stale'
  | 'reopened'
  | 'dismissed';

export interface StatusBadgeProps {
  status: JudgmentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const classNames = [styles['badge'], styles[status], className].filter(Boolean).join(' ');

  return (
    <span className={classNames} role="status" aria-label={`Status: ${status}`}>
      {status}
    </span>
  );
};
