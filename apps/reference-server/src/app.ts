import Fastify, { type FastifyInstance } from 'fastify';
import type { JudgmentStorage } from '@human-machine-judgment/core';
import { JudgmentClient } from '@human-machine-judgment/sdk';
import { errorHandler } from './error-handler.js';
import { healthRoutes } from './routes/health.js';
import { judgmentPointRoutes } from './routes/judgment-points.js';
import { policyRoutes } from './routes/policies.js';
import { eventRoutes } from './routes/events.js';

export interface AppOptions {
  readonly storage: JudgmentStorage;
  readonly logger?: boolean;
}

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const client = new JudgmentClient(options.storage);

  app.setErrorHandler(errorHandler);

  await healthRoutes(app);
  await judgmentPointRoutes(app, client);
  await policyRoutes(app, client);
  await eventRoutes(app, client);

  return app;
}
