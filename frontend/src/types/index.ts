// ─── Customer Types ──────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  company_name: string;
  industry: string;
  company_size: 'startup' | 'small' | 'medium' | 'enterprise';
  annual_revenue?: number | string;
  website?: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone?: string;
  primary_contact_title?: string;
  pain_points: string[] | string;
  current_solutions: string[];
  budget_range?: string;
  decision_timeline?: string;
  engagement_score: number;
  lifecycle_stage: 'lead' | 'prospect' | 'opportunity' | 'customer' | 'churned';
  tags: string[];
  notes?: string;
  needs?: string;
  last_interaction_date?: string;
  created_at: string;
  updated_at: string;
  // Alternate field names used by some API responses
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  location?: string;
  job_title?: string;
  status?: string;
  lead_score?: number;
  interaction_history?: unknown[];
  customer_360_data?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CustomerInteraction {
  id: string;
  customer: string;
  interaction_type: 'email' | 'call' | 'meeting' | 'demo' | 'proposal' | 'follow_up';
  subject: string;
  summary: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  follow_up_required: boolean;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
}

export interface Customer360 {
  customer: Customer;
  interactions: CustomerInteraction[];
  pitches: Pitch[];
  campaigns: Campaign[];
  engagement_timeline: Array<{
    date: string;
    score: number;
    event: string;
  }>;
  ai_insights: {
    summary: string;
    recommendations: string[];
    risk_factors: string[];
    next_best_action: string;
  };
}

// ─── Pitch Types ─────────────────────────────────────────────────────────────

export interface Pitch {
  id: string;
  customer: string;
  customer_name?: string;
  template?: string;
  template_name?: string;
  title: string;
  content: string;
  pitch_type: string;
  tone: string;
  status: string;
  version: number;
  scores?: PitchScore;
  personalization_data?: Record<string, unknown>;
  ai_model_used?: string;
  generation_time?: number;
  parent_pitch?: string;
  created_at: string;
  updated_at: string;
  // Alternate score fields used by some API responses
  overall_score?: number;
  persuasiveness_score?: number;
  clarity_score?: number;
  relevance_score?: number;
  [key: string]: unknown;
}

export interface PitchTemplate {
  id: string;
  name: string;
  description: string;
  pitch_type: Pitch['pitch_type'];
  tone: Pitch['tone'];
  template_content: string;
  variables: string[];
  industry_focus?: string;
  use_count: number;
  avg_score?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PitchScore {
  id?: string;
  pitch?: string;
  persuasiveness: number;
  clarity: number;
  relevance: number;
  personalization: number;
  call_to_action: number;
  overall_score: number;
  feedback: string;
  suggestions: string[];
  scored_at?: string;
}

export interface PitchGenerateRequest {
  customer_id: string;
  template_id?: string;
  pitch_type: Pitch['pitch_type'];
  tone: Pitch['tone'];
  key_points?: string[];
  additional_context?: string;
  max_length?: number;
}

export interface PitchCompareResult {
  pitches: Pitch[];
  comparison: {
    best_overall: string;
    score_comparison: Record<string, PitchScore>;
    recommendations: string;
  };
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description: string;
  campaign_type: 'email' | 'multi_channel' | 'social' | 'content' | 'event';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  budget?: number;
  target_audience?: string;
  goals: string[];
  tags: string[];
  targets_count: number;
  pitches_generated: number;
  pitches_sent: number;
  response_rate?: number;
  conversion_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignTarget {
  id: string;
  campaign: string;
  customer: string;
  customer_name?: string;
  pitch?: string;
  status: 'pending' | 'pitch_generated' | 'sent' | 'opened' | 'responded' | 'converted' | 'opted_out';
  sent_at?: string;
  opened_at?: string;
  responded_at?: string;
  notes?: string;
  created_at: string;
}

export interface CampaignMetrics {
  total_targets: number;
  pitches_generated: number;
  pitches_sent: number;
  opens: number;
  responses: number;
  conversions: number;
  open_rate: number;
  response_rate: number;
  conversion_rate: number;
  timeline: Array<{
    date: string;
    sent: number;
    opened: number;
    responded: number;
  }>;
}

// ─── Agent Types ─────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  agent_type: 'research' | 'writer' | 'reviewer' | 'strategist' | 'orchestrator';
  name: string;
  description: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  tools: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  agent: string;
  agent_name?: string;
  task_type: string;
  execution_type?: string;
  task_input: Record<string, unknown>;
  task_output?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  duration?: number;
  tokens_used?: number;
  cost?: number;
  error_message?: string;
  created_at: string;
}

export interface A2AMessage {
  id: string;
  from_agent: string;
  from_agent_name?: string;
  to_agent: string;
  to_agent_name?: string;
  message_type: 'task_request' | 'task_response' | 'status_update' | 'data_share' | 'error';
  content: Record<string, unknown>;
  correlation_id?: string;
  status: 'sent' | 'received' | 'processed' | 'failed';
  created_at: string;
}

export interface OrchestrationRequest {
  task: string;
  customer_id?: string;
  campaign_id?: string;
  parameters?: Record<string, unknown>;
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  change_period?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface DashboardData {
  metrics: DashboardMetric[];
  recent_pitches: Pitch[];
  active_campaigns: Campaign[];
  top_customers: Customer[];
  agent_activity: AgentExecution[];
  // Alternate dashboard fields
  total_customers?: number;
  customer_trend?: number;
  total_pitches?: number;
  pitch_trend?: number;
  active_campaigns_count?: number;
  campaign_trend?: number;
  avg_pitch_score?: number;
  score_trend?: number;
  pitch_trend_chart?: Array<{ date: string; count: number }>;
  [key: string]: unknown;
}

export interface PitchAnalytics {
  total_pitches: number;
  avg_score: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  score_distribution: Array<{
    range: string;
    count: number;
  }>;
  trends: Array<{
    date: string;
    count: number;
    avg_score: number;
  }>;
}

export interface AgentPerformance {
  agent_name: string;
  agent_type: string;
  total_executions: number;
  success_rate: number;
  avg_duration: number;
  total_tokens: number;
  total_cost: number;
  tasks_by_status: Record<string, number>;
  performance_trend: Array<{
    date: string;
    executions: number;
    success_rate: number;
    avg_duration: number;
  }>;
}

export interface ROIMetrics {
  total_investment: number;
  total_revenue: number;
  roi_percentage: number;
  cost_per_pitch: number;
  cost_per_conversion: number;
  revenue_per_campaign: number;
  monthly_trend: Array<{
    month: string;
    investment: number;
    revenue: number;
    roi: number;
  }>;
}

// ─── MCP Types ───────────────────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  category?: string;
}

export interface MCPToolExecution {
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
}

// ─── Common Types ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}
