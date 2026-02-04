import { Router, Request, Response, NextFunction } from 'express';
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

// GET /api/v1/agents/executions - List agent executions
router.get('/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/agents/executions/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/agents/orchestrate - Trigger full multi-agent pipeline
router.post('/orchestrate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, pipelineConfig } = req.body as {
      customerId: string;
      pipelineConfig?: Record<string, unknown>;
    };

    // Notify WebSocket clients of orchestration start
    wsService.broadcastAgentStatus(customerId, {
      agentName: 'orchestrator',
      state: 'started',
      message: 'Multi-agent pipeline orchestration initiated',
    });

    // Use AI timeout for long-running orchestration
    const result = await backendProxy.postAI('/api/v1/agents/orchestrate/', {
      customer_id: customerId,
      pipeline_config: pipelineConfig,
    });

    const responseData = result.data as Record<string, unknown>;

    wsService.broadcastAgentStatus(customerId, {
      agentName: 'orchestrator',
      state: 'completed',
      message: 'Multi-agent pipeline orchestration completed',
      result: responseData,
    });

    res.status(result.status).json(responseData);
  } catch (error) {
    const customerId = (req.body as Record<string, string>)?.customerId;
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
    const result = await backendProxy.get('/api/v1/agents/a2a-messages/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/agents/a2a-messages/:correlationId - View message chain by correlation ID
router.get('/a2a-messages/:correlationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/agents/a2a-messages/${req.params.correlationId}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
