import {
  type Actor,
  type ArtifactReference,
  type EventFilters,
  type JudgmentAlternative,
  type JudgmentEvent,
  type JudgmentPoint,
  type JudgmentPointFilters,
  type JudgmentPolicy,
  type JudgmentResolution,
  type JudgmentStorage,
  type MaterialityAssessment,
  type MaterialityDimensions,
  type PaginatedResult,
  assertTransition,
  canDismiss,
  canInvestigate,
  canMarkStale,
  canPromote,
  canReopen,
  canResolve,
  computeAggregateScore,
  computeInterventionLevel,
  createAlternativeAddedEvent,
  createArtifactLinkedEvent,
  createArtifactUnlinkedEvent,
  createComparisonCompletedEvent,
  createComparisonRequestedEvent,
  createCreatedEvent,
  createDelegatedEvent,
  createDismissedEvent,
  createInvestigationStartedEvent,
  createMarkedStaleEvent,
  createPromotedEvent,
  createReopenedEvent,
  createResolutionRecordedEvent,
  generateId,
  GuardError,
  NotFoundError,
  applyEvent,
} from '@human-machine-judgment/core';

// ---------------------------------------------------------------------------
// Params types
// ---------------------------------------------------------------------------

export interface CreateCandidateParams {
  readonly projectId: string;
  readonly category: JudgmentPoint['category'];
  readonly question: string;
  readonly context: string;
  readonly trigger: JudgmentPoint['trigger'];
  readonly materiality: JudgmentPoint['materiality'];
  readonly alternatives: readonly JudgmentAlternative[];
  readonly affectedArtifactIds?: readonly string[];
  readonly authority: JudgmentPoint['authority'];
  readonly validityConditions?: readonly string[];
  readonly reopenConditions?: readonly string[];
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class JudgmentClient {
  constructor(private readonly storage: JudgmentStorage) {}

  // -----------------------------------------------------------------------
  // Lifecycle operations
  // -----------------------------------------------------------------------

  async createCandidate(params: CreateCandidateParams, actor: Actor): Promise<JudgmentPoint> {
    const id = generateId();

    const point: JudgmentPoint = {
      id,
      projectId: params.projectId,
      category: params.category,
      question: params.question,
      context: params.context,
      trigger: params.trigger,
      materiality: params.materiality,
      status: 'candidate',
      alternatives: params.alternatives,
      evidenceRefs: [],
      affectedArtifactIds: params.affectedArtifactIds ?? [],
      authority: params.authority,
      validityConditions: params.validityConditions ?? [],
      reopenConditions: params.reopenConditions ?? [],
      revisionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const event = createCreatedEvent({
      judgmentPointId: id,
      projectId: params.projectId,
      actor,
      candidateData: point as unknown as Record<string, unknown>,
    });

    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(point);

    return point;
  }

  async promote(id: string, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'pending');
    const guard = canPromote(point);
    if (!guard.allowed) {
      throw new GuardError('Cannot promote', guard.reasons);
    }

    const event = createPromotedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      newStatus: 'pending',
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async startInvestigation(id: string, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'investigating');
    const guard = canInvestigate(point);
    if (!guard.allowed) {
      throw new GuardError('Cannot start investigation', guard.reasons);
    }

    const event = createInvestigationStartedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      newStatus: 'investigating',
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async resolve(id: string, resolution: JudgmentResolution, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'resolved');
    const guard = canResolve(point, actor, resolution.selectedAlternativeId, resolution.rationale);
    if (!guard.allowed) {
      throw new GuardError('Cannot resolve', guard.reasons);
    }

    const event = createResolutionRecordedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      resolution,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async delegate(
    id: string,
    delegateId: string,
    policyId: string,
    actor: Actor,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'delegated');

    const event = createDelegatedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      delegateId,
      policyId,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async dismiss(id: string, reason: string, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'dismissed');
    const guard = canDismiss(point, point.materiality.interventionLevel ?? 'trace');
    if (!guard.allowed) {
      throw new GuardError('Cannot dismiss', guard.reasons);
    }

    const event = createDismissedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      reason,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async reopen(id: string, reason: string, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'reopened');
    const guard = canReopen(point, reason);
    if (!guard.allowed) {
      throw new GuardError('Cannot reopen', guard.reasons);
    }

    const event = createReopenedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      previousStatus: point.status,
      reason,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async markStale(id: string, reason: string, actor: Actor): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    assertTransition(point.status, 'stale');
    const guard = canMarkStale(point, reason);
    if (!guard.allowed) {
      throw new GuardError('Cannot mark stale', guard.reasons);
    }

    const event = createMarkedStaleEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      reason,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  // -----------------------------------------------------------------------
  // Query operations
  // -----------------------------------------------------------------------

  async getJudgmentPoint(id: string): Promise<JudgmentPoint | null> {
    return this.storage.getJudgmentPoint(id);
  }

  async listJudgmentPoints(
    projectId: string,
    filters?: JudgmentPointFilters,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<JudgmentPoint>> {
    return this.storage.getJudgmentPoints(projectId, filters, offset, limit);
  }

  async getEvents(
    judgmentPointId: string,
    filters?: EventFilters,
  ): Promise<readonly JudgmentEvent[]> {
    return this.storage.getEvents(judgmentPointId, filters);
  }

  // -----------------------------------------------------------------------
  // Alternative operations
  // -----------------------------------------------------------------------

  async addAlternative(
    id: string,
    alternative: JudgmentAlternative,
    actor: Actor,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    const event = createAlternativeAddedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      alternative,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async requestComparison(
    id: string,
    alternativeIds: readonly string[],
    actor: Actor,
    criteria?: string,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    const event = createComparisonRequestedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      alternativeIds,
      criteria,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async completeComparison(
    id: string,
    results: Record<string, unknown>,
    actor: Actor,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    const event = createComparisonCompletedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      results,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  // -----------------------------------------------------------------------
  // Artifact operations
  // -----------------------------------------------------------------------

  async linkArtifact(
    id: string,
    artifact: ArtifactReference,
    actor: Actor,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    const event = createArtifactLinkedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      artifact,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  async unlinkArtifact(
    id: string,
    artifactId: string,
    reason: string,
    actor: Actor,
  ): Promise<JudgmentPoint> {
    const point = await this.requirePoint(id);

    const event = createArtifactUnlinkedEvent({
      judgmentPointId: id,
      projectId: point.projectId,
      actor,
      artifactId,
      reason,
    });

    const updated = applyEvent(point, event);
    await this.storage.appendEvent(event);
    await this.storage.saveJudgmentPoint(updated);
    return updated;
  }

  // -----------------------------------------------------------------------
  // Policy operations
  // -----------------------------------------------------------------------

  async addPolicy(policy: JudgmentPolicy): Promise<void> {
    await this.storage.savePolicy(policy);
  }

  async getPolicies(projectId: string): Promise<readonly JudgmentPolicy[]> {
    return this.storage.getPolicies(projectId);
  }

  async updatePolicy(policy: JudgmentPolicy): Promise<void> {
    await this.storage.updatePolicy(policy);
  }

  // -----------------------------------------------------------------------
  // Materiality
  // -----------------------------------------------------------------------

  assessMateriality(
    dimensions: MaterialityDimensions,
    hardTrigger?: string,
  ): MaterialityAssessment {
    const score = computeAggregateScore(dimensions);
    const assessment: MaterialityAssessment = {
      score,
      dimensions,
      hardTrigger,
    };
    const interventionLevel = computeInterventionLevel(assessment);
    return { ...assessment, interventionLevel };
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private async requirePoint(id: string): Promise<JudgmentPoint> {
    const point = await this.storage.getJudgmentPoint(id);
    if (point == null) {
      throw new NotFoundError(`Judgment point '${id}' not found`);
    }
    return point;
  }
}
