import React, { useCallback, useEffect, useState } from 'react';
import { PolicyRuleEditor } from '@human-machine-judgment/ui';
import { useAppContext } from '../state/context';
import { usePolicies } from '../hooks/usePolicies';
import type { AuthorityMode, JudgmentCategory, PolicyResponse, PolicyRule } from '../api/types';
import styles from './PolicyManagement.module.css';

/**
 * Shape the PolicyRuleEditor UI component expects.
 * Mirrors the interface exported from the PolicyRuleEditor source.
 */
interface EditorRule {
  condition: {
    categories?: string[];
    materialityRange?: { min: number; max: number };
    hardTriggers?: string[];
  };
  interventionLevel?: string;
  authorityOverride?: string;
}

export interface PolicyManagementProps {
  projectId: string;
}

/**
 * Maps a backend PolicyRule to the shape the PolicyRuleEditor UI component expects.
 */
function toEditorRule(rule: PolicyRule): EditorRule {
  return {
    condition: {
      categories: rule.condition.categories ?? undefined,
      materialityRange:
        rule.condition.materialityScoreMin != null && rule.condition.materialityScoreMax != null
          ? { min: rule.condition.materialityScoreMin, max: rule.condition.materialityScoreMax }
          : undefined,
      hardTriggers: rule.condition.hardTrigger ? [rule.condition.hardTrigger] : undefined,
    },
    interventionLevel: rule.intervention,
    authorityOverride: rule.authorityOverride?.mode,
  };
}

export const PolicyManagement: React.FC<PolicyManagementProps> = ({ projectId }) => {
  const { state, dispatch } = useAppContext();
  const { policies, loading, error, refetch, createPolicy, updatePolicy } = usePolicies();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Sync project ID
  useEffect(() => {
    if (state.currentProjectId !== projectId) {
      dispatch({ type: 'SET_PROJECT', projectId });
    }
  }, [projectId, state.currentProjectId, dispatch]);

  // Fetch policies on mount / project change
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // -------------------------------------------------------------------------
  // Create new policy
  // -------------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createPolicy({
        name: newName.trim(),
        description: newDescription.trim() || 'New policy',
        scope: {},
        rules: [],
        priority: policies.length + 1,
        enabled: true,
      });
      setNewName('');
      setNewDescription('');
      setShowNewForm(false);
    } finally {
      setCreating(false);
    }
  }, [newName, newDescription, policies.length, createPolicy]);

  // -------------------------------------------------------------------------
  // Update a rule within a policy
  // -------------------------------------------------------------------------

  const handleRuleChange = useCallback(
    async (policy: PolicyResponse, ruleIndex: number, editorRule: EditorRule) => {
      const updatedRules: PolicyRule[] = policy.rules.map((r, i) => {
        if (i !== ruleIndex) return r;
        return {
          ...r,
          condition: {
            ...r.condition,
            categories: (editorRule.condition.categories as JudgmentCategory[] | undefined) ?? null,
            materialityScoreMin: editorRule.condition.materialityRange?.min ?? null,
            materialityScoreMax: editorRule.condition.materialityRange?.max ?? null,
            hardTrigger:
              editorRule.condition.hardTriggers && editorRule.condition.hardTriggers.length > 0
                ? (editorRule.condition.hardTriggers[0] ?? null)
                : null,
          },
          intervention: (editorRule.interventionLevel ??
            r.intervention) as PolicyRule['intervention'],
          authorityOverride: editorRule.authorityOverride
            ? {
                mode: editorRule.authorityOverride as AuthorityMode,
                actorId: null,
                policyId: null,
              }
            : r.authorityOverride,
        };
      });

      await updatePolicy(policy.id, {
        name: policy.name,
        description: policy.description,
        scope: policy.scope,
        rules: updatedRules,
        priority: policy.priority,
        enabled: policy.enabled,
      });
    },
    [updatePolicy],
  );

  // -------------------------------------------------------------------------
  // Toggle enabled
  // -------------------------------------------------------------------------

  const handleToggleEnabled = useCallback(
    async (policy: PolicyResponse) => {
      await updatePolicy(policy.id, {
        name: policy.name,
        description: policy.description,
        scope: policy.scope,
        rules: policy.rules,
        priority: policy.priority,
        enabled: !policy.enabled,
      });
    },
    [updatePolicy],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <h2 className={styles['title']}>Policies: {projectId}</h2>
        <button
          type="button"
          className={styles['createButton']}
          onClick={() => setShowNewForm(true)}
          disabled={loading || showNewForm}
        >
          Create Policy
        </button>
      </div>

      {error && <div className={styles['errorMessage']}>{error}</div>}

      {showNewForm && (
        <div className={styles['newPolicyForm']}>
          <div className={styles['field']}>
            <label htmlFor="policy-name" className={styles['label']}>
              Policy Name
            </label>
            <input
              id="policy-name"
              type="text"
              className={styles['input']}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter policy name"
            />
          </div>
          <div className={styles['field']}>
            <label htmlFor="policy-description" className={styles['label']}>
              Description
            </label>
            <input
              id="policy-description"
              type="text"
              className={styles['input']}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className={styles['buttonGroup']}>
            <button
              type="button"
              className={styles['secondaryButton']}
              onClick={() => {
                setShowNewForm(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles['primaryButton']}
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading && policies.length === 0 && (
        <div className={styles['loadingMessage']}>Loading policies...</div>
      )}

      {!loading && policies.length === 0 && !showNewForm && (
        <div className={styles['emptyState']}>
          <p>No policies defined for this project yet.</p>
          <p>Create a policy to define intervention rules for judgment points.</p>
        </div>
      )}

      <div className={styles['policyList']}>
        {policies.map((policy) => (
          <div key={policy.id} className={styles['policyCard']}>
            <div className={styles['policyHeader']}>
              <h3 className={styles['policyName']}>{policy.name}</h3>
              <div className={styles['policyMeta']}>
                <span className={policy.enabled ? styles['enabledBadge'] : styles['disabledBadge']}>
                  {policy.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span>Priority: {policy.priority}</span>
                <button
                  type="button"
                  className={styles['toggleButton']}
                  onClick={() => void handleToggleEnabled(policy)}
                >
                  {policy.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
            <p className={styles['policyDescription']}>{policy.description}</p>

            {policy.rules.length > 0 && (
              <div className={styles['ruleSection']}>
                <h4 className={styles['ruleHeading']}>Rules ({policy.rules.length})</h4>
                {policy.rules.map((rule, ruleIndex) => (
                  <PolicyRuleEditor
                    key={rule.id}
                    rule={toEditorRule(rule)}
                    onChange={(updatedRule: EditorRule) =>
                      void handleRuleChange(policy, ruleIndex, updatedRule)
                    }
                  />
                ))}
              </div>
            )}

            {policy.rules.length === 0 && (
              <div className={styles['ruleSection']}>
                <p className={styles['ruleHeading']}>No rules defined for this policy.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
