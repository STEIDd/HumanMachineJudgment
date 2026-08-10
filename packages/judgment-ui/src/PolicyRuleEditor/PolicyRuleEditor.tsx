import React, { useCallback } from 'react';
import styles from './PolicyRuleEditor.module.css';

export interface PolicyRule {
  condition: {
    categories?: string[];
    materialityRange?: { min: number; max: number };
    hardTriggers?: string[];
  };
  interventionLevel?: string;
  authorityOverride?: string;
}

export interface PolicyRuleEditorProps {
  rule: PolicyRule;
  onChange: (rule: PolicyRule) => void;
  className?: string;
}

const ALL_CATEGORIES = [
  'assumption',
  'method',
  'framing',
  'parameter',
  'boundary',
  'validation',
  'interpretation',
  'scope',
];
const HARD_TRIGGERS = [
  'safety-critical',
  'regulatory',
  'ethical',
  'financial',
  'privacy',
  'irreversible',
];
const INTERVENTION_LEVELS = ['trace', 'disclose', 'pause', 'require-investigation'];
const AUTHORITY_MODES = [
  'agent-autonomous',
  'agent-with-review',
  'collaborative',
  'human-in-the-loop',
  'human-exclusive',
];

export const PolicyRuleEditor: React.FC<PolicyRuleEditorProps> = ({
  rule,
  onChange,
  className,
}) => {
  const handleCategoryToggle = useCallback(
    (cat: string) => {
      const current = rule.condition.categories || [];
      const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
      onChange({
        ...rule,
        condition: { ...rule.condition, categories: updated.length > 0 ? updated : undefined },
      });
    },
    [rule, onChange],
  );

  const handleHardTriggerToggle = useCallback(
    (trigger: string) => {
      const current = rule.condition.hardTriggers || [];
      const updated = current.includes(trigger)
        ? current.filter((t) => t !== trigger)
        : [...current, trigger];
      onChange({
        ...rule,
        condition: { ...rule.condition, hardTriggers: updated.length > 0 ? updated : undefined },
      });
    },
    [rule, onChange],
  );

  const handleMaterialityMin = useCallback(
    (val: number) => {
      const range = rule.condition.materialityRange || { min: 0, max: 18 };
      onChange({
        ...rule,
        condition: { ...rule.condition, materialityRange: { ...range, min: val } },
      });
    },
    [rule, onChange],
  );

  const handleMaterialityMax = useCallback(
    (val: number) => {
      const range = rule.condition.materialityRange || { min: 0, max: 18 };
      onChange({
        ...rule,
        condition: { ...rule.condition, materialityRange: { ...range, max: val } },
      });
    },
    [rule, onChange],
  );

  const handleInterventionLevel = useCallback(
    (val: string) => {
      onChange({ ...rule, interventionLevel: val || undefined });
    },
    [rule, onChange],
  );

  const handleAuthorityOverride = useCallback(
    (val: string) => {
      onChange({ ...rule, authorityOverride: val || undefined });
    },
    [rule, onChange],
  );

  const classNames = [styles['editor'], className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <fieldset className={styles['fieldset']}>
        <legend className={styles['legend']}>Categories</legend>
        <div className={styles['checkboxGrid']}>
          {ALL_CATEGORIES.map((cat) => (
            <label key={cat} className={styles['checkboxLabel']}>
              <input
                type="checkbox"
                checked={(rule.condition.categories || []).includes(cat)}
                onChange={() => handleCategoryToggle(cat)}
                className={styles['checkbox']}
              />
              <span className={styles['checkboxText']}>{cat}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles['field']}>
        <label className={styles['label']}>Materiality Range (0-18)</label>
        <div className={styles['rangeRow']}>
          <div className={styles['rangeField']}>
            <label htmlFor="mat-min" className={styles['subLabel']}>
              Min
            </label>
            <input
              id="mat-min"
              type="number"
              min={0}
              max={18}
              value={rule.condition.materialityRange?.min ?? 0}
              onChange={(e) => handleMaterialityMin(Number(e.target.value))}
              className={styles['numberInput']}
            />
          </div>
          <div className={styles['rangeField']}>
            <label htmlFor="mat-max" className={styles['subLabel']}>
              Max
            </label>
            <input
              id="mat-max"
              type="number"
              min={0}
              max={18}
              value={rule.condition.materialityRange?.max ?? 18}
              onChange={(e) => handleMaterialityMax(Number(e.target.value))}
              className={styles['numberInput']}
            />
          </div>
        </div>
      </div>

      <fieldset className={styles['fieldset']}>
        <legend className={styles['legend']}>Hard Triggers</legend>
        <div className={styles['checkboxGrid']}>
          {HARD_TRIGGERS.map((trigger) => (
            <label key={trigger} className={styles['checkboxLabel']}>
              <input
                type="checkbox"
                checked={(rule.condition.hardTriggers || []).includes(trigger)}
                onChange={() => handleHardTriggerToggle(trigger)}
                className={styles['checkbox']}
              />
              <span className={styles['checkboxText']}>{trigger}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles['field']}>
        <label htmlFor="intervention-level" className={styles['label']}>
          Intervention Level
        </label>
        <select
          id="intervention-level"
          className={styles['select']}
          value={rule.interventionLevel || ''}
          onChange={(e) => handleInterventionLevel(e.target.value)}
        >
          <option value="">-- Select --</option>
          {INTERVENTION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className={styles['field']}>
        <label htmlFor="authority-override" className={styles['label']}>
          Authority Override
        </label>
        <select
          id="authority-override"
          className={styles['select']}
          value={rule.authorityOverride || ''}
          onChange={(e) => handleAuthorityOverride(e.target.value)}
        >
          <option value="">-- Select --</option>
          {AUTHORITY_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
