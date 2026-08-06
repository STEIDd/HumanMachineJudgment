import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  DuplicateError,
  GuardError,
  InvalidTransitionError,
  JudgmentError,
  NotFoundError,
  PolicyViolationError,
  UnauthorizedResolutionError,
  ValidationError,
  generateId,
} from '@human-machine-judgment/core';

export interface ErrorResponse {
  readonly error: string;
  readonly message: string;
  readonly details?: readonly string[];
  readonly correlationId: string;
}

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  const correlationId = generateId();

  if (error instanceof InvalidTransitionError) {
    void reply.status(409).send({
      error: 'INVALID_TRANSITION',
      message: error.message,
      details: [`from: ${error.from}`, `to: ${error.to}`],
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof NotFoundError) {
    void reply.status(404).send({
      error: 'NOT_FOUND',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof ValidationError) {
    void reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.fields,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof UnauthorizedResolutionError) {
    void reply.status(403).send({
      error: 'UNAUTHORIZED',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof GuardError) {
    void reply.status(422).send({
      error: 'GUARD_FAILED',
      message: error.message,
      details: error.reasons,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof PolicyViolationError) {
    void reply.status(422).send({
      error: 'POLICY_VIOLATION',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof DuplicateError) {
    void reply.status(409).send({
      error: 'DUPLICATE',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  if (error instanceof JudgmentError) {
    void reply.status(422).send({
      error: 'JUDGMENT_ERROR',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    void reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: error.message,
      correlationId,
    } satisfies ErrorResponse);
    return;
  }

  // Unknown error
  void reply.status(500).send({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    correlationId,
  } satisfies ErrorResponse);
}
