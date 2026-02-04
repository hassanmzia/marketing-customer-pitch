import { Router, Request, Response, NextFunction } from 'express';
import axios, { AxiosInstance } from 'axios';
import config from '../config.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Create a dedicated axios instance for MCP server communication
const mcpClient: AxiosInstance = axios.create({
  baseURL: config.mcpServerUrl,
  timeout: config.timeouts.aiOperations,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

mcpClient.interceptors.request.use((reqConfig) => {
  console.log(`[MCP Proxy] ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`);
  return reqConfig;
});

mcpClient.interceptors.response.use(
  (response) => {
    console.log(`[MCP Proxy] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      console.error(`[MCP Proxy] Error ${error.response?.status || 'NETWORK'}: ${error.message}`);
    }
    return Promise.reject(error);
  },
);

// POST /api/v1/mcp/tools - List available MCP tools
router.post('/tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await mcpClient.post('/tools/list', req.body || {});
    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      next(new AppError('MCP server is unavailable', 503, 'MCP_UNAVAILABLE'));
      return;
    }
    next(error);
  }
});

// POST /api/v1/mcp/execute - Execute an MCP tool by name with parameters
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolName, parameters } = req.body as {
      toolName: string;
      parameters?: Record<string, unknown>;
    };

    if (!toolName) {
      next(new AppError('toolName is required', 400, 'VALIDATION_ERROR'));
      return;
    }

    console.log(`[MCP] Executing tool: ${toolName}`, { parameters });

    const response = await mcpClient.post('/tools/call', {
      name: toolName,
      arguments: parameters || {},
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      next(new AppError('MCP server is unavailable', 503, 'MCP_UNAVAILABLE'));
      return;
    }
    next(error);
  }
});

export default router;
