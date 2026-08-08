import React, { useEffect, useCallback } from 'react';
import styles from './JudgmentPanel.module.css';
import { StatusBadge, type JudgmentStatus } from '../StatusBadge';
import { CategoryBadge } from '../CategoryBadge';
import { InterventionLevelBadge } from '../InterventionLevelBadge';
import { MaterialityGauge } from '../MaterialityGauge';
import { AlternativeCard } from '../AlternativeCard';
import { JudgmentTimeline } from '../JudgmentTimeline';

export interface JudgmentPanelProps {
  judgmentPoint: {
    id: string;
    status: string;
    category: string;
    question: string;
    context: string;
    trigger: { source: string; description: string; hardTrigger?: string };
    materiality: {
      score: number;
      interventionLevel?: string;
      dimensions: {
        methodologicalDiscretion: number;
        downstreamInfluence: number;
        uncertainty: number;
        consequence: number;
        reversibility: number;
        accountabilityRequirement: number;
      };
      hardTrigger?: string;
      detectorConfidence?: number;
    };
    alternatives: Array<{
      id: string;
      label: string;
      description: string;
      tradeoffs?: string;
      source?: string;
    }>;
    artifacts?: Array<{
      id: string;
      artifactType: string;
      label: string;
      relationship: string;
    }>;
    authority: { mode: string; assignedTo?: string };
    resolution?: {
      selectedAlternativeId: string;
      rationale: string;
      resolvedAt: string;
      resolvedBy: string;
      conditions?: string[];
      validationRequirements?: string[];
    };
    unknowns?: string[];
    validityConditions?: string[];
    createdAt: string;
    updatedAt: string;
  };
  events?: Array<{
    id: string;
    type: string;
    timestamp: string;
    actor?: { id: string; type: string };
    previousStatus?: string;
    newStatus?: string;
  }>;
  onClose: () => void;
  onAction: (action: string, data?: unknown) => void;
  className?: string;
}

const statusActions: Record<string, string[]> = {
  candidate: ['Accept', 'Dismiss'],
  pending: ['Investigate', 'Delegate'],
  investigating: ['Resolve', 'Delegate'],
  delegated: ['Reclaim'],
  resolved: ['Reopen'],
  stale: ['Re-evaluate'],
  reopened: ['Investigate', 'Dismiss'],
  dismissed: ['Reopen'],
};

