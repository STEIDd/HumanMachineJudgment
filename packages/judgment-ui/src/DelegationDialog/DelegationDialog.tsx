import React, { useState, useEffect, useCallback } from 'react';
import styles from './DelegationDialog.module.css';

export interface DelegationDialogProps {
  pointId: string;
  question: string;
  delegationConditions?: string[];
  onConfirm: (data: { reason: string }) => void;
  onCancel: () => void;
  className?: string;
}

export const DelegationDialog: React.FC<DelegationDialogProps> = ({
  pointId: _pointId,
  question,
  delegationConditions,
  onConfirm,
  onCancel,
  className,
}) => {
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const classNames = [styles['overlay'], className].filter(Boolean).join(' ');

  if (showConfirmation) {
    return (
      <div className={classNames}>
        <div className={styles['backdrop']} onClick={onCancel} aria-hidden="true" />
        <div
          className={styles['dialog']}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delegation"
        >
          <h2 className={styles['heading']}>Confirm Delegation</h2>
          <div className={styles['summary']}>
            <p>
              <strong>Question:</strong> {question}
            </p>
            <p>
              <strong>Reason:</strong> {reason}
            </p>
          </div>
          <div className={styles['buttonGroup']}>
            <button
              type="button"
              className={styles['secondaryButton']}
              onClick={() => setShowConfirmation(false)}
            >
              Back
            </button>
            <button
              type="button"
              className={styles['primaryButton']}
              onClick={() => onConfirm({ reason })}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={classNames}>
      <div className={styles['backdrop']} onClick={onCancel} aria-hidden="true" />
      <div
        className={styles['dialog']}
        role="dialog"
        aria-modal="true"
        aria-label="Delegate judgment point"
      >
        <h2 className={styles['heading']}>Delegate Judgment Point</h2>
        <p className={styles['question']}>{question}</p>
        {delegationConditions && delegationConditions.length > 0 && (
          <div className={styles['conditions']}>
            <h3 className={styles['conditionsHeading']}>Delegation Conditions</h3>
            <ul className={styles['conditionsList']}>
              {delegationConditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles['field']}>
          <label htmlFor="delegation-reason" className={styles['label']}>
            Reason for delegation
          </label>
          <textarea
            id="delegation-reason"
            className={styles['textarea']}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this is being delegated..."
            rows={4}
            aria-required="true"
          />
        </div>
        <div className={styles['buttonGroup']}>
          <button type="button" className={styles['secondaryButton']} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles['primaryButton']}
            disabled={reason.trim().length === 0}
            onClick={() => setShowConfirmation(true)}
          >
            Delegate
          </button>
        </div>
      </div>
    </div>
  );
};
