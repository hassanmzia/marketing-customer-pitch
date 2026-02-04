import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Search,
  Sparkles,
  FileText,
  RefreshCw,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Download,
  ThumbsUp,
  History,
  Target,
  Zap,
  Heart,
  Briefcase,
  AlertTriangle,
  GitBranch,
  X,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

import type { Customer, Pitch, PitchTemplate } from '@/types';
import { customerApi, pitchApi, mcpApi, campaignApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';
import ScoreDisplay from '@/components/common/ScoreDisplay';
import { usePitchStore } from '@/store';

const STEPS = [
  { id: 1, label: 'Select Customer', icon: User },
  { id: 2, label: 'Configure Pitch', icon: FileText },
  { id: 3, label: 'Generated Pitch', icon: Sparkles },
];

const PITCH_TYPES = [
  { value: 'initial', label: 'Initial Outreach', icon: Send, description: 'First contact with a new prospect' },
  { value: 'follow_up', label: 'Follow-up', icon: RefreshCw, description: 'Follow-up on previous communication' },
  { value: 'renewal', label: 'Renewal', icon: History, description: 'Contract or subscription renewal pitch' },
  { value: 'product_demo', label: 'Product Demo', icon: Target, description: 'Product demonstration request' },
];

const TONES = [
  { value: 'professional', label: 'Professional', icon: Briefcase, color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' },
  { value: 'casual', label: 'Casual', icon: MessageSquare, color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' },
  { value: 'friendly', label: 'Friendly', icon: Heart, color: 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-400' },
  { value: 'urgent', label: 'Urgent', icon: AlertTriangle, color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' },
  { value: 'consultative', label: 'Consultative', icon: Zap, color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400' },
];

export default function PitchGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedCustomer = searchParams.get('customer');

  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pitchType, setPitchType] = useState('initial');
  const [tone, setTone] = useState('professional');
  const [additionalContext, setAdditionalContext] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [generatedPitch, setGeneratedPitch] = useState<Pitch | null>(null);

  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [abVariants, setAbVariants] = useState<any>(null);
  const [subjectLines, setSubjectLines] = useState<any>(null);
  const [followUpSequence, setFollowUpSequence] = useState<any>(null);
  const [versionHistory, setVersionHistory] = useState<Pitch[]>([]);

  const { data: customerData, isLoading: customersLoading } = useQuery<any>({
    queryKey: ['customers', { search: customerSearch, limit: 20 }],
    queryFn: () => customerApi.list({ search: customerSearch || undefined, limit: 20 }),
  });

  const { data: preselectedCustomerData } = useQuery<any>({
    queryKey: ['customer', preselectedCustomer],
    queryFn: () => customerApi.get(preselectedCustomer!),
    enabled: !!preselectedCustomer && !selectedCustomer,
  });

  const { data: templates } = useQuery<any>({
    queryKey: ['pitch-templates'],
    queryFn: () => pitchApi.getTemplates(),
  });

  const { data: campaigns } = useQuery<any>({
    queryKey: ['campaigns', 'active'],
    queryFn: () => campaignApi.list({ status: 'active', limit: 50 }),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => pitchApi.create(data),
    onSuccess: (pitch: Pitch) => {
      setGeneratedPitch(pitch);
      setVersionHistory([pitch]);
      setStep(3);
      toast.success('Pitch generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Failed to generate pitch');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: (id: string) => pitchApi.score(id),
    onSuccess: (scored: Pitch) => {
      setGeneratedPitch(scored);
      toast.success('Pitch scored!');
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
    },
    onError: () => toast.error('Failed to score pitch'),
  });

  const refineMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      pitchApi.refine(id, { feedback }),
    onSuccess: (refined: Pitch) => {
      setGeneratedPitch(refined);
      setVersionHistory((prev) => [...prev, refined]);
      setShowRefineModal(false);
      setRefineFeedback('');
      toast.success('Pitch refined!');
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
    },
    onError: () => toast.error('Failed to refine pitch'),
  });

  const abVariantsMutation = useMutation({
    mutationFn: (pitch: Pitch) =>
      mcpApi.executeTool('pitch_ab_variants', { pitch_id: pitch.id, pitch_content: pitch.content }),
    onSuccess: (data: any) => {
      setAbVariants(data);
      toast.success('A/B variants generated!');
    },
    onError: () => toast.error('Failed to generate A/B variants'),
  });

  const subjectLinesMutation = useMutation({
    mutationFn: (pitch: Pitch) =>
      mcpApi.executeTool('generate_subject_line', { pitch_id: pitch.id, pitch_content: pitch.content }),
    onSuccess: (data: any) => {
      setSubjectLines(data);
      toast.success('Subject lines generated!');
    },
    onError: () => toast.error('Failed to generate subject lines'),
  });

  const followUpMutation = useMutation({
    mutationFn: (pitch: Pitch) =>
      mcpApi.executeTool('generate_followup_sequence', {
        pitch_id: pitch.id,
        pitch_content: pitch.content,
        customer_name: selectedCustomer?.name,
      }),
    onSuccess: (data: any) => {
      setFollowUpSequence(data);
      toast.success('Follow-up sequence generated!');
    },
    onError: () => toast.error('Failed to generate follow-up sequence'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => pitchApi.update(id, { status: 'approved' }),
    onSuccess: (updated: Pitch) => {
      setGeneratedPitch(updated);
      toast.success('Pitch approved!');
      queryClient.invalidateQueries({ queryKey: ['pitches'] });
    },
    onError: () => toast.error('Failed to approve pitch'),
  });

  useEffect(() => {
    if (preselectedCustomerData && !selectedCustomer) {
      setSelectedCustomer(preselectedCustomerData);
    }
  }, [preselectedCustomerData, selectedCustomer]);

  const handleGenerate = () => {
    if (!selectedCustomer) return;
    generateMutation.mutate({
      customer: selectedCustomer.id,
      pitch_type: pitchType,
      tone,
      additional_context: additionalContext || undefined,
      template: selectedTemplate || undefined,
      campaign: selectedCampaign || undefined,
    });
  };

  const handleExport = () => {
    if (!generatedPitch) return;
    const blob = new Blob([generatedPitch.content ?? ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedPitch.title ?? 'pitch'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Pitch exported!');
  };

  const handleCopy = () => {
    if (!generatedPitch?.content) return;
    navigator.clipboard.writeText(generatedPitch.content);
    toast.success('Copied to clipboard!');
  };

  const resetWizard = () => {
    setStep(1);
    setGeneratedPitch(null);
    setSelectedCustomer(null);
    setAbVariants(null);
    setSubjectLines(null);
    setFollowUpSequence(null);
    setVersionHistory([]);
    setAdditionalContext('');
    setSelectedTemplate('');
    setSelectedCampaign('');
  };

  const customers = customerData?.results ?? [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/pitches')}
          className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generate New Pitch</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered pitch generation wizard</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          return (
            <React.Fragment key={s.id}>
              {idx > 0 && (
                <div className={clsx('h-0.5 w-12 transition-colors', isCompleted ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700')} />
              )}
              <div
                className={clsx(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isCompleted
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Customer */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-3xl space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Select a Customer</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers by name, company, or industry..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              {customersLoading ? (
                <div className="py-8"><LoadingSpinner /></div>
              ) : (
                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                  {customers.map((customer: any) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition',
                        selectedCustomer?.id === customer.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">
                        {customer.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{customer.company} &middot; {customer.industry}</p>
                      </div>
                      <StatusBadge status={customer.status} />
                      {selectedCustomer?.id === customer.id && <Check className="h-5 w-5 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {selectedCustomer && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-indigo-200 bg-indigo-50/50 p-6 dark:border-indigo-800 dark:bg-indigo-900/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Selected Customer</p>
                      <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedCustomer.company} &middot; {selectedCustomer.industry} &middot; Lead Score: {selectedCustomer.lead_score ?? 0}
                      </p>
                      {selectedCustomer.pain_points && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium">Pain points:</span> {selectedCustomer.pain_points}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}

            <div className="flex justify-end">
              <button
                disabled={!selectedCustomer}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Configure Pitch */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="mx-auto max-w-3xl space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Pitch Type</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PITCH_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setPitchType(type.value)}
                      className={clsx(
                        'flex items-start gap-3 rounded-xl border-2 p-4 text-left transition',
                        pitchType === type.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      )}
                    >
                      <div className={clsx('rounded-lg p-2', pitchType === type.value ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tone</h2>
              <div className="flex flex-wrap gap-3">
                {TONES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={clsx(
                        'flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition',
                        tone === t.value
                          ? t.color + ' border-current'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                      )}
                    >
                      <Icon className="h-4 w-4" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Additional Context (Optional)</label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  rows={3}
                  placeholder="Any specific points to emphasize, competitive advantages, recent news..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Template (Optional)</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option value="">None - AI will generate freely</option>
                    {(templates?.results ?? templates ?? []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Campaign (Optional)</label>
                  <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                    <option value="">No campaign</option>
                    {(campaigns?.results ?? []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {generateMutation.isLoading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>) : (<><Sparkles className="h-4 w-4" /> Generate Pitch</>)}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Generated Pitch */}
        {step === 3 && generatedPitch && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              <div className="space-y-6 xl:col-span-3">
                {/* Pitch Content */}
                <Card className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{generatedPitch.title}</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        For {selectedCustomer?.name} &middot; <span className="capitalize">{generatedPitch.pitch_type?.replace(/_/g, ' ')}</span> &middot; <span className="capitalize">{generatedPitch.tone}</span> tone
                      </p>
                    </div>
                    <StatusBadge status={generatedPitch.status} />
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{generatedPitch.content ?? ''}</ReactMarkdown>
                  </div>
                </Card>

                {/* Scores */}
                {(generatedPitch.persuasiveness_score != null || generatedPitch.clarity_score != null || generatedPitch.relevance_score != null) && (
                  <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Pitch Score</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {[
                        { label: 'Persuasiveness', value: generatedPitch.persuasiveness_score, color: 'bg-purple-500' },
                        { label: 'Clarity', value: generatedPitch.clarity_score, color: 'bg-blue-500' },
                        { label: 'Relevance', value: generatedPitch.relevance_score, color: 'bg-emerald-500' },
                      ].map((score) => (
                        <div key={score.label}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{score.label}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{score.value != null ? `${(score.value * 100).toFixed(0)}%` : '--'}</span>
                          </div>
                          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <motion.div className={clsx('h-full rounded-full', score.color)} initial={{ width: 0 }} animate={{ width: `${(score.value ?? 0) * 100}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {generatedPitch.overall_score != null && (
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Overall Score:</span>
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{(generatedPitch.overall_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </Card>
                )}

                {/* Actions */}
                <Card className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => scoreMutation.mutate(generatedPitch.id)} disabled={scoreMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                      {scoreMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} Score Pitch
                    </button>
                    <button onClick={() => setShowRefineModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      <RefreshCw className="h-4 w-4" /> Refine Pitch
                    </button>
                    <button onClick={() => abVariantsMutation.mutate(generatedPitch)} disabled={abVariantsMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
                      {abVariantsMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />} A/B Variants
                    </button>
                    <button onClick={() => subjectLinesMutation.mutate(generatedPitch)} disabled={subjectLinesMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                      {subjectLinesMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Subject Lines
                    </button>
                    <button onClick={() => followUpMutation.mutate(generatedPitch)} disabled={followUpMutation.isLoading} className="inline-flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-medium text-pink-700 transition hover:bg-pink-100 disabled:opacity-50 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-400">
                      {followUpMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Follow-up Sequence
                    </button>
                    <div className="ml-auto flex gap-2">
                      <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"><Copy className="h-4 w-4" /></button>
                      <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"><Download className="h-4 w-4" /> Export</button>
                      <button onClick={() => approveMutation.mutate(generatedPitch.id)} disabled={approveMutation.isLoading || generatedPitch.status === 'approved'} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                        <ThumbsUp className="h-4 w-4" /> {generatedPitch.status === 'approved' ? 'Approved' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </Card>

                {/* A/B Variants */}
                {abVariants && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">A/B Variants</h3>
                      <div className="space-y-4">
                        {(abVariants.variants ?? abVariants.result?.variants ?? [abVariants]).map((variant: any, idx: number) => (
                          <div key={idx} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                            <p className="mb-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">Variant {String.fromCharCode(65 + idx)}</p>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown>{variant.content ?? variant.text ?? JSON.stringify(variant)}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Subject Lines */}
                {subjectLines && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Subject Lines</h3>
                      <div className="space-y-2">
                        {(subjectLines.subject_lines ?? subjectLines.result?.subject_lines ?? [subjectLines]).map((line: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <span className="text-sm text-gray-900 dark:text-white">{typeof line === 'string' ? line : line.subject ?? line.text}</span>
                            <button onClick={() => { navigator.clipboard.writeText(typeof line === 'string' ? line : line.subject ?? line.text ?? ''); toast.success('Copied!'); }} className="text-gray-400 hover:text-gray-600"><Copy className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Follow-up Sequence */}
                {followUpSequence && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Follow-up Sequence</h3>
                      <div className="relative space-y-4">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                        {(followUpSequence.sequence ?? followUpSequence.result?.sequence ?? [followUpSequence]).map((item: any, idx: number) => (
                          <div key={idx} className="relative flex gap-4 pl-10">
                            <div className="absolute left-2.5 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{idx + 1}</div>
                            <div className="flex-1 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                              {item.day && <p className="mb-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">Day {item.day}</p>}
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown>{item.content ?? item.text ?? JSON.stringify(item)}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><History className="h-4 w-4" /> Version History</h3>
                  <div className="space-y-2">
                    {versionHistory.map((version, idx) => (
                      <button
                        key={version.id + '-' + idx}
                        onClick={() => setGeneratedPitch(version)}
                        className={clsx('w-full rounded-lg border p-3 text-left text-xs transition', generatedPitch.id === version.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700')}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">v{version.version ?? idx + 1}</p>
                        <p className="mt-0.5 text-gray-500 dark:text-gray-400">{version.created_at ? format(new Date(version.created_at), 'MMM d, h:mm a') : 'Just now'}</p>
                        <div className="mt-1"><StatusBadge status={version.status} /></div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Metadata</h3>
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Type</dt><dd className="capitalize font-medium text-gray-900 dark:text-white">{generatedPitch.pitch_type?.replace(/_/g, ' ')}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Tone</dt><dd className="capitalize font-medium text-gray-900 dark:text-white">{generatedPitch.tone}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Version</dt><dd className="font-medium text-gray-900 dark:text-white">{generatedPitch.version ?? 1}</dd></div>
                    {generatedPitch.generated_by && <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Generated By</dt><dd className="font-medium text-gray-900 dark:text-white">{generatedPitch.generated_by}</dd></div>}
                  </dl>
                </Card>

                <button onClick={resetWizard} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  Generate Another Pitch
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {generateMutation.isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <Card className="mx-4 max-w-sm p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <Sparkles className="h-8 w-8 animate-pulse text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generating Your Pitch</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Our AI agents are researching the customer and crafting a personalized pitch...</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" initial={{ width: '0%' }} animate={{ width: '90%' }} transition={{ duration: 8, ease: 'easeOut' }} />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine Modal */}
      {showRefineModal && (
        <Modal onClose={() => setShowRefineModal(false)} title="Refine Pitch">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Provide feedback to refine and improve the pitch.</p>
            <textarea
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              rows={4}
              placeholder="E.g., Make it more concise, emphasize ROI benefits, add a stronger call to action..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRefineModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button
                onClick={() => refineMutation.mutate({ id: generatedPitch!.id, feedback: refineFeedback })}
                disabled={!refineFeedback.trim() || refineMutation.isLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {refineMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refine
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
