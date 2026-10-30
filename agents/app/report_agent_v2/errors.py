"""Error types mapped to the v6api error shape: {"error": "..."} with a matching status code."""

from __future__ import annotations


class AppError(Exception):
    status_code = 500
    public_message = "An unexpected error occurred."

    def __init__(self, message: str | None = None, *, extra: dict | None = None) -> None:
        super().__init__(message or self.public_message)
        self.message = message or self.public_message
        self.extra = extra or {}


class BadRequestError(AppError):
    status_code = 400
    public_message = "Invalid request."


class UnauthorizedError(AppError):
    status_code = 401
    public_message = "Missing or invalid access token."


class ForbiddenError(AppError):
    status_code = 403
    public_message = "You do not have access to this resource."


class NotFoundError(AppError):
    status_code = 404
    public_message = "Not found."


class ConflictError(AppError):
    status_code = 409
    public_message = "Conflict."


class UnprocessableError(AppError):
    """The request was understood but could not be turned into a valid report."""

    status_code = 422
    public_message = "The report could not be generated."


class UpstreamError(AppError):
    status_code = 502
    public_message = "The report agent is temporarily unavailable."