export const JudgmentPanel: React.FC<JudgmentPanelProps> = ({
  judgmentPoint,
  events,
  onClose,
  onAction,
  className,
}) => {
  const jp = judgmentPoint;
  const actions = statusActions[jp.status] || [];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(jp.id);
  };

  const classNames = [styles['panel'], className].filter(Boolean).join(' ');

  return (
    <>
      <div className={styles['backdrop']} onClick={onClose} aria-hidden="true" />
      <aside
        className={classNames}
        role="dialog"
        aria-modal="true"
        aria-label={`Judgment Point: ${jp.question}`}
      >
        {/* Header */}
        <div className={styles['header']}>
          <div className={styles['headerTop']}>
            <button
              className={styles['closeButton']}
              onClick={onClose}
              aria-label="Close panel"
              type="button"
            >
              X
            </button>
          </div>
          <h2 className={styles['question']}>{jp.question}</h2>
          <div className={styles['headerMeta']}>
            <button
              className={styles['idButton']}
              onClick={handleCopyId}
              aria-label={`Copy ID: ${jp.id}`}
              type="button"
            >
              {jp.id}
            </button>
            <StatusBadge status={jp.status as JudgmentStatus} />
            <CategoryBadge category={jp.category} />
            {jp.materiality.interventionLevel && (
              <InterventionLevelBadge level={jp.materiality.interventionLevel} />
            )}
            <time className={styles['timestamp']} dateTime={jp.updatedAt}>
              {jp.updatedAt}
            </time>
          </div>
        </div>

        <div className={styles['content']}>
          {/* Context */}
          <section className={styles['section']} aria-labelledby="context-heading">
            <h3 id="context-heading" className={styles['sectionHeading']}>
              Context
            </h3>
            <p className={styles['contextText']}>{jp.context}</p>
            <div className={styles['triggerInfo']}>
              <div className={styles['triggerItem']}>
                <span className={styles['triggerLabel']}>Source:</span> {jp.trigger.source}
              </div>
              <div className={styles['triggerItem']}>
                <span className={styles['triggerLabel']}>Description:</span>{' '}
                {jp.trigger.description}
              </div>
              {jp.trigger.hardTrigger && (
                <div className={styles['triggerItem']}>
                  <span className={styles['triggerLabel']}>Hard Trigger:</span>{' '}
                  {jp.trigger.hardTrigger}
                </div>
              )}
            </div>
          </section>

          {/* Materiality */}
          <section className={styles['section']} aria-labelledby="materiality-heading">
            <h3 id="materiality-heading" className={styles['sectionHeading']}>
              Materiality
            </h3>
            <MaterialityGauge
              score={jp.materiality.score}
              dimensions={jp.materiality.dimensions}
              interventionLevel={jp.materiality.interventionLevel}
              hardTrigger={jp.materiality.hardTrigger}
              detectorConfidence={jp.materiality.detectorConfidence}
            />
          </section>

          {/* Alternatives */}
          <section className={styles['section']} aria-labelledby="alternatives-heading">
            <h3 id="alternatives-heading" className={styles['sectionHeading']}>
              Alternatives
            </h3>
            <div className={styles['alternativesList']}>
              {jp.alternatives.map((alt) => (
                <AlternativeCard
                  key={alt.id}
                  id={alt.id}
                  label={alt.label}
                  description={alt.description}
                  tradeoffs={alt.tradeoffs}
                  source={alt.source}
                  isSelected={jp.resolution?.selectedAlternativeId === alt.id}
                />
              ))}
            </div>
          </section>

          {/* Evidence */}
          {jp.artifacts && jp.artifacts.length > 0 && (
            <section className={styles['section']} aria-labelledby="evidence-heading">
              <h3 id="evidence-heading" className={styles['sectionHeading']}>
                Evidence
              </h3>
              <ul className={styles['artifactsList']}>
                {jp.artifacts.map((artifact) => (
                  <li key={artifact.id} className={styles['artifactItem']}>
                    <span className={styles['artifactType']}>{artifact.artifactType}</span>
                    <span className={styles['artifactLabel']}>{artifact.label}</span>
                    <span className={styles['artifactRelationship']}>{artifact.relationship}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Unknowns */}
          {jp.unknowns && jp.unknowns.length > 0 && (
            <section className={styles['section']} aria-labelledby="unknowns-heading">
              <h3 id="unknowns-heading" className={styles['sectionHeading']}>
                Known Unknowns
              </h3>
              <ul className={styles['bulletList']}>
                {jp.unknowns.map((unknown, index) => (
                  <li key={index}>{unknown}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Resolution */}
          {jp.resolution && (
            <section className={styles['section']} aria-labelledby="resolution-heading">
              <h3 id="resolution-heading" className={styles['sectionHeading']}>
                Resolution
              </h3>
              <div className={styles['resolutionContent']}>
                <div className={styles['resolutionField']}>
                  <span className={styles['resolutionLabel']}>Rationale:</span>
                  <p className={styles['resolutionText']}>{jp.resolution.rationale}</p>
                </div>
                <div className={styles['resolutionMeta']}>
                  <span>
                    <strong>Resolved by:</strong> {jp.resolution.resolvedBy}
                  </span>
                  <time dateTime={jp.resolution.resolvedAt}>{jp.resolution.resolvedAt}</time>
                </div>
                {jp.resolution.conditions && jp.resolution.conditions.length > 0 && (
                  <div className={styles['resolutionField']}>
                    <span className={styles['resolutionLabel']}>Conditions:</span>
                    <ul className={styles['bulletList']}>
                      {jp.resolution.conditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {jp.resolution.validationRequirements &&
                  jp.resolution.validationRequirements.length > 0 && (
                    <div className={styles['resolutionField']}>
                      <span className={styles['resolutionLabel']}>Validation Requirements:</span>
                      <ul className={styles['bulletList']}>
                        {jp.resolution.validationRequirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </section>
          )}

          {/* Authority */}
          <section className={styles['section']} aria-labelledby="authority-heading">
            <h3 id="authority-heading" className={styles['sectionHeading']}>
              Authority
            </h3>
            <div className={styles['authorityContent']}>
              <span className={styles['authorityMode']}>{jp.authority.mode}</span>
              {jp.authority.assignedTo && (
                <span className={styles['authorityAssigned']}>
                  Assigned to: {jp.authority.assignedTo}
                </span>
              )}
            </div>
          </section>

          {/* Validity Conditions */}
          {jp.validityConditions && jp.validityConditions.length > 0 && (
            <section className={styles['section']} aria-labelledby="validity-heading">
              <h3 id="validity-heading" className={styles['sectionHeading']}>
                Validity Conditions
              </h3>
              <ul className={styles['bulletList']}>
                {jp.validityConditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Timeline */}
          {events && events.length > 0 && (
            <section className={styles['section']} aria-labelledby="timeline-heading">
              <h3 id="timeline-heading" className={styles['sectionHeading']}>
                Timeline
              </h3>
              <JudgmentTimeline events={events} />
            </section>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className={styles['actions']}>
            {actions.map((action) => (
              <button
                key={action}
                className={styles['actionButton']}
                onClick={() => onAction(action.toLowerCase())}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
};
