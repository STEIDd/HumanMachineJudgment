/**
 * @human-machine-judgment/reference-server
 *
 * Reference HTTP API server for Judgment Points.
 * Provides endpoints for creating, querying, resolving,
 * and managing Judgment Points in technical workflows.
 */

import Fastify from 'fastify';

const server = Fastify({ logger: true });

server.get('/health', async () => {
  return { status: 'ok', version: '0.1.0' };
});

const start = async () => {
  const port = parseInt(process.env['PORT'] ?? '3100', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';
  await server.listen({ port, host });
};

start().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
