import { Router, Request, Response, NextFunction } from 'express';
import backendProxy from '../services/backendProxy.js';

const router = Router();

// GET /api/v1/analytics/dashboard - Dashboard metrics
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/dashboard/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/trends - Trends data
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/trends/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/agent-performance - Agent performance metrics
router.get('/agent-performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/agent-performance/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/roi - ROI report
router.get('/roi', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/roi/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
