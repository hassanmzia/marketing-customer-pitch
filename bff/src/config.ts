import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  backendUrl: string;
  mcpServerUrl: string;
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  timeouts: {
    default: number;
    aiOperations: number;
  };
  logLevel: string;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '4064', 10),
  backendUrl: process.env.BACKEND_URL || 'http://backend:8064',
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://mcp-server:8165',
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://172.168.1.95:3064', 'http://localhost:3064'],
    credentials: true,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  timeouts: {
    default: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),        // 30 seconds
    aiOperations: parseInt(process.env.AI_TIMEOUT || '120000', 10),       // 120 seconds
  },
  logLevel: process.env.LOG_LEVEL || 'dev',
};

export default config;
