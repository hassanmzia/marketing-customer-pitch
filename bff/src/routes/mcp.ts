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

// Static tool definitions matching the MCP server's registered tools.
// Used as a fallback when the MCP server is unavailable.
const STATIC_TOOLS = [
  { name: 'research_customer', description: 'Look up customer profile from the database.', parameters: { name: { type: 'string', description: 'Customer or company name' } } },
  { name: 'initial_pitch_prompt', description: 'Generate a structured pitch prompt incorporating customer info and tone.', parameters: { customer_name: { type: 'string' }, customer_info: { type: 'string' }, tone: { type: 'string', default: 'professional' } } },
  { name: 'score_pitch', description: 'Score a sales pitch on persuasiveness, clarity, and relevance.', parameters: { pitch: { type: 'string' } } },
  { name: 'refine_pitch', description: 'Rewrite a sales pitch incorporating specific feedback.', parameters: { pitch: { type: 'string' }, feedback: { type: 'string' } } },
  { name: 'analyze_customer_sentiment', description: 'Analyze customer interaction history to determine sentiment and engagement.', parameters: { customer_name: { type: 'string' }, interaction_history: { type: 'string' } } },
  { name: 'generate_subject_line', description: 'Generate compelling email subject lines for a sales pitch.', parameters: { pitch: { type: 'string' }, style: { type: 'string', default: 'professional' } } },
  { name: 'competitive_positioning', description: 'Generate a competitive positioning analysis for the customer\'s industry.', parameters: { customer_name: { type: 'string' }, industry: { type: 'string' } } },
  { name: 'pitch_ab_variants', description: 'Generate A/B test variants of a sales pitch.', parameters: { pitch: { type: 'string' }, num_variants: { type: 'number', default: 2 } } },
  { name: 'calculate_lead_score', description: 'Calculate a lead score (0-100) based on customer data.', parameters: { customer_data: { type: 'string' } } },
  { name: 'generate_followup_sequence', description: 'Generate a follow-up email sequence after an initial sales pitch.', parameters: { pitch: { type: 'string' }, customer_name: { type: 'string' }, num_emails: { type: 'number', default: 3 } } },
];

// GET /api/v1/mcp/tools - List available MCP tools
router.get('/tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try MCP server via JSON-RPC
    const response = await mcpClient.post('/', {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: '1',
    });
    const tools = response.data?.result?.tools ?? response.data?.tools ?? STATIC_TOOLS;
    res.json(tools);
  } catch (error) {
    // Fallback to static tool list so the page isn't empty
    console.warn('[MCP] Server unavailable, returning static tool list');
    res.json(STATIC_TOOLS);
  }
});

// POST /api/v1/mcp/tools - Also support POST for listing tools
router.post('/tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await mcpClient.post('/', {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: '1',
    });
    const tools = response.data?.result?.tools ?? response.data?.tools ?? STATIC_TOOLS;
    res.json(tools);
  } catch (error) {
    console.warn('[MCP] Server unavailable, returning static tool list');
    res.json(STATIC_TOOLS);
  }
});

// POST /api/v1/mcp/tools/execute - Execute an MCP tool
router.post('/tools/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Frontend sends { tool_name, arguments }
    const { tool_name, arguments: args } = req.body as {
      tool_name: string;
      arguments?: Record<string, unknown>;
    };

    if (!tool_name) {
      next(new AppError('tool_name is required', 400, 'VALIDATION_ERROR'));
      return;
    }

    console.log(`[MCP] Executing tool: ${tool_name}`, { arguments: args });

    const response = await mcpClient.post('/', {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: tool_name,
        arguments: args || {},
      },
      id: '2',
    });

    const result = response.data?.result ?? response.data;
    res.json({ result });
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      next(new AppError('MCP server is unavailable', 503, 'MCP_UNAVAILABLE'));
      return;
    }
    next(error);
  }
});

// POST /api/v1/mcp/execute - Legacy route (also maps to execute)
router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolName, tool_name, parameters, arguments: args } = req.body as {
      toolName?: string;
      tool_name?: string;
      parameters?: Record<string, unknown>;
      arguments?: Record<string, unknown>;
    };

    const name = toolName || tool_name;
    if (!name) {
      next(new AppError('toolName or tool_name is required', 400, 'VALIDATION_ERROR'));
      return;
    }

    console.log(`[MCP] Executing tool: ${name}`, { arguments: parameters || args });

    const response = await mcpClient.post('/', {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: parameters || args || {},
      },
      id: '2',
    });

    const result = response.data?.result ?? response.data;
    res.json({ result });
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
      next(new AppError('MCP server is unavailable', 503, 'MCP_UNAVAILABLE'));
      return;
    }
    next(error);
  }
});

export default router;
