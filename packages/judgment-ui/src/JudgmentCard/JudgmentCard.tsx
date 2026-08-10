import React from 'react';
import styles from './JudgmentCard.module.css';
import { StatusBadge } from '../StatusBadge';
import { CategoryBadge } from '../CategoryBadge';
import { InterventionLevelBadge } from '../InterventionLevelBadge';

export interface JudgmentCardData {
  id: string;
  status: string;
  category: string;
  question: string;
  materiality: { score: number; interventionLevel?: string };
  authority?: { mode: string };
  resolution?: { selectedAlternativeId: string; rationale: string };
  updatedAt: string;
}

export interface JudgmentCardProps {
  judgmentPoint: JudgmentCardData;
  onSelect?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  className?: string;
}

type JudgmentStatus =
  | 'candidate'
  | 'pending'
  | 'investigating'
  | 'resolved'
  | 'delegated'
  | 'stale'
  | 'reopened'
  | 'dismissed';

const STATUS_ACTIONS: Record<string, string[]> = {
  candidate: [],
  pending: ['Begin Investigation', 'Dismiss', 'Delegate'],
  investigating: ['Add Alternative', 'Resolve', 'Dismiss'],
  resolved: ['Reopen'],
  delegated: ['Resolve', 'Reopen'],
  stale: ['Reopen', 'Confirm Valid'],
  reopened: ['Begin Investigation', 'Dismiss'],
  dismissed: ['Reopen'],
};

const MAX_QUESTION_LENGTH = 100;

function truncateQuestion(text: string): string {
  if (text.length <= MAX_QUESTION_LENGTH) return text;
  return text.slice(0, MAX_QUESTION_LENGTH).trimEnd() + '\u2026';
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

export const JudgmentCard: React.FC<JudgmentCardProps> = ({
  judgmentPoint,
  onSelect,
  onAction,
  className,
}) => {
  const { id, status, category, question, materiality, updatedAt } = judgmentPoint;
  const actions = STATUS_ACTIONS[status] ?? [];

  const classNames = [styles['card'], className].filter(Boolean).join(' ');

  const handleCardClick = (event: React.MouseEvent) => {
    // Don't trigger select if clicking an action button
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    onSelect?.(id);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const target = event.target as HTMLElement;
      if (target.closest('button')) return;
      event.preventDefault();
      onSelect?.(id);
    }
  };

  const handleAction = (action: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    onAction?.(id, action);
  };

  return (
    <div
      className={classNames}
      tabIndex={0}
      role="article"
      aria-label={`Judgment point: ${truncateQuestion(question)}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      data-testid={`judgment-card-${id}`}
    >
      <div className={styles['header']}>
        <div className={styles['badges']}>
          <StatusBadge status={status as JudgmentStatus} />
          <CategoryBadge category={category} />
          {materiality.interventionLevel && (
            <InterventionLevelBadge level={materiality.interventionLevel} />
          )}
        </div>
        <div className={styles['meta']}>
          <span className={styles['score']} data-testid="materiality-score">
            {materiality.score.toFixed(1)}
          </span>
          <time className={styles['timestamp']} dateTime={updatedAt}>
            {formatTimestamp(updatedAt)}
          </time>
        </div>
      </div>

      <p className={styles['question']} title={question}>
        {truncateQuestion(question)}
      </p>

      {actions.length > 0 && (
        <div className={styles['actions']} data-testid="card-actions">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className={styles['actionButton']}
              onClick={handleAction(action)}
              data-testid={`action-${action.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
