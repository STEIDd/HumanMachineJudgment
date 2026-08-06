import { describe, it, expect } from 'vitest';
import {
  createCreatedEvent,
  createPromotedEvent,
  createResolutionRecordedEvent,
  createDismissedEvent,
  createReopenedEvent,
  createMarkedStaleEvent,
  createAlternativeAddedEvent,
} from './events.js';
import type { Actor } from './types.js';

const actor: Actor = { id: 'user-1', type: 'user' };

describe('events', () => {
  describe('createCreatedEvent', () => {
    it('creates event with correct fields', () => {
      const event = createCreatedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        candidateData: { category: 'method' },
      });

      expect(event.eventType).toBe('created');
      expect(event.judgmentPointId).toBe('jp-1');
      expect(event.projectId).toBe('proj-1');
      expect(event.actorId).toBe('user-1');
      expect(event.actorType).toBe('user');
      expect(event.id).toBeTruthy();
      expect(event.timestamp).toBeTruthy();
      expect(event.payload).toEqual({ category: 'method' });
    });
  });

  describe('createPromotedEvent', () => {
    it('creates event with status metadata', () => {
      const event = createPromotedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        previousStatus: 'candidate',
        newStatus: 'pending',
      });

      expect(event.eventType).toBe('promoted');
      expect(event.metadata?.['previousStatus']).toBe('candidate');
      expect(event.metadata?.['newStatus']).toBe('pending');
    });
  });

  describe('createResolutionRecordedEvent', () => {
    it('creates event with resolution payload', () => {
      const event = createResolutionRecordedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        previousStatus: 'investigating',
        resolution: {
          selectedAlternativeId: 'alt-1',
          rationale: 'Best option',
          resolvedAt: '2026-01-01T00:00:00Z',
        },
      });

      expect(event.eventType).toBe('resolution-recorded');
      expect(event.payload?.['selectedAlternativeId']).toBe('alt-1');
    });
  });

  describe('createDismissedEvent', () => {
    it('creates event with reason', () => {
      const event = createDismissedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        previousStatus: 'pending',
        reason: 'Not relevant',
      });

      expect(event.eventType).toBe('dismissed');
      expect(event.payload?.['reason']).toBe('Not relevant');
    });
  });

  describe('createReopenedEvent', () => {
    it('creates event with reason', () => {
      const event = createReopenedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        previousStatus: 'resolved',
        reason: 'New data available',
      });

      expect(event.eventType).toBe('reopened');
      expect(event.payload?.['reason']).toBe('New data available');
    });
  });

  describe('createMarkedStaleEvent', () => {
    it('creates event with reason', () => {
      const event = createMarkedStaleEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        reason: 'Upstream dependency changed',
      });

      expect(event.eventType).toBe('marked-stale');
      expect(event.payload?.['reason']).toBe('Upstream dependency changed');
    });
  });

  describe('createAlternativeAddedEvent', () => {
    it('creates event with alternative payload', () => {
      const event = createAlternativeAddedEvent({
        judgmentPointId: 'jp-1',
        projectId: 'proj-1',
        actor,
        alternative: {
          id: 'alt-2',
          label: 'Option B',
          description: 'Second option',
        },
      });

      expect(event.eventType).toBe('alternative-added');
      expect(event.payload?.['id']).toBe('alt-2');
    });
  });

  it('generates unique IDs for each event', () => {
    const e1 = createCreatedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      candidateData: {},
    });
    const e2 = createCreatedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      candidateData: {},
    });
    expect(e1.id).not.toBe(e2.id);
  });
});
