import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  Customer,
  Customer360,
  CustomerInteraction,
  Pitch,
  PitchTemplate,
  PitchScore,
  PitchGenerateRequest,
  PitchCompareResult,
  Campaign,
  CampaignTarget,
  CampaignMetrics,
  AgentConfig,
  AgentExecution,
  A2AMessage,
  OrchestrationRequest,
  DashboardData,
  PitchAnalytics,
  AgentPerformance,
  ROIMetrics,
  MCPTool,
  MCPToolExecution,
  PaginatedResponse,
  ApiError,
} from '@/types';

// ─── Axios Instance ──────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      const apiError: ApiError = error.response.data || {
        detail: 'An unexpected error occurred',
      };
      return Promise.reject(apiError);
    }
    if (error.request) {
      return Promise.reject({
        detail: 'Network error. Please check your connection.',
      } as ApiError);
    }
    return Promise.reject({
      detail: error.message || 'An unexpected error occurred',
    } as ApiError);
  }
);

// ─── Customer API ────────────────────────────────────────────────────────────

export const customerApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<Customer>>('/customers/', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Customer>(`/customers/${id}/`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    api.post<Customer>('/customers/', data).then((r) => r.data),

  update: (id: string, data: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/customers/${id}/`).then((r) => r.data),

  search: (query: string) =>
    api.get<PaginatedResponse<Customer>>('/customers/', { params: { search: query } }).then((r) => r.data),

  get360: (id: string) =>
    api.get<Customer360>(`/customers/${id}/360-view/`).then((r) => r.data),

  bulkImport: (data: Partial<Customer>[]) =>
    api.post<{ imported: number; errors: string[] }>('/customers/bulk-import/', { customers: data }).then((r) => r.data),

  getInteractions: (customerId: string) =>
    api.get<PaginatedResponse<CustomerInteraction>>(`/customers/${customerId}/interactions/`).then((r) => r.data),

  addInteraction: (customerId: string, data: Partial<CustomerInteraction>) =>
    api.post<CustomerInteraction>(`/customers/${customerId}/interactions/`, data).then((r) => r.data),
};

// ─── Pitch API ───────────────────────────────────────────────────────────────

export const pitchApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<Pitch>>('/pitches/', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Pitch>(`/pitches/${id}/`).then((r) => r.data),

  create: (data: Partial<Pitch>) =>
    api.post<Pitch>('/pitches/', data).then((r) => r.data),

  update: (id: string, data: Partial<Pitch>) =>
    api.patch<Pitch>(`/pitches/${id}/`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/pitches/${id}/`).then((r) => r.data),

  generate: (data: PitchGenerateRequest) =>
    api.post<Pitch>('/pitches/generate/', data).then((r) => r.data),

  score: (id: string) =>
    api.post<PitchScore>(`/pitches/${id}/score/`).then((r) => r.data),

  refine: (id: string, feedback: string) =>
    api.post<Pitch>(`/pitches/${id}/refine/`, { feedback }).then((r) => r.data),

  history: (id: string) =>
    api.get<Pitch[]>(`/pitches/${id}/history/`).then((r) => r.data),

  compare: (ids: string[]) =>
    api.post<PitchCompareResult>('/pitches/compare/', { pitch_ids: ids }).then((r) => r.data),

  export: (id: string, format: 'pdf' | 'docx' | 'html') =>
    api.get(`/pitches/${id}/export/`, {
      params: { format },
      responseType: 'blob',
    }).then((r) => r.data),

  getTemplates: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<PitchTemplate>>('/pitches/templates/', { params }).then((r) => r.data),

  getTemplate: (id: string) =>
    api.get<PitchTemplate>(`/pitches/templates/${id}/`).then((r) => r.data),

  createTemplate: (data: Partial<PitchTemplate>) =>
    api.post<PitchTemplate>('/pitches/templates/', data).then((r) => r.data),
};

// ─── Campaign API ────────────────────────────────────────────────────────────

export const campaignApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<Campaign>>('/campaigns/', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Campaign>(`/campaigns/${id}/`).then((r) => r.data),

  create: (data: Partial<Campaign>) =>
    api.post<Campaign>('/campaigns/', data).then((r) => r.data),

  update: (id: string, data: Partial<Campaign>) =>
    api.patch<Campaign>(`/campaigns/${id}/`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/campaigns/${id}/`).then((r) => r.data),

  launch: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/launch/`).then((r) => r.data),

  pause: (id: string) =>
    api.post<Campaign>(`/campaigns/${id}/pause/`).then((r) => r.data),

  metrics: (id: string) =>
    api.get<CampaignMetrics>(`/campaigns/${id}/metrics/`).then((r) => r.data),

  getTargets: (id: string, params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<CampaignTarget>>(`/campaigns/${id}/targets/`, { params }).then((r) => r.data),

  addTargets: (id: string, customerIds: string[]) =>
    api.post<CampaignTarget[]>(`/campaigns/${id}/targets/`, { customer_ids: customerIds }).then((r) => r.data),

  removeTarget: (campaignId: string, targetId: string) =>
    api.delete(`/campaigns/${campaignId}/targets/${targetId}/`).then((r) => r.data),

  updateTargetStatus: (targetId: string, status: string) =>
    api.post<CampaignTarget>(`/campaigns/targets/${targetId}/update-status/`, { status }).then((r) => r.data),
};

// ─── Agent API ───────────────────────────────────────────────────────────────

export const agentApi = {
  getConfigs: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<AgentConfig>>('/agents/configs/', { params }).then((r) => r.data),

  getConfig: (id: string) =>
    api.get<AgentConfig>(`/agents/configs/${id}/`).then((r) => r.data),

  updateConfig: (id: string, data: Partial<AgentConfig>) =>
    api.patch<AgentConfig>(`/agents/configs/${id}/`, data).then((r) => r.data),

  getExecutions: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<AgentExecution>>('/agents/executions/', { params }).then((r) => r.data),

  listExecutions: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<AgentExecution>>('/agents/executions/', { params }).then((r) => r.data),

  getExecution: (id: string) =>
    api.get<AgentExecution>(`/agents/executions/${id}/`).then((r) => r.data),

  orchestrate: (data: OrchestrationRequest) =>
    api.post<AgentExecution>('/agents/orchestrate/', data).then((r) => r.data),

  getA2AMessages: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<A2AMessage>>('/agents/a2a-messages/', { params }).then((r) => r.data),
};

// ─── Analytics API ───────────────────────────────────────────────────────────

export const analyticsApi = {
  dashboard: () =>
    api.get<DashboardData>('/analytics/dashboard/').then((r) => r.data),

  pitchAnalytics: (params?: Record<string, string>) =>
    api.get<PitchAnalytics>('/analytics/pitches/', { params }).then((r) => r.data),

  trends: (params?: Record<string, string>) =>
    api.get('/analytics/trends/', { params }).then((r) => r.data),

  agentPerformance: () =>
    api.get<AgentPerformance[]>('/analytics/agents/').then((r) => r.data),

  roi: (params?: Record<string, string>) =>
    api.get<ROIMetrics>('/analytics/roi/', { params }).then((r) => r.data),
};

// ─── MCP API ─────────────────────────────────────────────────────────────────

export const mcpApi = {
  listTools: () =>
    api.get<MCPTool[]>('/mcp/tools/').then((r) => r.data),

  executeTool: (data: { tool_name: string; arguments: Record<string, unknown> }) =>
    api.post<MCPToolExecution>('/mcp/tools/execute/', data).then((r) => r.data),
};

export default api;
