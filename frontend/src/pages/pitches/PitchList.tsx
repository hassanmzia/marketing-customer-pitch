import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Trash2,
  GitCompare,
  Filter,
  FileText,
} from 'lucide-react';
import clsx from 'clsx';

import { Pitch, PaginatedResponse } from '@/types';
import { pitchApi, customerApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const PITCH_TYPES = ['initial', 'follow_up', 'renewal', 'product_demo'];
const PITCH_STATUSES = ['draft', 'generated', 'scored', 'refined', 'approved', 'rejected'];

export default function PitchList() {
  const navigate = useNavigate();
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [expandedPitch, setExpandedPitch] = useState<string | null>(null);
  const [selectedPitches, setSelectedPitches] = useState<string[]>([]);

  const { data: customers } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customerApi.list({ limit: 100 }),
  });

  const queryParams = useMemo(
    () => ({
      customer: customerFilter || undefined,
      status: statusFilter || undefined,
      pitch_type: typeFilter || undefined,
      ordering: sortBy,
      page,
      limit: 10,
    }),
    [customerFilter, statusFilter, typeFilter, sortBy, page]
  );

  const { data, isLoading } = useQuery<any>({
    queryKey: ['pitches', queryParams],
    queryFn: () => pitchApi.list(queryParams),
  });

  const pitches = data?.results ?? [];
  const totalPages = data ? Math.ceil((data.count ?? 0) / 10) : 1;

  const toggleSort = (field: string) => {
    setSortBy((prev) => (prev === field ? `-${field}` : prev === `-${field}` ? field : `-${field}`));
  };

  const toggleSelect = (id: string) => {
    setSelectedPitches((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const ScoreBar = ({ label, value }: { label: string; value?: number | null }) => (
    <div className="flex items-center gap-2">
      <span className="w-8 text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={clsx(
            'h-full rounded-full',
            (value ?? 0) >= 0.8
              ? 'bg-emerald-500'
              : (value ?? 0) >= 0.6
              ? 'bg-yellow-500'
              : 'bg-red-500'
          )}
          style={{ width: `${(value ?? 0) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pitches</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track your AI-generated marketing pitches
          </p>
        </div>
        <button
          onClick={() => navigate('/pitches/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Generate New Pitch
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          <select
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Customers</option>
            {(customers?.results ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Statuses</option>
            {PITCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Types</option>
            {PITCH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Sort:</span>
            <button
              onClick={() => toggleSort('created_at')}
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-1 transition',
                sortBy.includes('created_at')
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Date
              {sortBy === '-created_at' ? (
                <SortDesc className="h-3 w-3" />
              ) : (
                <SortAsc className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={() => toggleSort('overall_score')}
              className={clsx(
                'flex items-center gap-1 rounded-md px-2 py-1 transition',
                sortBy.includes('overall_score')
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Score
              {sortBy === '-overall_score' ? (
                <SortDesc className="h-3 w-3" />
              ) : (
                <SortAsc className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedPitches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20"
        >
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedPitches.length} selected
          </span>
          <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200">
            <GitCompare className="h-3 w-3" />
            Compare
          </button>
          <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 dark:bg-gray-800">
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <button
            onClick={() => setSelectedPitches([])}
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Clear selection
          </button>
        </motion.div>
      )}

      {/* Pitch List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : pitches.length === 0 ? (
        <EmptyState
          title="No pitches found"
          description="Generate your first AI-powered pitch to get started"
        />
      ) : (
        <div className="space-y-4">
          {pitches.map((pitch: any) => (
            <motion.div
              key={pitch.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden transition hover:shadow-md">
                <div className="flex items-start gap-4 p-5">
                  <input
                    type="checkbox"
                    checked={selectedPitches.includes(pitch.id)}
                    onChange={() => toggleSelect(pitch.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/pitches/${pitch.id}`)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {pitch.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {pitch.customer_name ?? 'Unknown Customer'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={pitch.status} />
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {(pitch.pitch_type ?? 'initial').replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-400">v{pitch.version ?? 1}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-6">
                      <div className="flex gap-3">
                        <ScoreBar label="P" value={pitch.persuasiveness_score} />
                        <ScoreBar label="C" value={pitch.clarity_score} />
                        <ScoreBar label="R" value={pitch.relevance_score} />
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(pitch.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPitch(expandedPitch === pitch.id ? null : pitch.id);
                    }}
                    className="mt-1 text-gray-400 transition hover:text-gray-600"
                  >
                    {expandedPitch === pitch.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {expandedPitch === pitch.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {pitch.content?.substring(0, 300)}
                        {(pitch.content?.length ?? 0) > 300 ? '...' : ''}
                      </p>
                      <button
                        onClick={() => navigate(`/pitches/${pitch.id}`)}
                        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        View full pitch
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
