import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
  code?: string;
  timestamp: string;
  path: string;
}

export class AppError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl || req.url;

  // Handle Axios errors from backend proxy calls
  if ((err as AxiosError).isAxiosError) {
    const axiosErr = err as AxiosError;
    const status = axiosErr.response?.status || 502;
    const backendData = axiosErr.response?.data as Record<string, unknown> | undefined;

    console.error(`[${timestamp}] Backend proxy error: ${axiosErr.message}`, {
      status,
      url: axiosErr.config?.url,
      method: axiosErr.config?.method,
    });

    const errorResponse: ApiError = {
      status,
      message: (backendData?.detail as string) || (backendData?.message as string) || 'Backend service error',
      details: backendData?.errors || backendData,
      code: 'BACKEND_ERROR',
      timestamp,
      path,
    };

    res.status(status).json(errorResponse);
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    console.error(`[${timestamp}] Application error: ${err.message}`, {
      status: err.status,
      code: err.code,
    });

    const errorResponse: ApiError = {
      status: err.status,
      message: err.message,
      details: err.details,
      code: err.code,
      timestamp,
      path,
    };

    res.status(err.status).json(errorResponse);
    return;
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError') {
    console.error(`[${timestamp}] Validation error: ${err.message}`);

    const errorResponse: ApiError = {
      status: 400,
      message: 'Validation failed',
      details: err.message,
      code: 'VALIDATION_ERROR',
      timestamp,
      path,
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle unexpected errors
  console.error(`[${timestamp}] Unhandled error:`, err);

  const errorResponse: ApiError = {
    status: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    timestamp,
    path,
  };

  res.status(500).json(errorResponse);
}
