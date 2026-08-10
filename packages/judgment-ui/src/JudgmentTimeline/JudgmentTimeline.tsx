import React from 'react';
import styles from './JudgmentTimeline.module.css';

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  actor?: { id: string; type: string };
  previousStatus?: string;
  newStatus?: string;
  payload?: Record<string, unknown>;
}

export interface JudgmentTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const EVENT_COLORS: Record<string, string> = {
  created: 'var(--jp-color-candidate)',
  identified: 'var(--jp-color-pending)',
  'investigation-started': 'var(--jp-color-investigating)',
  resolved: 'var(--jp-color-resolved)',
  delegated: 'var(--jp-color-delegated)',
  stale: 'var(--jp-color-stale)',
  reopened: 'var(--jp-color-reopened)',
  dismissed: 'var(--jp-color-dismissed)',
};

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

export const JudgmentTimeline: React.FC<JudgmentTimelineProps> = ({ events, className }) => {
  const classNames = [styles['timeline'], className].filter(Boolean).join(' ');

  // Sort events in reverse chronological order
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ol className={classNames} aria-label="Judgment timeline">
      {sortedEvents.map((event) => {
        const dotColor = EVENT_COLORS[event.type] ?? 'var(--jp-color-text-secondary)';

        return (
          <li key={event.id} className={styles['entry']} data-testid={`timeline-event-${event.id}`}>
            <div className={styles['connector']}>
              <svg
                className={styles['dot']}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                aria-hidden="true"
              >
                <circle cx="6" cy="6" r="5" fill={dotColor} stroke={dotColor} strokeWidth="1" />
              </svg>
              <div className={styles['line']} aria-hidden="true" />
            </div>
            <div className={styles['content']}>
              <div className={styles['header']}>
                <span className={styles['eventType']}>{formatEventType(event.type)}</span>
                <time className={styles['timestamp']} dateTime={event.timestamp}>
                  {formatTimestamp(event.timestamp)}
                </time>
              </div>
              {(event.previousStatus || event.newStatus) && (
                <div className={styles['transition']} data-testid="status-transition">
                  {event.previousStatus && (
                    <span className={styles['status']}>{event.previousStatus}</span>
                  )}
                  {event.previousStatus && event.newStatus && (
                    <span className={styles['arrow']} aria-label="transitioned to">
                      &rarr;
                    </span>
                  )}
                  {event.newStatus && <span className={styles['status']}>{event.newStatus}</span>}
                </div>
              )}
              {event.actor && (
                <div className={styles['actor']} data-testid="event-actor">
                  <span className={styles['actorType']}>{event.actor.type}</span>
                  <span className={styles['actorId']}>{event.actor.id}</span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
