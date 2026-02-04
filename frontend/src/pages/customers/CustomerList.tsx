import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  Mail,
} from 'lucide-react';
import clsx from 'clsx';

import type { Customer, PaginatedResponse } from '@/types';
import { customerApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Media',
  'Real Estate',
];
const STATUSES = ['prospect', 'lead', 'qualified', 'customer', 'churned'];
const SIZES = ['startup', 'small', 'medium', 'enterprise'];

export default function CustomerList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('');
  const [status, setStatus] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      search: search || undefined,
      industry: industry || undefined,
      status: status || undefined,
      company_size: companySize || undefined,
      page,
      limit: 12,
    }),
    [search, industry, status, companySize, page]
  );

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['customers', queryParams],
    queryFn: () => customerApi.list(queryParams),
  });

  const customers = data?.results ?? [];
  const totalPages = data ? Math.ceil((data.count ?? 0) / 12) : 1;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your customer database and generate personalized pitches
          </p>
        </div>
        <button
          onClick={() => navigate('/customers/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Filter className="h-4 w-4" />
            </div>
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={companySize}
              onChange={(e) => {
                setCompanySize(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Sizes</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
              <button
                onClick={() => setViewMode('table')}
                className={clsx(
                  'rounded-md p-1.5 transition',
                  viewMode === 'table'
                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'rounded-md p-1.5 transition',
                  viewMode === 'grid'
                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center">
          <p className="text-red-500">Failed to load customers. Please try again.</p>
        </Card>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={search ? 'Try adjusting your search or filters' : 'Add your first customer to get started'}
        />
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Company
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Industry
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Lead Score
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {customers.map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {getInitials(customer.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {customer.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {customer.company}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {customer.industry}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={clsx('h-full rounded-full', getScoreColor(customer.lead_score ?? 0))}
                            style={{ width: `${customer.lead_score ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {customer.lead_score ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pitches/new?customer=${customer.id}`);
                        }}
                        className="rounded-md bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400"
                      >
                        Generate Pitch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {customers.map((customer: any) => (
            <motion.div
              key={customer.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className="cursor-pointer p-5 transition hover:shadow-md"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">
                    {getInitials(customer.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">
                      {customer.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3 w-3" />
                      {customer.company}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {customer.industry}
                  </span>
                  <StatusBadge status={customer.status} />
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Lead Score</span>
                    <span className="font-medium">{customer.lead_score ?? 0}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={clsx('h-full rounded-full transition-all', getScoreColor(customer.lead_score ?? 0))}
                      style={{ width: `${customer.lead_score ?? 0}%` }}
                    />
                  </div>
                </div>

                {customer.email && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * 12 + 1} to {Math.min(page * 12, data?.count ?? 0)} of{' '}
            {data?.count ?? 0} customers
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
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
