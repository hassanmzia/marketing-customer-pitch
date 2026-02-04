import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Bot,
  Play,
  Search,
  ArrowRight,
  Clock,
  Zap,
  Users,
  FileText,
  Target,
  CheckCircle,
  Loader2,
  Filter,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

import { agentApi, customerApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  research: <Search className="h-5 w-5" />,
  pitch_generation: <FileText className="h-5 w-5" />,
  scoring: <Target className="h-5 w-5" />,
  refinement: <Zap className="h-5 w-5" />,
  approval: <CheckCircle className="h-5 w-5" />,
};

const PIPELINE_STEPS = [
  { key: 'research', label: 'Research', color: 'bg-blue-500' },
  { key: 'pitch_generation', label: 'Pitch Gen', color: 'bg-purple-500' },
  { key: 'scoring', label: 'Scoring', color: 'bg-amber-500' },
  { key: 'refinement', label: 'Refinement', color: 'bg-emerald-500' },
  { key: 'approval', label: 'Approval', color: 'bg-indigo-500' },
];

export default function AgentDashboard() {
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [pipelineLogs, setPipelineLogs] = useState<any[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [messageFilter, setMessageFilter] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: agents, isLoading: agentsLoading } = useQuery<any>({
    queryKey: ['agents'],
    queryFn: () => agentApi.list(),
  });

  const { data: executions } = useQuery<any>({
    queryKey: ['agent-executions'],
    queryFn: () => agentApi.listExecutions({ limit: 10, ordering: '-started_at' }),
  });

  const { data: messages } = useQuery<any>({
    queryKey: ['a2a-messages', messageFilter],
    queryFn: () => agentApi.listMessages({ agent: messageFilter || undefined, limit: 20 }),
  });

  const { data: customers } = useQuery<any>({
    queryKey: ['customers', 'for-pipeline'],
    queryFn: () => customerApi.list({ limit: 50 }),
  });

  const orchestrateMutation = useMutation({
    mutationFn: (customerId: string) => agentApi.orchestrate({ customer_id: customerId }),
    onSuccess: (data: any) => {
      toast.success('Pipeline started!');
      setPipelineRunning(true);
      setPipelineLogs([{ message: 'Pipeline orchestration started...', timestamp: new Date().toISOString(), status: 'running' }]);

      // Start polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const status = await agentApi.getOrchestrationStatus(data.id ?? data.execution_id);
          setPipelineLogs(status.logs ?? status.steps ?? []);
          if (status.status === 'completed' || status.status === 'failed') {
            setPipelineRunning(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            queryClient.invalidateQueries({ queryKey: ['agent-executions'] });
            queryClient.invalidateQueries({ queryKey: ['a2a-messages'] });
            toast.success(status.status === 'completed' ? 'Pipeline completed!' : 'Pipeline failed');
          }
        } catch {
          // Keep polling
        }
      }, 2000);
    },
    onError: () => {
      toast.error('Failed to start pipeline');
      setPipelineRunning(false);
    },
  });

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pipelineLogs]);

  const agentList = agents?.results ?? agents ?? [];
  const executionList = executions?.results ?? [];
  const messageList = messages?.results ?? [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agents</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monitor and manage your multi-agent AI system</p>
      </div>

      {/* Agent Cards */}
      {agentsLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {agentList.map((agent: any) => (
            <Card key={agent.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={clsx('rounded-lg p-2', agent.status === 'active' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                  {AGENT_ICONS[agent.agent_type] ?? <Bot className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</p>
                  <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', agent.agent_type ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : '')}>
                    {agent.agent_type ?? 'agent'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{agent.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={agent.status ?? 'active'} />
                {agent.last_execution && <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(agent.last_execution), { addSuffix: true })}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline Flow Diagram */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Agent Pipeline Flow</h2>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {PIPELINE_STEPS.map((step, idx) => (
            <React.Fragment key={step.key}>
              {idx > 0 && (
                <div className="mx-2 flex items-center">
                  <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <div className={clsx('flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-md', step.color)}>
                  {AGENT_ICONS[step.key] ?? <Bot className="h-6 w-6" />}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{step.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Pipeline Orchestration */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Run Full Pipeline</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Choose a customer...</option>
              {(customers?.results ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
            </select>
          </div>
          <button
            onClick={() => selectedCustomer && orchestrateMutation.mutate(selectedCustomer)}
            disabled={!selectedCustomer || pipelineRunning || orchestrateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
          >
            {pipelineRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {pipelineRunning ? 'Running...' : 'Orchestrate'}
          </button>
        </div>

        {/* Execution Log */}
        {pipelineLogs.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Execution Log</h3>
            <div ref={logRef} className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
              {pipelineLogs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <span className={clsx('mt-0.5 h-2 w-2 flex-shrink-0 rounded-full', log.status === 'completed' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500' : log.status === 'running' ? 'bg-amber-500 animate-pulse' : 'bg-gray-400')} />
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}</span>
                  <span className="text-gray-700 dark:text-gray-300">{log.message ?? log.step ?? JSON.stringify(log)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Recent Executions */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Recent Executions</h2>
        {executionList.length === 0 ? (
          <EmptyState title="No executions yet" description="Run a pipeline to see execution history" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Agent</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Tokens</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Duration</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Time</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {executionList.map((exec: any) => (
                  <tr key={exec.id}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{exec.agent_name ?? `Agent ${exec.agent}`}</td>
                    <td className="py-2"><StatusBadge status={exec.status} /></td>
                    <td className="py-2 text-gray-500">{exec.tokens_used ?? '--'}</td>
                    <td className="py-2 text-gray-500">{exec.duration ? `${exec.duration}s` : '--'}</td>
                    <td className="py-2 text-gray-400 text-xs">{formatDistanceToNow(new Date(exec.started_at ?? exec.created_at), { addSuffix: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* A2A Messages */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">A2A Messages</h2>
          <select value={messageFilter} onChange={(e) => setMessageFilter(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            <option value="">All Agents</option>
            {agentList.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {messageList.length === 0 ? (
          <EmptyState title="No messages" description="Agent-to-agent messages will appear here during orchestration" />
        ) : (
          <div className="space-y-3">
            {messageList.map((msg: any) => (
              <div key={msg.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{msg.from_agent_name ?? msg.from_agent}</span>
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{msg.to_agent_name ?? msg.to_agent}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{msg.message_type ?? 'message'}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)?.substring(0, 200)}</p>
                {msg.created_at && <p className="mt-1 text-[10px] text-gray-400">{format(new Date(msg.created_at), 'MMM d, h:mm:ss a')}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
