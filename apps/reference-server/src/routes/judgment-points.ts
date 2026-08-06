import type { FastifyInstance } from 'fastify';
import type { JudgmentClient } from '@human-machine-judgment/sdk';
import type { JudgmentPointFilters } from '@human-machine-judgment/core';
import { NotFoundError } from '@human-machine-judgment/core';

async function requirePointInProject(
  client: JudgmentClient,
  projectId: string,
  id: string,
): Promise<void> {
  const point = await client.getJudgmentPoint(id);
  if (point == null || point.projectId !== projectId) {
    throw new NotFoundError(`Judgment point '${id}' not found`);
  }
}

export async function judgmentPointRoutes(
  app: FastifyInstance,
  client: JudgmentClient,
): Promise<void> {
  // Create a judgment candidate
  app.post<{
    Params: { projectId: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points', async (request, reply) => {
    const { projectId } = request.params;
    const body = request.body;
    const actor = {
      id: (body['actorId'] as string) ?? 'system',
      type: (body['actorType'] as 'user' | 'agent' | 'system' | 'policy') ?? 'system',
    } as const;

    const point = await client.createCandidate(
      {
        projectId,
        category: body['category'] as never,
        question: body['question'] as string,
        context: body['context'] as string,
        trigger: body['trigger'] as never,
        materiality: body['materiality'] as never,
        alternatives: (body['alternatives'] as never[]) ?? [],
        affectedArtifactIds: body['affectedArtifactIds'] as string[] | undefined,
        authority: body['authority'] as never,
        validityConditions: body['validityConditions'] as string[] | undefined,
        reopenConditions: body['reopenConditions'] as string[] | undefined,
      },
      actor,
    );

    void reply.status(201);
    return point;
  });

  // List judgment points
  app.get<{
    Params: { projectId: string };
    Querystring: Record<string, string | undefined>;
  }>('/api/v1/projects/:projectId/judgment-points', async (request) => {
    const { projectId } = request.params;
    const query = request.query;

    const filters: JudgmentPointFilters = {
      status: query['status'] ? (query['status'].split(',') as never[]) : undefined,
      category: query['category'] ? (query['category'].split(',') as never[]) : undefined,
      materialityScoreMin: query['materialityScoreMin']
        ? parseInt(query['materialityScoreMin'], 10)
        : undefined,
      materialityScoreMax: query['materialityScoreMax']
        ? parseInt(query['materialityScoreMax'], 10)
        : undefined,
      createdAfter: query['createdAfter'],
      createdBefore: query['createdBefore'],
    };

    const offset = query['offset'] ? parseInt(query['offset'], 10) : 0;
    const limit = query['limit'] ? parseInt(query['limit'], 10) : 50;

    return client.listJudgmentPoints(projectId, filters, offset, limit);
  });

  // Get a single judgment point
  app.get<{
    Params: { projectId: string; id: string };
  }>('/api/v1/projects/:projectId/judgment-points/:id', async (request) => {
    const { projectId, id } = request.params;
    const point = await client.getJudgmentPoint(id);
    if (point == null || point.projectId !== projectId) {
      throw new NotFoundError(`Judgment point '${id}' not found`);
    }
    return point;
  });

  // Promote
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/promote', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body ?? {};
    const actor = extractActor(body);
    return client.promote(id, actor);
  });

  // Start investigation
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/investigate', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body ?? {};
    const actor = extractActor(body);
    return client.startInvestigation(id, actor);
  });

  // Resolve
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/resolve', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    const resolution = body['resolution'] as never;
    return client.resolve(id, resolution, actor);
  });

  // Delegate
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/delegate', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    return client.delegate(id, body['delegateId'] as string, body['policyId'] as string, actor);
  });

  // Dismiss
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/dismiss', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    return client.dismiss(id, body['reason'] as string, actor);
  });

  // Reopen
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/reopen', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    return client.reopen(id, body['reason'] as string, actor);
  });

  // Mark stale
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/mark-stale', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    return client.markStale(id, body['reason'] as string, actor);
  });

  // Add alternative
  app.post<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/alternatives', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    const alternative = body['alternative'] as never;
    return client.addAlternative(id, alternative, actor);
  });

  // Link artifact
  app.post<{
    Params: { projectId: string; id: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/artifacts', async (request) => {
    const { projectId, id } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body;
    const actor = extractActor(body);
    const artifact = body['artifact'] as never;
    return client.linkArtifact(id, artifact, actor);
  });

  // Unlink artifact
  app.delete<{
    Params: { projectId: string; id: string; artifactId: string };
    Body: Record<string, unknown>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/artifacts/:artifactId', async (request) => {
    const { projectId, id, artifactId } = request.params;
    await requirePointInProject(client, projectId, id);
    const body = request.body ?? {};
    const actor = extractActor(body);
    return client.unlinkArtifact(id, artifactId, (body['reason'] as string) ?? '', actor);
  });
}

function extractActor(body: Record<string, unknown>): {
  id: string;
  type: 'user' | 'agent' | 'system' | 'policy';
} {
  return {
    id: (body['actorId'] as string) ?? 'system',
    type: (body['actorType'] as 'user' | 'agent' | 'system' | 'policy') ?? 'system',
  };
}
