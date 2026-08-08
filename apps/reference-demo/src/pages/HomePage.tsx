import React from 'react';
import styles from './HomePage.module.css';

export interface HomePageProps {
  onNavigate: (hash: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className={styles['container']}>
      <h2 className={styles['title']}>Human-Machine Judgment Points</h2>
      <p className={styles['description']}>
        Judgment Points are durable, machine-readable decision records for consequential choices in
        technical agent workflows. They capture the question, context, alternatives, materiality
        assessment, and resolution so every significant decision is traceable and auditable.
      </p>

      <div className={styles['actions']}>
        <button
          type="button"
          className={styles['primaryButton']}
          onClick={() => onNavigate('#/project/demo')}
        >
          View Demo Project
        </button>
        <button
          type="button"
          className={styles['secondaryButton']}
          onClick={() => onNavigate('#/thermal-model')}
        >
          Thermal Model Example
        </button>
        <button
          type="button"
          className={styles['secondaryButton']}
          onClick={() => onNavigate('#/components')}
        >
          Component Gallery
        </button>
      </div>
    </div>
  );
};
