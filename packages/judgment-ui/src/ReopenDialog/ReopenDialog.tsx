import React, { useState, useEffect, useCallback } from 'react';
import styles from './ReopenDialog.module.css';

export interface ReopenDialogProps {
  pointId: string;
  question: string;
  onConfirm: (data: { reason: string }) => void;
  onCancel: () => void;
  className?: string;
}

export const ReopenDialog: React.FC<ReopenDialogProps> = ({
  pointId: _pointId,
  question,
  onConfirm,
  onCancel,
  className,
}) => {
  const [reason, setReason] = useState('');

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

  const handleConfirm = () => {
    if (reason.trim().length > 0) {
      onConfirm({ reason: reason.trim() });
    }
  };

  const classNames = [styles['overlay'], className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className={styles['backdrop']} onClick={onCancel} aria-hidden="true" />
      <div
        className={styles['dialog']}
        role="dialog"
        aria-modal="true"
        aria-label="Reopen judgment point"
      >
        <h2 className={styles['heading']}>Reopen Judgment Point</h2>
        <p className={styles['question']}>{question}</p>
        <div className={styles['field']}>
          <label htmlFor="reopen-reason" className={styles['label']}>
            Reason for reopening
          </label>
          <textarea
            id="reopen-reason"
            className={styles['textarea']}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this judgment point should be reopened..."
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
            onClick={handleConfirm}
          >
            Reopen
          </button>
        </div>
      </div>
    </div>
  );
};
