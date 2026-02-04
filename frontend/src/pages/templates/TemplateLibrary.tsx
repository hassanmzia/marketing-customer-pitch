import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import {
  Plus,
  Eye,
  Sparkles,
  FileText,
  X,
  Loader2,
  BarChart3,
} from 'lucide-react';
import clsx from 'clsx';

import type { PitchTemplate } from '@/types';
import { pitchApi } from '@/services/api';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewTemplate, setPreviewTemplate] = useState<PitchTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', template_content: '', industry_focus: '', pitch_type: 'initial' });

  const { data: templates, isLoading } = useQuery<any>({
    queryKey: ['templates'],
    queryFn: () => pitchApi.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => pitchApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowCreateModal(false);
      setNewTemplate({ name: '', description: '', template_content: '', industry_focus: '', pitch_type: 'initial' });
      toast.success('Template created!');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Failed to create template'),
  });

  const templateList: PitchTemplate[] = templates?.results ?? templates ?? [];

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Library</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Browse and manage pitch templates for different industries and use cases</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Create Template
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : templateList.length === 0 ? (
        <EmptyState title="No templates yet" description="Create your first pitch template to speed up pitch generation" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templateList.map((template) => (
            <motion.div key={template.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
              <Card className="p-5 transition hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{template.description}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {template.industry_focus && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      {template.industry_focus}
                    </span>
                  )}
                  {template.pitch_type && (
                    <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium capitalize text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                      {template.pitch_type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {template.use_count != null && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                    <BarChart3 className="h-3 w-3" />
                    Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button
                    onClick={() => navigate(`/pitches/new?template=${template.id}`)}
                    className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
                  >
                    <Sparkles className="h-3 w-3" /> Use Template
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <Modal isOpen={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={previewTemplate.name}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{previewTemplate.description}</p>
            <div className="flex gap-2">
              {previewTemplate.industry_focus && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{previewTemplate.industry_focus}</span>}
              {previewTemplate.pitch_type && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium capitalize text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">{previewTemplate.pitch_type.replace(/_/g, ' ')}</span>}
            </div>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{previewTemplate.template_content ?? 'No content'}</ReactMarkdown>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPreviewTemplate(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Close</button>
              <button onClick={() => { setPreviewTemplate(null); navigate(`/pitches/new?template=${previewTemplate.id}`); }} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" /> Use Template
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Template">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
              <input value={newTemplate.name} onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="SaaS Product Launch Template" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <input value={newTemplate.description} onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Template for launching SaaS products..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Industry</label>
                <select value={newTemplate.industry_focus} onChange={(e) => setNewTemplate((prev) => ({ ...prev, industry_focus: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="">Any</option>
                  {['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education'].map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select value={newTemplate.pitch_type} onChange={(e) => setNewTemplate((prev) => ({ ...prev, pitch_type: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  {['initial', 'follow_up', 'renewal', 'product_demo'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Template Content *</label>
              <textarea value={newTemplate.template_content} onChange={(e) => setNewTemplate((prev) => ({ ...prev, template_content: e.target.value }))} rows={8} placeholder="Write your pitch template content using Markdown..." className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 font-mono text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Cancel</button>
              <button
                onClick={() => createMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.template_content || createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
