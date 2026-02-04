import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Target,
  Download,
  Trash2,
  Calendar,
  User,
  Bot,
  Megaphone,
  Clock,
  Hash,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';

import type { Pitch } from '@/types';
import { pitchApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Modal from '@/components/common/Modal';

export default function PitchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  const { data: pitch, isLoading, isError } = useQuery<any>({
    queryKey: ['pitch', id],
    queryFn: () => pitchApi.get(id!),
    enabled: !!id,
  });

  const scoreMutation = useMutation({
    mutationFn: () => pitchApi.score(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pitch', id] });
      toast.success('Pitch re-scored!');
    },
    onError: () => toast.error('Failed to score pitch'),
  });

  const refineMutation = useMutation({
    mutationFn: (feedback: string) => pitchApi.refine(id!, feedback),
    onSuccess: (refined: any) => {
      setShowRefineModal(false);
      setRefineFeedback('');
      toast.success('Pitch refined!');
      navigate(`/pitches/${refined.id}`);
    },
    onError: () => toast.error('Failed to refine pitch'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => pitchApi.delete(id!),
    onSuccess: () => {
      toast.success('Pitch deleted');
      navigate('/pitches');
    },
    onError: () => toast.error('Failed to delete pitch'),
  });

  const handleExport = () => {
    if (!pitch) return;
    const blob = new Blob([pitch.content ?? ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pitch.title ?? 'pitch'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Pitch exported!');
  };

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  if (isError || !pitch) return <div className="py-16 text-center"><p className="text-red-500">Pitch not found.</p></div>;

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button onClick={() => navigate('/pitches')} className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" /> Back to Pitches
      </button>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pitch.title}</h1>
            <StatusBadge status={pitch.status} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {pitch.customer_name && (
              <Link to={`/customers/${pitch.customer}`} className="flex items-center gap-1 hover:text-indigo-600">
                <User className="h-4 w-4" /> {pitch.customer_name}
              </Link>
            )}
            <span className="flex items-center gap-1 capitalize"><FileText className="h-4 w-4" /> {pitch.pitch_type?.replace(/_/g, ' ')}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {format(new Date(pitch.created_at), 'MMM d, yyyy h:mm a')}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRefineModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            <RefreshCw className="h-4 w-4" /> Refine
          </button>
          <button onClick={() => scoreMutation.mutate()} disabled={scoreMutation.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
            {scoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} Re-score
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => { if (confirm('Delete this pitch?')) deleteMutation.mutate(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Pitch Content */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{pitch.content ?? ''}</ReactMarkdown>
            </div>
          </Card>

          {/* Scores */}
          {(pitch.persuasiveness_score != null || pitch.clarity_score != null || pitch.relevance_score != null) && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Pitch Score</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Persuasiveness', value: pitch.persuasiveness_score, color: 'bg-purple-500' },
                  { label: 'Clarity', value: pitch.clarity_score, color: 'bg-blue-500' },
                  { label: 'Relevance', value: pitch.relevance_score, color: 'bg-emerald-500' },
                ].map((score) => (
                  <div key={score.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{score.label}</span>
                      <span className="font-bold text-gray-900 dark:text-white">{score.value != null ? `${(score.value * 100).toFixed(0)}%` : '--'}</span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <motion.div className={clsx('h-full rounded-full', score.color)} initial={{ width: 0 }} animate={{ width: `${(score.value ?? 0) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                    </div>
                  </div>
                ))}
              </div>
              {pitch.overall_score != null && (
                <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Overall:</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{(pitch.overall_score * 100).toFixed(0)}%</span>
                </div>
              )}
              {pitch.score_feedback && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{pitch.score_feedback}</p>
              )}
            </Card>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Metadata</h3>
            <dl className="space-y-3 text-xs">
              {[
                { icon: <Hash className="h-3 w-3" />, label: 'Version', value: `v${pitch.version ?? 1}` },
                { icon: <FileText className="h-3 w-3" />, label: 'Type', value: (pitch.pitch_type ?? 'initial').replace(/_/g, ' ') },
                { icon: <User className="h-3 w-3" />, label: 'Tone', value: pitch.tone },
                { icon: <Bot className="h-3 w-3" />, label: 'Generated By', value: pitch.generated_by },
                { icon: <Megaphone className="h-3 w-3" />, label: 'Campaign', value: pitch.campaign_name },
                { icon: <Clock className="h-3 w-3" />, label: 'Created', value: format(new Date(pitch.created_at), 'MMM d, yyyy') },
              ].filter((m) => m.value).map((m) => (
                <div key={m.label} className="flex items-start gap-2">
                  <span className="mt-0.5 text-gray-400">{m.icon}</span>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">{m.label}</dt>
                    <dd className="font-medium capitalize text-gray-900 dark:text-white">{m.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Card>

          {/* Version History */}
          {pitch.versions && pitch.versions.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Version History</h3>
              <div className="space-y-2">
                {pitch.versions.map((v: any) => (
                  <Link
                    key={v.id}
                    to={`/pitches/${v.id}`}
                    className={clsx('block rounded-lg border p-2 text-xs transition hover:bg-gray-50 dark:hover:bg-gray-800', v.id === pitch.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700')}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">v{v.version}</p>
                    <p className="text-gray-500">{format(new Date(v.created_at), 'MMM d, h:mm a')}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Refine Modal */}
      {showRefineModal && (
        <Modal isOpen={showRefineModal} onClose={() => setShowRefineModal(false)} title="Refine Pitch">
          <div className="space-y-4">
            <textarea
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              rows={4}
              placeholder="Provide feedback to improve this pitch..."
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRefineModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button
                onClick={() => refineMutation.mutate(refineFeedback)}
                disabled={!refineFeedback.trim() || refineMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {refineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refine
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
