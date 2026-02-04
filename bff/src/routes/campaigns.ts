import { Router, Request, Response, NextFunction } from 'express';
import backendProxy from '../services/backendProxy.js';
import wsService from '../services/websocket.js';

const router = Router();

// GET /api/v1/campaigns - List campaigns
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/campaigns/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/campaigns/:id - Campaign detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/campaigns/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/campaigns - Create campaign
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post('/api/v1/campaigns/', req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/campaigns/:id - Update campaign
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.put(`/api/v1/campaigns/${req.params.id}/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/campaigns/:id - Delete campaign
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.delete(`/api/v1/campaigns/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/campaigns/:id/targets - List campaign targets
router.get('/:id/targets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(
      `/api/v1/campaigns/${req.params.id}/targets/`,
      req.query as Record<string, unknown>,
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/campaigns/:id/targets - Add targets to campaign
router.post('/:id/targets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post(`/api/v1/campaigns/${req.params.id}/add-targets/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/campaigns/:id/targets/:targetId - Remove target
router.delete('/:id/targets/:targetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.delete(`/api/v1/campaigns/${req.params.id}/targets/${req.params.targetId}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/campaigns/:id/launch - Launch a campaign
router.post('/:id/launch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.id as string;
    const result = await backendProxy.post(`/api/v1/campaigns/${campaignId}/launch/`, req.body);

    wsService.broadcastCampaignUpdate(campaignId, {
      action: 'launch',
      status: 'launched',
      message: `Campaign ${campaignId} has been launched`,
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/campaigns/:id/pause - Pause a campaign
router.post('/:id/pause', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = req.params.id as string;
    const result = await backendProxy.post(`/api/v1/campaigns/${campaignId}/pause/`, req.body);

    wsService.broadcastCampaignUpdate(campaignId, {
      action: 'pause',
      status: 'paused',
      message: `Campaign ${campaignId} has been paused`,
    });

    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/campaigns/:id/metrics - Campaign metrics
router.get('/:id/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(
      `/api/v1/campaigns/${req.params.id}/metrics/`,
      req.query as Record<string, unknown>,
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
