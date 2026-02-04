import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  Filter,
  Play,
  Pause,
  BarChart3,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

import { campaignApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed'];
const CAMPAIGN_TYPES = ['email', 'social', 'content', 'paid', 'event'];

export default function CampaignList() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<any>({
    queryKey: ['campaigns', { status: statusFilter, type: typeFilter, page }],
    queryFn: () => campaignApi.list({ status: statusFilter || undefined, campaign_type: typeFilter || undefined, page, limit: 12 }),
  });

  const campaigns = data?.results ?? [];
  const totalPages = data ? Math.ceil((data.count ?? 0) / 12) : 1;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your marketing campaigns and track performance</p>
        </div>
        <button onClick={() => navigate('/campaigns/new')} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Create Campaign
        </button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <option value="">All Statuses</option>
            {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <option value="">All Types</option>
            {CAMPAIGN_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : campaigns.length === 0 ? (
        <EmptyState title="No campaigns found" description="Create your first campaign to get started" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign: any) => (
            <motion.div key={campaign.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
              <Card className="cursor-pointer p-5 transition hover:shadow-md" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{campaign.description}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">{campaign.campaign_type ?? campaign.type}</span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {campaign.target_count ?? campaign.targets?.length ?? 0} targets</span>
                  {campaign.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(campaign.start_date), 'MMM d')}</span>}
                </div>

                {/* Mini metrics */}
                {(campaign.open_rate != null || campaign.response_rate != null) && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {campaign.open_rate != null && (
                      <div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Open Rate</span><span className="font-medium text-gray-700 dark:text-gray-300">{(Number(campaign.open_rate) * 100).toFixed(0)}%</span></div>
                        <div className="mt-1 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-blue-500" style={{ width: `${campaign.open_rate * 100}%` }} /></div>
                      </div>
                    )}
                    {campaign.response_rate != null && (
                      <div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Response Rate</span><span className="font-medium text-gray-700 dark:text-gray-300">{(Number(campaign.response_rate) * 100).toFixed(0)}%</span></div>
                        <div className="mt-1 h-1 w-full rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${campaign.response_rate * 100}%` }} /></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress */}
                {campaign.progress != null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400"><span>Progress</span><span>{(Number(campaign.progress) * 100).toFixed(0)}%</span></div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${campaign.progress * 100}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  {campaign.status === 'draft' && (
                    <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                      <Play className="h-3 w-3" /> Launch
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button onClick={(e) => { e.stopPropagation(); }} className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                      <Pause className="h-3 w-3" /> Pause
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaign.id}`); }} className="flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <BarChart3 className="h-3 w-3" /> Metrics
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-50 dark:border-gray-700"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-50 dark:border-gray-700"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
