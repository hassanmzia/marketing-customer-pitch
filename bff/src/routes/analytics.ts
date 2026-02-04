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

// GET /api/v1/analytics/pitches - Pitch analytics
router.get('/pitches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/pitch-analytics/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/agents - Agent performance comparison
router.get('/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/agent-performance/agent-comparison/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/trends - Performance trends
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/analytics/agent-performance/trends/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/analytics/agent-performance - Agent performance metrics (list)
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
    const result = await backendProxy.get('/api/v1/analytics/agent-performance/roi-report/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
