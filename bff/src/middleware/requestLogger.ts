import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const startTime = Date.now();

  req.requestId = requestId;
  req.startTime = startTime;

  // Set request ID on response header for tracing
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  console.log(JSON.stringify({
    type: 'request',
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length'],
    timestamp: new Date().toISOString(),
  }));

  // Log response on finish
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: Parameters<Response['end']>): Response {
    const duration = Date.now() - startTime;

    console.log(JSON.stringify({
      type: 'response',
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      timestamp: new Date().toISOString(),
    }));

    return originalEnd.apply(this, args);
  } as typeof res.end;

  next();
}
