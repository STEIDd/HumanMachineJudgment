import React, { useState, useCallback } from 'react';
import styles from './ResolutionForm.module.css';

export interface ResolutionFormProps {
  alternatives: Array<{ id: string; label: string; description: string }>;
  onSubmit: (data: {
    selectedAlternativeId: string;
    rationale: string;
    conditions?: string[];
    validationRequirements?: string[];
  }) => void;
  onCancel: () => void;
  className?: string;
}

export const ResolutionForm: React.FC<ResolutionFormProps> = ({
  alternatives,
  onSubmit,
  onCancel,
  className,
}) => {
  const [selectedId, setSelectedId] = useState('');
  const [rationale, setRationale] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [validationReqs, setValidationReqs] = useState<string[]>([]);
  const [validationInput, setValidationInput] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isValid = selectedId !== '' && rationale.length >= 10;

  const handleAddCondition = useCallback(() => {
    if (conditionInput.trim()) {
      setConditions((prev) => [...prev, conditionInput.trim()]);
      setConditionInput('');
    }
  }, [conditionInput]);

  const handleRemoveCondition = useCallback((index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddValidation = useCallback(() => {
    if (validationInput.trim()) {
      setValidationReqs((prev) => [...prev, validationInput.trim()]);
      setValidationInput('');
    }
  }, [validationInput]);

  const handleRemoveValidation = useCallback((index: number) => {
    setValidationReqs((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitClick = useCallback(() => {
    if (isValid) {
      setShowConfirmation(true);
    }
  }, [isValid]);

  const handleConfirm = useCallback(() => {
    onSubmit({
      selectedAlternativeId: selectedId,
      rationale,
      conditions: conditions.length > 0 ? conditions : undefined,
      validationRequirements: validationReqs.length > 0 ? validationReqs : undefined,
    });
  }, [selectedId, rationale, conditions, validationReqs, onSubmit]);

  const classNames = [styles['form'], className].filter(Boolean).join(' ');
  const selectedAlt = alternatives.find((a) => a.id === selectedId);

  if (showConfirmation) {
    return (
      <div className={classNames}>
        <h3 className={styles['heading']}>Confirm Resolution</h3>
        <div className={styles['confirmationSummary']}>
          <div className={styles['summaryItem']}>
            <strong>Selected:</strong> {selectedAlt?.label}
          </div>
          <div className={styles['summaryItem']}>
            <strong>Rationale:</strong> {rationale}
          </div>
          {conditions.length > 0 && (
            <div className={styles['summaryItem']}>
              <strong>Conditions:</strong>
              <ul>
                {conditions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {validationReqs.length > 0 && (
            <div className={styles['summaryItem']}>
              <strong>Validation Requirements:</strong>
              <ul>
                {validationReqs.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className={styles['buttonGroup']}>
          <button
            type="button"
            className={styles['secondaryButton']}
            onClick={() => setShowConfirmation(false)}
          >
            Back
          </button>
          <button type="button" className={styles['primaryButton']} onClick={handleConfirm}>
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={classNames}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmitClick();
      }}
    >
      <h3 className={styles['heading']}>Resolve Judgment Point</h3>

      <fieldset className={styles['fieldset']}>
        <legend className={styles['legend']}>Select Alternative</legend>
        {alternatives.map((alt) => (
          <label key={alt.id} className={styles['radioLabel']}>
            <input
              type="radio"
              name="alternative"
              value={alt.id}
              checked={selectedId === alt.id}
              onChange={() => setSelectedId(alt.id)}
              className={styles['radio']}
              aria-required="true"
            />
            <div className={styles['radioContent']}>
              <span className={styles['radioTitle']}>{alt.label}</span>
              <span className={styles['radioDesc']}>{alt.description}</span>
            </div>
          </label>
        ))}
      </fieldset>

      <div className={styles['field']}>
        <label htmlFor="rationale" className={styles['label']}>
          Rationale <span className={styles['required']}>*</span>
        </label>
        <textarea
          id="rationale"
          className={styles['textarea']}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Explain the reasoning (min 10 characters)..."
          rows={4}
          aria-required="true"
          minLength={10}
        />
        {rationale.length > 0 && rationale.length < 10 && (
          <span className={styles['hint']}>{10 - rationale.length} more characters needed</span>
        )}
      </div>

      <div className={styles['field']}>
        <label htmlFor="condition-input" className={styles['label']}>
          Conditions (optional)
        </label>
        <div className={styles['addItemRow']}>
          <input
            id="condition-input"
            type="text"
            className={styles['input']}
            value={conditionInput}
            onChange={(e) => setConditionInput(e.target.value)}
            placeholder="Add a condition..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCondition();
              }
            }}
          />
          <button type="button" className={styles['addButton']} onClick={handleAddCondition}>
            Add
          </button>
        </div>
        {conditions.length > 0 && (
          <ul className={styles['itemList']}>
            {conditions.map((c, i) => (
              <li key={i} className={styles['item']}>
                {c}
                <button
                  type="button"
                  className={styles['removeButton']}
                  onClick={() => handleRemoveCondition(i)}
                  aria-label={`Remove condition: ${c}`}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles['field']}>
        <label htmlFor="validation-input" className={styles['label']}>
          Validation Requirements (optional)
        </label>
        <div className={styles['addItemRow']}>
          <input
            id="validation-input"
            type="text"
            className={styles['input']}
            value={validationInput}
            onChange={(e) => setValidationInput(e.target.value)}
            placeholder="Add a requirement..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddValidation();
              }
            }}
          />
          <button type="button" className={styles['addButton']} onClick={handleAddValidation}>
            Add
          </button>
        </div>
        {validationReqs.length > 0 && (
          <ul className={styles['itemList']}>
            {validationReqs.map((r, i) => (
              <li key={i} className={styles['item']}>
                {r}
                <button
                  type="button"
                  className={styles['removeButton']}
                  onClick={() => handleRemoveValidation(i)}
                  aria-label={`Remove requirement: ${r}`}
                >
                  x
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles['buttonGroup']}>
        <button type="button" className={styles['secondaryButton']} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={styles['primaryButton']} disabled={!isValid}>
          Submit
        </button>
      </div>
    </form>
  );
};
