import React from 'react';
import styles from './ActivityFeed.module.css';

export interface ActivityItem {
  id: string;
  eventType: string;
  timestamp: string;
  pointQuestion?: string;
  actor?: { id: string; type: string };
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  className?: string;
}

const MAX_QUESTION_LENGTH = 60;

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '\u2026';
}

function formatEventType(type: string): string {
  return type.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ items, maxItems = 10, className }) => {
  const classNames = [styles['feed'], className].filter(Boolean).join(' ');
  const visibleItems = items.slice(0, maxItems);

  return (
    <ul className={classNames} aria-label="Recent activity">
      {visibleItems.map((item) => (
        <li key={item.id} className={styles['row']} data-testid={`activity-item-${item.id}`}>
          <time className={styles['timestamp']} dateTime={item.timestamp}>
            {formatTimestamp(item.timestamp)}
          </time>
          <span className={styles['eventType']}>{formatEventType(item.eventType)}</span>
          {item.pointQuestion && (
            <span className={styles['question']} title={item.pointQuestion}>
              {truncateText(item.pointQuestion, MAX_QUESTION_LENGTH)}
            </span>
          )}
          {item.actor && (
            <span className={styles['actor']} data-testid="activity-actor">
              {item.actor.type}: {item.actor.id}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
