import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Mail,
  Share2,
  FileText,
  DollarSign,
  Calendar as CalendarIcon,
  Loader2,
  Search,
} from 'lucide-react';
import clsx from 'clsx';

import { campaignApi, customerApi } from '@/services/api';
import Card from '@/components/common/Card';

const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email Campaign', icon: Mail, description: 'Targeted email outreach' },
  { value: 'social', label: 'Social Media', icon: Share2, description: 'Social media marketing' },
  { value: 'content', label: 'Content Marketing', icon: FileText, description: 'Blog posts, whitepapers, etc.' },
  { value: 'paid', label: 'Paid Advertising', icon: DollarSign, description: 'PPC and display ads' },
];

interface FormData {
  name: string;
  description: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  budget: string;
  goals: string;
  target_industry: string;
  target_company_size: string;
}

export default function CampaignCreate() {
  const navigate = useNavigate();
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { campaign_type: 'email' },
  });

  const campaignType = watch('campaign_type');

  const { data: customers } = useQuery<any>({
    queryKey: ['customers', 'campaign-targets', customerSearch],
    queryFn: () => customerApi.list({ search: customerSearch || undefined, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => campaignApi.create(data),
    onSuccess: (result: any) => {
      toast.success('Campaign created!');
      navigate(`/campaigns/${result.id}`);
    },
    onError: (error: any) => toast.error(error?.message ?? 'Failed to create campaign'),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      ...data,
      budget: data.budget ? parseFloat(data.budget) : undefined,
      goals: data.goals ? data.goals : undefined,
      target_customers: selectedCustomers.length > 0 ? selectedCustomers : undefined,
    });
  };

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/campaigns')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Campaign</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Set up a new marketing campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        {/* Basic Info */}
        <Card className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign Name *</label>
            <input {...register('name', { required: 'Name is required' })} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Q1 Product Launch Campaign" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea {...register('description')} rows={3} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Describe the campaign objectives..." />
          </div>
        </Card>

        {/* Campaign Type */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Campaign Type</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CAMPAIGN_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <label key={type.value} className={clsx('flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition', campaignType === type.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700')}>
                  <input type="radio" {...register('campaign_type')} value={type.value} className="hidden" />
                  <div className={clsx('rounded-lg p-2', campaignType === type.value ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        {/* Date Range & Budget */}
        <Card className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input type="date" {...register('start_date')} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <input type="date" {...register('end_date')} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Budget ($)</label>
              <input type="number" {...register('budget')} step="0.01" placeholder="5000" className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Industry</label>
              <select {...register('target_industry')} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="">All Industries</option>
                {['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'].map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Target Company Size</label>
              <select {...register('target_company_size')} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                <option value="">All Sizes</option>
                {['startup', 'small', 'medium', 'enterprise'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Goals</label>
            <textarea {...register('goals')} rows={2} placeholder="Increase product awareness, generate 50 qualified leads..." className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
        </Card>

        {/* Customer Targets */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Target Customers ({selectedCustomers.length} selected)</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {(customers?.results ?? []).map((c: any) => (
              <label key={c.id} className={clsx('flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition', selectedCustomers.includes(c.id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700')}>
                <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => toggleCustomer(c.id)} className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-500">{c.company} - {c.industry}</p></div>
              </label>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/campaigns')} className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Cancel</button>
          <button type="submit" disabled={createMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
            {createMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />} Create Campaign
          </button>
        </div>
      </form>
    </motion.div>
  );
}
