import { Router, Request, Response, NextFunction } from 'express';
import backendProxy from '../services/backendProxy.js';
import wsService from '../services/websocket.js';

const router = Router();

// GET /api/v1/pitches - List pitches
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/pitches/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/pitches/:id - Pitch detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/pitches/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/pitches - Create pitch
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post('/api/v1/pitches/', req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/pitches/:id - Update pitch
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.put(`/api/v1/pitches/${req.params.id}/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/pitches/:id - Delete pitch
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.delete(`/api/v1/pitches/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/pitches/generate - Trigger pitch generation via AI agents
router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerId, parameters } = req.body as {
      customerId: string;
      parameters?: Record<string, unknown>;
    };

    // Notify WebSocket clients that generation has started
    wsService.broadcastPitchProgress(customerId, {
      step: 'initiated',
      percentage: 0,
      message: 'Pitch generation initiated',
    });

    // Use AI timeout for this long-running operation
    const result = await backendProxy.postAI('/api/v1/pitches/generate/', {
      customer_id: customerId,
      parameters,
    });

    const responseData = result.data as Record<string, unknown>;

    // Notify WebSocket clients that generation is complete
    wsService.broadcastPitchProgress(customerId, {
      step: 'completed',
      percentage: 100,
      message: 'Pitch generation completed',
    });

    res.status(result.status).json(responseData);
  } catch (error) {
    // Notify of failure via WebSocket
    const customerId = (req.body as Record<string, string>)?.customerId;
    if (customerId) {
      wsService.broadcastPitchProgress(customerId, {
        step: 'failed',
        percentage: 0,
        message: 'Pitch generation failed',
      });
    }
    next(error);
  }
});

// POST /api/v1/pitches/:id/score - Score a pitch
router.post('/:id/score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.postAI(`/api/v1/pitches/${req.params.id}/score/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/pitches/:id/refine - Refine a pitch
router.post('/:id/refine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pitchId = req.params.id as string;

    wsService.broadcastPitchProgress(pitchId, {
      step: 'refining',
      percentage: 10,
      message: 'Pitch refinement started',
    });

    const result = await backendProxy.postAI(`/api/v1/pitches/${pitchId}/refine/`, req.body);

    wsService.broadcastPitchProgress(pitchId, {
      step: 'refined',
      percentage: 100,
      message: 'Pitch refinement completed',
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/pitches/:id/history - Pitch version history
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/pitches/${req.params.id}/history/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/pitches/compare - Compare multiple pitches
router.post('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post('/api/v1/pitches/compare/', req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/pitches/:id/export - Export pitch
router.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(
      `/api/v1/pitches/${req.params.id}/export/`,
      req.query as Record<string, unknown>,
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
