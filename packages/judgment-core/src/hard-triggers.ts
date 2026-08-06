import type { InterventionLevel } from './types.js';

export interface HardTriggerDefinition {
  readonly name: string;
  readonly description: string;
  readonly defaultIntervention: InterventionLevel;
}

/**
 * The 10 hard trigger rules from the specification.
 * Hard triggers force a specific intervention level regardless of materiality score.
 */
export const ALL_HARD_TRIGGERS: readonly HardTriggerDefinition[] = [
  {
    name: 'objective-redefinition',
    description: 'The agent is changing or redefining the stated objective of the analysis.',
    defaultIntervention: 'require-investigation',
  },
  {
    name: 'safety-factor-selection',
    description:
      'The agent is selecting or modifying a safety factor, design margin, or knockdown factor.',
    defaultIntervention: 'pause',
  },
  {
    name: 'data-exclusion',
    description: 'The agent is excluding, filtering, or discarding data points from a dataset.',
    defaultIntervention: 'pause',
  },
  {
    name: 'irreversible-commitment',
    description:
      'The agent is making a commitment that cannot be reversed within the project timeline.',
    defaultIntervention: 'pause',
  },
  {
    name: 'validation-criterion-selection',
    description:
      'The agent is defining or modifying the criteria used to determine whether results are acceptable.',
    defaultIntervention: 'pause',
  },
  {
    name: 'external-requirement-interpretation',
    description:
      'The agent is interpreting an external requirement, standard, or specification in a way that involves discretion.',
    defaultIntervention: 'pause',
  },
  {
    name: 'contradictory-evidence',
    description:
      'The agent has encountered evidence that contradicts a prior assumption or decision.',
    defaultIntervention: 'require-investigation',
  },
  {
    name: 'model-substitution',
    description:
      'The agent is replacing one analytical or computational model with a different model.',
    defaultIntervention: 'pause',
  },
  {
    name: 'worst-case-best-case-assumption',
    description:
      'The agent is assuming a worst-case or best-case value for a parameter where the actual value is uncertain.',
    defaultIntervention: 'disclose',
  },
  {
    name: 'conclusion-recommendation-formulation',
    description:
      'The agent is formulating a conclusion or recommendation based on analysis results.',
    defaultIntervention: 'pause',
  },
];

const TRIGGER_MAP = new Map<string, HardTriggerDefinition>(
  ALL_HARD_TRIGGERS.map((t) => [t.name, t]),
);

/**
 * Look up a hard trigger definition by name.
 */
export function getHardTrigger(name: string): HardTriggerDefinition | undefined {
  return TRIGGER_MAP.get(name);
}

/**
 * Get the default intervention level for a named hard trigger.
 * Returns 'pause' if the trigger name is unknown.
 */
export function getHardTriggerIntervention(name: string): InterventionLevel {
  return TRIGGER_MAP.get(name)?.defaultIntervention ?? 'pause';
}

/**
 * Check whether a name corresponds to a known hard trigger.
 */
export function isHardTrigger(name: string): boolean {
  return TRIGGER_MAP.has(name);
}
