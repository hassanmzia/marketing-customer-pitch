import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import config from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { wsService } from './services/websocket.js';

import customersRouter from './routes/customers.js';
import pitchesRouter from './routes/pitches.js';
import campaignsRouter from './routes/campaigns.js';
import agentsRouter from './routes/agents.js';
import analyticsRouter from './routes/analytics.js';
import mcpRouter from './routes/mcp.js';

const app = express();
const server = createServer(app);

// ---------------------
// Middleware
// ---------------------

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origins,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging (morgan)
app.use(morgan(config.logLevel));

// Custom request/response logger
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use(limiter);

// ---------------------
// Health check
// ---------------------
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'marketing-pitch-bff',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    wsClients: wsService.getClientCount(),
  });
});

// ---------------------
// API Routes
// ---------------------
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/pitches', pitchesRouter);
app.use('/api/v1/campaigns', campaignsRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/mcp', mcpRouter);

// ---------------------
// 404 handler
// ---------------------
app.use((_req, res) => {
  res.status(404).json({
    status: 404,
    message: 'Route not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------
// Error handler
// ---------------------
app.use(errorHandler);

// ---------------------
// WebSocket
// ---------------------
wsService.initialize(server);

// ---------------------
// Start server
// ---------------------
server.listen(config.port, () => {
  console.log(`[BFF] Marketing Pitch Assistant BFF running on port ${config.port}`);
  console.log(`[BFF] Backend URL: ${config.backendUrl}`);
  console.log(`[BFF] MCP Server URL: ${config.mcpServerUrl}`);
  console.log(`[BFF] CORS origins: ${config.cors.origins.join(', ')}`);
  console.log(`[BFF] Rate limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 1000}s`);
  console.log(`[BFF] WebSocket available at ws://localhost:${config.port}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[BFF] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[BFF] Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[BFF] SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('[BFF] Server closed.');
    process.exit(0);
  });
});

export default app;
