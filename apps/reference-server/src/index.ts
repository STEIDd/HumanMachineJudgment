/**
 * @human-machine-judgment/reference-server
 *
 * Reference HTTP API server for Judgment Points.
 * Provides endpoints for creating, querying, resolving,
 * and managing Judgment Points in technical workflows.
 */

import { MemoryStorage } from '@human-machine-judgment/storage-memory';
import { createApp } from './app.js';

const start = async () => {
  const port = parseInt(process.env['PORT'] ?? '3100', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  const storage = new MemoryStorage();
  const app = await createApp({ storage, logger: true });

  await app.listen({ port, host });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
