import { Router, Request, Response, NextFunction } from 'express';
import backendProxy from '../services/backendProxy.js';

const router = Router();

// GET /api/v1/customers - List customers with search and filter
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/customers/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/customers/search - Search customers
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get('/api/v1/customers/search/', req.query as Record<string, unknown>);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/customers/:id - Customer detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/customers/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/customers/:id/customer-360 - Customer 360 view
router.get('/:id/customer-360', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.get(`/api/v1/customers/${req.params.id}/customer-360/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/customers - Create customer
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post('/api/v1/customers/', req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/customers/import - Bulk import customers
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.post('/api/v1/customers/import/', req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/customers/:id - Update customer
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.put(`/api/v1/customers/${req.params.id}/`, req.body);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/customers/:id - Delete customer
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await backendProxy.delete(`/api/v1/customers/${req.params.id}/`);
    res.status(result.status).json(result.data);
  } catch (error) {
    next(error);
  }
});

export default router;
