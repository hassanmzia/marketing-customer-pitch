import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { format } from 'date-fns';
import {
  FileText,
  Target,
  TrendingUp,
  Zap,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

import { analyticsApi } from '@/services/api';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DATE_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('30d');

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ['analytics', dateRange],
    queryFn: () => analyticsApi.dashboard(),
  });

  const { data: pitchAnalytics } = useQuery<any>({
    queryKey: ['pitch-analytics', dateRange],
    queryFn: () => analyticsApi.pitchAnalytics({ range: dateRange }),
  });

  const { data: agentPerformance } = useQuery<any>({
    queryKey: ['agent-performance', dateRange],
    queryFn: () => analyticsApi.agentPerformance(),
  });

  const kpis = [
    { label: 'Total Pitches', value: analytics?.total_pitches ?? 0, icon: <FileText className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', trend: analytics?.pitch_trend },
    { label: 'Avg Score', value: analytics?.avg_score != null ? `${(analytics.avg_score * 100).toFixed(0)}%` : 'N/A', icon: <Target className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', trend: analytics?.score_trend },
    { label: 'Conversion Rate', value: analytics?.conversion_rate != null ? `${(analytics.conversion_rate * 100).toFixed(1)}%` : 'N/A', icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', trend: analytics?.conversion_trend },
    { label: 'Agent Efficiency', value: analytics?.agent_efficiency != null ? `${(analytics.agent_efficiency * 100).toFixed(0)}%` : 'N/A', icon: <Zap className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', trend: analytics?.efficiency_trend },
  ];

  const pitchTrends = pitchAnalytics?.trends ?? [];
  const scoreDistribution = pitchAnalytics?.score_distribution ?? [];
  const agentComparison = agentPerformance?.comparison ?? [];
  const campaignROI = analytics?.campaign_roi ?? [];
  const topPitches = pitchAnalytics?.top_pitches ?? [];
  const engagementGrid = analytics?.engagement_heatmap ?? [];

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          {DATE_RANGES.map((range) => (
            <button key={range.value} onClick={() => setDateRange(range.value)} className={clsx('rounded-lg px-3 py-1.5 text-sm font-medium transition', dateRange === range.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300')}>
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={clsx('rounded-lg p-2.5', kpi.bg, kpi.color)}>{kpi.icon}</div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
                {kpi.trend != null && (
                  <p className={clsx('text-xs font-medium', kpi.trend >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                    {kpi.trend >= 0 ? '+' : ''}{kpi.trend}% vs previous
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pitch Trends */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Pitch Generation Trends</h2>
          {pitchTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={pitchTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="py-12 text-center text-sm text-gray-400">No data available</p>}
        </Card>

        {/* Score Distribution */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Score Distribution</h2>
          {scoreDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-12 text-center text-sm text-gray-400">No data available</p>}
        </Card>

        {/* Agent Performance */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Agent Performance</h2>
          {agentComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={agentComparison} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="success_rate" fill="#10b981" radius={[0, 4, 4, 0]} name="Success Rate %" />
                <Bar dataKey="avg_duration" fill="#6366f1" radius={[0, 4, 4, 0]} name="Avg Duration (s)" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="py-12 text-center text-sm text-gray-400">No data available</p>}
        </Card>

        {/* Campaign ROI */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Campaign Performance</h2>
          {campaignROI.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={campaignROI} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {campaignROI.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="py-12 text-center text-sm text-gray-400">No data available</p>}
        </Card>
      </div>

      {/* Top Performing Pitches */}
      {topPitches.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Performing Pitches</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium text-gray-500">Title</th>
                <th className="pb-2 font-medium text-gray-500">Customer</th>
                <th className="pb-2 font-medium text-gray-500">Score</th>
                <th className="pb-2 font-medium text-gray-500">Type</th>
                <th className="pb-2 font-medium text-gray-500">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {topPitches.map((pitch: any) => (
                  <tr key={pitch.id}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{pitch.title}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-300">{pitch.customer_name}</td>
                    <td className="py-2"><span className="font-bold text-indigo-600 dark:text-indigo-400">{pitch.overall_score != null ? `${(pitch.overall_score * 100).toFixed(0)}%` : '--'}</span></td>
                    <td className="py-2 capitalize text-gray-500">{pitch.pitch_type?.replace(/_/g, ' ')}</td>
                    <td className="py-2 text-gray-400 text-xs">{pitch.created_at ? format(new Date(pitch.created_at), 'MMM d') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Engagement Heatmap */}
      {engagementGrid.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Customer Engagement Heatmap</h2>
          <div className="grid grid-cols-7 gap-1">
            {engagementGrid.map((cell: any, idx: number) => (
              <div
                key={idx}
                className={clsx('h-8 rounded', cell.value > 0.8 ? 'bg-indigo-600' : cell.value > 0.6 ? 'bg-indigo-400' : cell.value > 0.4 ? 'bg-indigo-300' : cell.value > 0.2 ? 'bg-indigo-200' : cell.value > 0 ? 'bg-indigo-100' : 'bg-gray-100 dark:bg-gray-800')}
                title={`${cell.label ?? ''}: ${cell.value ?? 0}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span>Less</span>
            {[100, 200, 300, 400, 600].map((shade) => (
              <div key={shade} className={`h-3 w-3 rounded bg-indigo-${shade}`} />
            ))}
            <span>More</span>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
