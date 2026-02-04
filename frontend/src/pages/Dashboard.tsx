import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Megaphone,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  BarChart3,
  Sparkles,
  Bot,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

import { Pitch, AgentExecution } from '@/types';
import { analyticsApi, pitchApi, agentApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const statIcons: Record<string, React.ReactNode> = {
  customers: <Users className="h-6 w-6" />,
  pitches: <FileText className="h-6 w-6" />,
  campaigns: <Megaphone className="h-6 w-6" />,
  score: <BarChart3 className="h-6 w-6" />,
};

const statColors: Record<string, string> = {
  customers: 'from-blue-500 to-blue-600',
  pitches: 'from-purple-500 to-purple-600',
  campaigns: 'from-emerald-500 to-emerald-600',
  score: 'from-amber-500 to-amber-600',
};

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<any>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard(),
  });

  const { data: recentPitches, isLoading: pitchesLoading } = useQuery<any>({
    queryKey: ['pitches', 'recent'],
    queryFn: () => pitchApi.list({ limit: 5, ordering: '-created_at' }),
  });

  const { data: recentExecutions, isLoading: executionsLoading } = useQuery<any>({
    queryKey: ['agent-executions', 'recent'],
    queryFn: () => agentApi.listExecutions({ limit: 5, ordering: '-started_at' }),
  });

  const metrics: { key: string; label: string; value: any; trend?: number }[] =
    dashboardData
      ? [
          {
            key: 'customers',
            label: 'Total Customers',
            value: dashboardData.total_customers ?? 0,
            trend: dashboardData.customer_trend,
          },
          {
            key: 'pitches',
            label: 'Pitches Generated',
            value: dashboardData.total_pitches ?? 0,
            trend: dashboardData.pitch_trend,
          },
          {
            key: 'campaigns',
            label: 'Active Campaigns',
            value: dashboardData.active_campaigns ?? 0,
            trend: dashboardData.campaign_trend,
          },
          {
            key: 'score',
            label: 'Avg Pitch Score',
            value: dashboardData.avg_pitch_score
              ? `${(Number(dashboardData.avg_pitch_score) * 100).toFixed(0)}%`
              : 'N/A',
            trend: dashboardData.score_trend,
          },
        ]
      : [];

  const chartData = dashboardData?.pitch_trend_chart ?? [];

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-8 text-white shadow-xl"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8" />
            <h1 className="text-3xl font-bold">AI Marketing Pitch Assistant</h1>
          </div>
          <p className="mt-2 max-w-2xl text-indigo-100">
            Generate personalized, high-converting marketing pitches powered by multi-agent AI.
            Research customers, craft compelling narratives, and optimize campaigns — all in one
            place.
          </p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      {dashboardLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <motion.div key={metric.key} variants={itemVariants}>
              <Card className="relative overflow-hidden p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {metric.value}
                    </p>
                  </div>
                  <div
                    className={clsx(
                      'rounded-lg bg-gradient-to-br p-3 text-white',
                      statColors[metric.key]
                    )}
                  >
                    {statIcons[metric.key]}
                  </div>
                </div>
                {metric.trend !== undefined && metric.trend !== null && (
                  <div className="mt-3 flex items-center gap-1 text-sm">
                    {metric.trend >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={clsx(
                        'font-medium',
                        metric.trend >= 0 ? 'text-emerald-500' : 'text-red-500'
                      )}
                    >
                      {Math.abs(metric.trend)}%
                    </span>
                    <span className="text-gray-400">vs last period</span>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Pitches */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Pitches
              </h2>
              <Link
                to="/pitches"
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {pitchesLoading ? (
              <LoadingSpinner />
            ) : !recentPitches?.results?.length ? (
              <EmptyState
                title="No pitches yet"
                description="Generate your first AI-powered pitch"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">
                        Customer
                      </th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Score</th>
                      <th className="pb-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentPitches.results.map((pitch: Pitch) => (
                      <tr
                        key={pitch.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        onClick={() => navigate(`/pitches/${pitch.id}`)}
                      >
                        <td className="py-3 font-medium text-gray-900 dark:text-white">
                          {pitch.customer_name ?? 'Unknown'}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">
                          {pitch.title}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={pitch.status} />
                        </td>
                        <td className="py-3">
                          {pitch.overall_score != null ? (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {(Number(pitch.overall_score) * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 dark:text-gray-400">
                          {format(new Date(pitch.created_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Actions & Mini Chart */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pitches/new')}
                className="flex w-full items-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5" />
                Generate New Pitch
                <ArrowRight className="ml-auto h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/campaigns/new')}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Megaphone className="h-5 w-5" />
                Create Campaign
                <ArrowRight className="ml-auto h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <BarChart3 className="h-5 w-5" />
                View Analytics
                <ArrowRight className="ml-auto h-4 w-4" />
              </button>
            </div>
          </Card>

          {/* Mini Chart */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Pitches (Last 7 Days)
            </h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#pitchGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">No data yet</p>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Agent Activity Feed */}
      <motion.div variants={itemVariants}>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Agent Activity
            </h2>
            <Link
              to="/agents"
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {executionsLoading ? (
            <LoadingSpinner />
          ) : !recentExecutions?.results?.length ? (
            <EmptyState title="No agent activity" description="Run a pipeline to see agent execution logs" />
          ) : (
            <div className="space-y-3">
              {recentExecutions.results.map((exec: AgentExecution) => (
                <div
                  key={exec.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                >
                  <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                    <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {exec.agent_name ?? `Agent ${exec.agent}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {exec.execution_type ?? 'execution'}
                    </p>
                  </div>
                  <StatusBadge status={exec.status} />
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(exec.started_at ?? exec.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
