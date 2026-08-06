/**
 * @human-machine-judgment/storage-memory
 *
 * In-memory storage adapter for Judgment Points. Suitable for tests
 * and deterministic demonstrations. Provides a lightweight, zero-dependency
 * implementation of the storage interface that holds all data in memory.
 */

export const VERSION = '0.1.0';

export { MemoryStorage } from './memory-storage.js';
