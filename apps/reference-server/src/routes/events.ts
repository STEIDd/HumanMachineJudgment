import type { FastifyInstance } from 'fastify';
import type { JudgmentClient } from '@human-machine-judgment/sdk';
import type { EventFilters } from '@human-machine-judgment/core';
import { NotFoundError } from '@human-machine-judgment/core';

export async function eventRoutes(app: FastifyInstance, client: JudgmentClient): Promise<void> {
  // List events for a specific judgment point
  app.get<{
    Params: { projectId: string; id: string };
    Querystring: Record<string, string | undefined>;
  }>('/api/v1/projects/:projectId/judgment-points/:id/events', async (request) => {
    const { projectId, id } = request.params;
    const query = request.query;

    // Verify the judgment point belongs to this project
    const point = await client.getJudgmentPoint(id);
    if (point == null || point.projectId !== projectId) {
      throw new NotFoundError(`Judgment point '${id}' not found`);
    }

    const filters: EventFilters = {
      eventType: query['eventType'] ? (query['eventType'].split(',') as never[]) : undefined,
      actorId: query['actorId'],
      after: query['after'],
      before: query['before'],
    };

    return client.getEvents(id, filters);
  });
}
