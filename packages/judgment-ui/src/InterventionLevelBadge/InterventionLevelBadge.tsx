import React from 'react';
import styles from './InterventionLevelBadge.module.css';

export type InterventionLevel = 'trace' | 'disclose' | 'pause' | 'require-investigation';

export interface InterventionLevelBadgeProps {
  level: string;
  className?: string;
}

const KNOWN_LEVELS: InterventionLevel[] = ['trace', 'disclose', 'pause', 'require-investigation'];

export const InterventionLevelBadge: React.FC<InterventionLevelBadgeProps> = ({
  level,
  className,
}) => {
  const normalizedLevel = level.toLowerCase() as InterventionLevel;
  const levelClass = KNOWN_LEVELS.includes(normalizedLevel)
    ? styles[normalizedLevel.replace('-', '_')]
    : '';
  const classNames = [styles['badge'], levelClass, className].filter(Boolean).join(' ');

  return (
    <span className={classNames} aria-label={`Intervention level: ${level}`}>
      {level}
    </span>
  );
};
