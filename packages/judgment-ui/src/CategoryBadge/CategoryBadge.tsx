import React from 'react';
import styles from './CategoryBadge.module.css';

export interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, className }) => {
  const classNames = [styles['badge'], className].filter(Boolean).join(' ');

  return (
    <span className={classNames} aria-label={`Category: ${category}`}>
      {category}
    </span>
  );
};
