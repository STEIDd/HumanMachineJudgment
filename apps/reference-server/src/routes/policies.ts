import type { FastifyInstance } from 'fastify';
import type { JudgmentClient } from '@human-machine-judgment/sdk';
import type { JudgmentPolicy } from '@human-machine-judgment/core';
import { NotFoundError } from '@human-machine-judgment/core';

export async function policyRoutes(app: FastifyInstance, client: JudgmentClient): Promise<void> {
  // Create a policy
  app.post<{
    Params: { projectId: string };
    Body: JudgmentPolicy;
  }>('/api/v1/projects/:projectId/policies', async (request, reply) => {
    const { projectId } = request.params;
    const policy = { ...request.body, projectId };
    await client.addPolicy(policy);
    void reply.status(201);
    return policy;
  });

  // List policies for a project
  app.get<{
    Params: { projectId: string };
  }>('/api/v1/projects/:projectId/policies', async (request) => {
    const { projectId } = request.params;
    return client.getPolicies(projectId);
  });

  // Get a single policy
  app.get<{
    Params: { projectId: string; id: string };
  }>('/api/v1/projects/:projectId/policies/:id', async (request) => {
    const { id, projectId } = request.params;
    const policies = await client.getPolicies(projectId);
    const policy = policies.find((p) => p.id === id);
    if (policy == null) {
      throw new NotFoundError(`Policy '${id}' not found`);
    }
    return policy;
  });

  // Update a policy (full replace)
  app.put<{
    Params: { projectId: string; id: string };
    Body: JudgmentPolicy;
  }>('/api/v1/projects/:projectId/policies/:id', async (request) => {
    const { projectId, id } = request.params;
    const policies = await client.getPolicies(projectId);
    const existing = policies.find((p) => p.id === id);
    if (existing == null) {
      throw new NotFoundError(`Policy '${id}' not found`);
    }
    const policy = { ...request.body, id, projectId };
    await client.updatePolicy(policy);
    return policy;
  });

  // Partial update (enable/disable)
  app.patch<{
    Params: { projectId: string; id: string };
    Body: Partial<JudgmentPolicy>;
  }>('/api/v1/projects/:projectId/policies/:id', async (request) => {
    const { id, projectId } = request.params;
    const policies = await client.getPolicies(projectId);
    const existing = policies.find((p) => p.id === id);
    if (existing == null) {
      throw new NotFoundError(`Policy '${id}' not found`);
    }
    const updated = { ...existing, ...request.body, id, projectId };
    await client.updatePolicy(updated);
    return updated;
  });
}
