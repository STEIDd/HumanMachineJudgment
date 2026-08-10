import React from 'react';
import styles from './AlternativeCard.module.css';

export interface AlternativeCardProps {
  id: string;
  label: string;
  description: string;
  tradeoffs?: string;
  source?: string;
  isSelected?: boolean;
  className?: string;
}

export const AlternativeCard: React.FC<AlternativeCardProps> = ({
  id,
  label,
  description,
  tradeoffs,
  source,
  isSelected = false,
  className,
}) => {
  const classNames = [styles['card'], isSelected ? styles['selected'] : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-alternative-id={id}
      aria-label={`Alternative: ${label}${isSelected ? ' (selected)' : ''}`}
    >
      <div className={styles['header']}>
        <h3 className={styles['label']}>{label}</h3>
        {isSelected && <span className={styles['selectedBadge']}>Selected</span>}
      </div>
      <p className={styles['description']}>{description}</p>
      {tradeoffs && (
        <div className={styles['tradeoffs']}>
          <span className={styles['tradeoffsLabel']}>Tradeoffs:</span> {tradeoffs}
        </div>
      )}
      {source && (
        <div className={styles['source']}>
          <span className={styles['sourceLabel']}>Source:</span> {source}
        </div>
      )}
    </div>
  );
};
