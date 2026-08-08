import React, { useState, useCallback } from 'react';
import styles from './JudgmentMarker.module.css';

export interface JudgmentMarkerProps {
  id: string;
  status: string;
  category: string;
  question: string;
  interventionLevel?: string;
  materialityScore?: number;
  resolution?: { selectedAlternativeId: string; rationale: string };
  alternativesCount?: number;
  onExpand?: (id: string) => void;
  className?: string;
}

const statusIcons: Record<string, string> = {
  candidate: '?',
  pending: '!',
  investigating: '~',
  resolved: 'v',
  delegated: '>',
  stale: 'x',
  reopened: 'o',
  dismissed: '-',
};

const categoryAbbr: Record<string, string> = {
  assumption: 'ASM',
  method: 'MTD',
  framing: 'FRM',
  parameter: 'PRM',
  boundary: 'BND',
  validation: 'VAL',
  interpretation: 'INT',
  scope: 'SCP',
};

export const JudgmentMarker: React.FC<JudgmentMarkerProps> = ({
  id,
  status,
  category,
  question,
  interventionLevel,
  materialityScore,
  resolution,
  alternativesCount,
  onExpand,
  className,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    if (!expanded) {
      setExpanded(true);
      onExpand?.(id);
    } else {
      setExpanded(false);
    }
  }, [expanded, id, onExpand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      } else if (e.key === 'Escape' && expanded) {
        e.preventDefault();
        setExpanded(false);
      }
    },
    [handleToggle, expanded],
  );

  const icon = statusIcons[status] || '?';
  const abbr = categoryAbbr[category] || category.slice(0, 3).toUpperCase();
  const classNames = [styles['marker'], expanded ? styles['expanded'] : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      tabIndex={0}
      role="button"
      aria-expanded={expanded}
      aria-label={`Judgment marker: ${question}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <span className={styles['inline']} data-testid="marker-inline">
        <span className={styles['statusIcon']} data-status={status}>
          {icon}
        </span>
        <span className={styles['categoryAbbr']}>{abbr}</span>
      </span>

      <div className={styles['collapsed']} data-testid="marker-collapsed">
        <span className={styles['questionTruncated']}>
          {question.length > 60 ? question.slice(0, 57) + '...' : question}
        </span>
        <span className={styles['statusText']}>{status}</span>
        {interventionLevel && <span className={styles['level']}>{interventionLevel}</span>}
      </div>

      {expanded && (
        <div className={styles['expandedContent']} data-testid="marker-expanded">
          <p className={styles['fullQuestion']}>{question}</p>
          {materialityScore !== undefined && (
            <span className={styles['score']}>Materiality: {materialityScore}/18</span>
          )}
          {alternativesCount !== undefined && (
            <span className={styles['altCount']}>{alternativesCount} alternatives</span>
          )}
          {resolution && (
            <div className={styles['resolutionSummary']}>
              <strong>Resolution:</strong> {resolution.rationale}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
