import { randomUUID } from 'node:crypto';

/**
 * Generate a unique identifier for domain entities.
 * Uses crypto.randomUUID for RFC 4122 v4 UUIDs.
 */
export function generateId(): string {
  return randomUUID();
}
