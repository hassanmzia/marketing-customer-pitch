import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import config from '../config.js';
import backendProxy from '../services/backendProxy.js';
import wsService from '../services/websocket.js';

const router = Router();

// GET /api/v1/agents/configs - List agent configurations
router.get('/configs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/agents/configs/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/configs/:id - Get agent configuration detail
router.get('/configs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/agents/configs/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/agents/configs/:id - Update agent configuration
router.patch('/configs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.patch(`/api/v1/agents/configs/${req.params.id}/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/executions - List agent executions
router.get('/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/agents/executions/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/executions/:id - Get execution detail (for polling)
router.get('/executions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/agents/executions/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/agents/orchestrate - Trigger full multi-agent pipeline
router.post('/orchestrate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerId = (req.body as Record<string, string>)?.customer_id;

    // Notify WebSocket clients of orchestration start
    if (customerId) {
      wsService.broadcastAgentStatus(customerId, {
        agentName: 'orchestrator',
        state: 'started',
        message: 'Multi-agent pipeline orchestration initiated',
      });
    }

    // Forward the full request body to backend with extended timeout.
    // Orchestration runs multiple sequential LLM calls (research, generate,
    // score, refine) so 120 s is not enough – use 5 minutes.
    const result = await axios.post(
      `${config.backendUrl}/api/v1/agents/orchestrate/`,
      req.body,
      { timeout: 300_000, headers: { 'Content-Type': 'application/json' } },
    );

    const responseData = result.data as Record<string, unknown>;

    if (customerId) {
      wsService.broadcastAgentStatus(customerId, {
        agentName: 'orchestrator',
        state: 'completed',
        message: 'Multi-agent pipeline orchestration completed',
        result: responseData,
      });
    }

    res.status(result.status).json(responseData);
  } catch (error) {
    const customerId = (req.body as Record<string, string>)?.customer_id;
    if (customerId) {
      wsService.broadcastAgentStatus(customerId, {
        agentName: 'orchestrator',
        state: 'failed',
        message: 'Multi-agent pipeline orchestration failed',
      });
    }
    next(error);
  }
});

// GET /api/v1/agents/a2a-messages - View A2A messages
router.get('/a2a-messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/agents/messages/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/a2a-messages/:correlationId - View message chain by correlation ID
router.get('/a2a-messages/:correlationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/agents/messages/${req.params.correlationId}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
