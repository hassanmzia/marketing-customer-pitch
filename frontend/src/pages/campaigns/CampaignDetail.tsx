import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Play,
  Pause,
  Users,
  Mail,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Plus,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

import { campaignApi, customerApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddTargetsModal, setShowAddTargetsModal] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: campaign, isLoading } = useQuery<any>({
    queryKey: ['campaign', id],
    queryFn: () => campaignApi.get(id!),
    enabled: !!id,
  });

  const { data: customers } = useQuery<any>({
    queryKey: ['customers', 'for-campaign', customerSearch],
    queryFn: () => customerApi.list({ search: customerSearch || undefined, limit: 50 }),
    enabled: showAddTargetsModal,
  });

  const launchMutation = useMutation({
    mutationFn: () => campaignApi.update(id!, { status: 'active' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); toast.success('Campaign launched!'); },
    onError: () => toast.error('Failed to launch campaign'),
  });

  const pauseMutation = useMutation({
    mutationFn: () => campaignApi.update(id!, { status: 'paused' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaign', id] }); toast.success('Campaign paused'); },
    onError: () => toast.error('Failed to pause campaign'),
  });

  const addTargetsMutation = useMutation({
    mutationFn: (customerIds: string[]) => campaignApi.addTargets(id!, { customer_ids: customerIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      setShowAddTargetsModal(false);
      setSelectedCustomers([]);
      toast.success('Targets added!');
    },
    onError: () => toast.error('Failed to add targets'),
  });

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (!campaign) return <div className="py-16 text-center text-red-500">Campaign not found.</div>;

  const metrics = [
    { label: 'Open Rate', value: campaign.open_rate, icon: <Mail className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Response Rate', value: campaign.response_rate, icon: <MessageSquare className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Conversion Rate', value: campaign.conversion_rate, icon: <TrendingUp className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Budget Used', value: campaign.budget_usage, icon: <DollarSign className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  const targets = campaign.targets ?? [];
  const activities = campaign.activity_log ?? campaign.activities ?? [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={() => navigate('/campaigns')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" /> Back to Campaigns
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <StatusBadge status={campaign.status} />
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">{campaign.campaign_type ?? campaign.type}</span>
          </div>
          {campaign.description && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{campaign.description}</p>}
          <div className="mt-2 flex gap-4 text-xs text-gray-400">
            {campaign.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(campaign.start_date), 'MMM d, yyyy')}</span>}
            {campaign.end_date && <span> - {format(new Date(campaign.end_date), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'draft' || campaign.status === 'paused') && (
            <button onClick={() => launchMutation.mutate()} disabled={launchMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
              {launchMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Launch
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50">
              {pauseMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />} Pause
            </button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-5">
            <div className="flex items-center gap-3">
              <div className={clsx('rounded-lg p-2.5', m.bg, m.color)}>{m.icon}</div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {m.value != null ? `${(m.value * 100).toFixed(1)}%` : '--'}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Targets */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Targets ({targets.length})</h2>
          <button onClick={() => setShowAddTargetsModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700">
            <Plus className="h-3 w-3" /> Add Targets
          </button>
        </div>
        {targets.length === 0 ? (
          <EmptyState title="No targets" description="Add customers to target in this campaign" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Pitched</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Response</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {targets.map((t: any, idx: number) => (
                  <tr key={t.customer_id ?? idx}>
                    <td className="py-2 font-medium text-gray-900 dark:text-white">{t.customer_name ?? t.name ?? 'Customer'}</td>
                    <td className="py-2"><StatusBadge status={t.status ?? 'pending'} /></td>
                    <td className="py-2 text-gray-500">{t.pitched_at ? format(new Date(t.pitched_at), 'MMM d') : '--'}</td>
                    <td className="py-2 text-gray-500">{t.response_at ? format(new Date(t.response_at), 'MMM d') : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
          <div className="space-y-3">
            {activities.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div className="rounded-full bg-gray-100 p-1.5 dark:bg-gray-800"><Clock className="h-3 w-3 text-gray-400" /></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.message ?? activity.description}</p>
                  <p className="text-xs text-gray-400">{activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }) : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Targets Modal */}
      {showAddTargetsModal && (
        <Modal onClose={() => setShowAddTargetsModal(false)} title="Add Targets">
          <div className="space-y-4">
            <input type="text" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {(customers?.results ?? []).map((c: any) => (
                <label key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => setSelectedCustomers((prev) => prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id])} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.company}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddTargetsModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button onClick={() => addTargetsMutation.mutate(selectedCustomers)} disabled={selectedCustomers.length === 0 || addTargetsMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {addTargetsMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add {selectedCustomers.length} Target{selectedCustomers.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
