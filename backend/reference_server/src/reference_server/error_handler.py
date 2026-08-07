"""Map domain exceptions to HTTP error responses."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from judgment_core.errors import (
    DuplicateError,
    GuardError,
    InvalidTransitionError,
    JudgmentError,
    NotFoundError,
    PolicyViolationError,
    UnauthorizedResolutionError,
    ValidationError,
)


def register_error_handlers(app: FastAPI) -> None:
    """Register exception handlers that translate domain errors to HTTP responses."""

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(ValidationError)
    async def validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": str(exc), "fields": exc.fields},
        )

    @app.exception_handler(InvalidTransitionError)
    async def invalid_transition_handler(
        request: Request, exc: InvalidTransitionError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "error": str(exc),
                "fromStatus": exc.from_status,
                "toStatus": exc.to_status,
            },
        )

    @app.exception_handler(UnauthorizedResolutionError)
    async def unauthorized_resolution_handler(
        request: Request, exc: UnauthorizedResolutionError
    ) -> JSONResponse:
        return JSONResponse(status_code=403, content={"error": str(exc)})

    @app.exception_handler(GuardError)
    async def guard_handler(request: Request, exc: GuardError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"error": str(exc), "reasons": exc.reasons},
        )

    @app.exception_handler(PolicyViolationError)
    async def policy_violation_handler(request: Request, exc: PolicyViolationError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"error": str(exc)})

    @app.exception_handler(DuplicateError)
    async def duplicate_handler(request: Request, exc: DuplicateError) -> JSONResponse:
        return JSONResponse(status_code=409, content={"error": str(exc)})

    @app.exception_handler(JudgmentError)
    async def judgment_error_handler(request: Request, exc: JudgmentError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(exc)})
