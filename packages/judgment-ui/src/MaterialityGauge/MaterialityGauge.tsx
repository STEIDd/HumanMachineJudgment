import React from 'react';
import styles from './MaterialityGauge.module.css';

export interface MaterialityDimensions {
  methodologicalDiscretion: number;
  downstreamInfluence: number;
  uncertainty: number;
  consequence: number;
  reversibility: number;
  accountabilityRequirement: number;
}

export interface MaterialityGaugeProps {
  score: number;
  dimensions: MaterialityDimensions;
  interventionLevel?: string;
  hardTrigger?: string;
  detectorConfidence?: number;
  className?: string;
}

const dimensionLabels: Record<keyof MaterialityDimensions, string> = {
  methodologicalDiscretion: 'Methodological Discretion',
  downstreamInfluence: 'Downstream Influence',
  uncertainty: 'Uncertainty',
  consequence: 'Consequence',
  reversibility: 'Reversibility',
  accountabilityRequirement: 'Accountability Requirement',
};

export const MaterialityGauge: React.FC<MaterialityGaugeProps> = ({
  score,
  dimensions,
  interventionLevel,
  hardTrigger,
  detectorConfidence,
  className,
}) => {
  const maxScore = 18;
  const percentage = Math.min((score / maxScore) * 100, 100);
  const classNames = [styles['gauge'], className].filter(Boolean).join(' ');

  return (
    <div className={classNames} aria-label={`Materiality score: ${score} out of ${maxScore}`}>
      <div className={styles['scoreSection']}>
        <div className={styles['scoreBar']}>
          <div
            className={styles['scoreFill']}
            style={{ width: `${percentage}%` }}
            role="meter"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={maxScore}
            aria-label={`Materiality: ${score}`}
          />
        </div>
        <span className={styles['scoreValue']}>
          {score}/{maxScore}
        </span>
      </div>

      {interventionLevel && (
        <div className={styles['interventionLevel']}>Intervention: {interventionLevel}</div>
      )}

      {hardTrigger && <div className={styles['hardTrigger']}>Hard Trigger: {hardTrigger}</div>}

      {detectorConfidence !== undefined && (
        <div className={styles['confidence']}>
          Detector Confidence: {Math.round(detectorConfidence * 100)}%
        </div>
      )}

      <div className={styles['dimensions']}>
        {(Object.entries(dimensions) as Array<[keyof MaterialityDimensions, number]>).map(
          ([key, value]) => (
            <div key={key} className={styles['dimension']}>
              <span className={styles['dimensionLabel']}>{dimensionLabels[key]}</span>
              <div className={styles['dimensionBar']}>
                <div
                  className={styles['dimensionFill']}
                  style={{ width: `${(value / 3) * 100}%` }}
                  role="meter"
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={3}
                  aria-label={`${dimensionLabels[key]}: ${value}`}
                />
              </div>
              <span className={styles['dimensionValue']}>{value}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
};
