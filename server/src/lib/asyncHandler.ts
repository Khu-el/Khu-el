import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not look at the promise an async handler returns. A handler
 * that throws or rejects after its first `await` never reaches the error
 * middleware -- the rejection is unhandled, and Node 15+ exits the process on
 * an unhandled rejection. One request with a malformed memo body, or one SMTP
 * failure, took the whole backend down for every user.
 *
 * Wrap every async route handler in this, so a failure becomes a 500 for the
 * one request that caused it instead of an outage for everyone.
 */
export function asyncHandler<R extends Request = Request>(
  fn: (req: R, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req as R, res, next).catch(next);
  };
}
