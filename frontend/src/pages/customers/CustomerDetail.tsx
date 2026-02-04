import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Edit,
  Sparkles,
  Plus,
  MessageSquare,
  TrendingUp,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  FileText,
  Target,
  Star,
} from 'lucide-react';
import clsx from 'clsx';

import { Customer, Pitch } from '@/types';
import { customerApi, pitchApi } from '@/services/api';
import Card from '@/components/common/Card';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ScoreDisplay from '@/components/common/ScoreDisplay';

const TABS = ['Overview', 'Interactions', 'Pitches', '360\u00B0 View'] as const;
type Tab = (typeof TABS)[number];

const interactionIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  demo: <Target className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
};

const sentimentColors: Record<string, string> = {
  positive: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
  neutral: 'border-gray-300 bg-gray-50 dark:bg-gray-800',
  negative: 'border-red-400 bg-red-50 dark:bg-red-900/20',
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { data: customer, isLoading, isError } = useQuery<any>({
    queryKey: ['customer', id],
    queryFn: () => customerApi.get(id!),
    enabled: !!id,
  });

  const { data: customerPitches } = useQuery<any>({
    queryKey: ['pitches', { customer: id }],
    queryFn: () => pitchApi.list({ customer: id }),
    enabled: !!id && activeTab === 'Pitches',
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500">Customer not found.</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
        >
          Back to customers
        </button>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const interactions = customer.interaction_history ?? [];
  const customer360 = customer.customer_360_data ?? {};
  const preferences = customer.preferences ?? {};
  const tags = customer.tags ?? [];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      {/* Customer Header */}
      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 text-xl font-bold text-white shadow-lg">
              {getInitials(customer.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {customer.company}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {customer.industry}
                </span>
                <StatusBadge status={customer.status} />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="w-48">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Lead Score</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {customer.lead_score ?? 0}/100
                </span>
              </div>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div
                  className={clsx(
                    'h-full rounded-full',
                    (customer.lead_score ?? 0) >= 80
                      ? 'bg-emerald-500'
                      : (customer.lead_score ?? 0) >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${customer.lead_score ?? 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/pitches/new?customer=${customer.id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Sparkles className="h-4 w-4" />
                Generate Pitch
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Plus className="h-4 w-4" />
                Add Interaction
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Edit className="h-4 w-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'border-b-2 pb-3 text-sm font-medium transition',
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Contact Information
              </h3>
              <dl className="space-y-3 text-sm">
                {[
                  { label: 'Name', value: customer.name, icon: <User className="h-4 w-4" /> },
                  { label: 'Email', value: customer.email, icon: <Mail className="h-4 w-4" /> },
                  { label: 'Phone', value: customer.phone, icon: <Phone className="h-4 w-4" /> },
                  { label: 'Company', value: customer.company, icon: <Building2 className="h-4 w-4" /> },
                  { label: 'Industry', value: customer.industry, icon: <Target className="h-4 w-4" /> },
                  { label: 'Website', value: customer.website, icon: <Globe className="h-4 w-4" /> },
                  { label: 'Location', value: customer.location, icon: <MapPin className="h-4 w-4" /> },
                  { label: 'Company Size', value: customer.company_size },
                  { label: 'Annual Revenue', value: customer.annual_revenue },
                  { label: 'Job Title', value: customer.job_title },
                ].map(
                  (field) =>
                    field.value && (
                      <div key={field.label} className="flex items-start gap-3">
                        {field.icon && (
                          <span className="mt-0.5 text-gray-400">{field.icon}</span>
                        )}
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">{field.label}</dt>
                          <dd className="font-medium text-gray-900 dark:text-white">
                            {String(field.value)}
                          </dd>
                        </div>
                      </div>
                    )
                )}
              </dl>
            </Card>

            <div className="space-y-6">
              {/* Tags */}
              {tags.length > 0 && (
                <Card className="p-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Preferences */}
              {Object.keys(preferences).length > 0 && (
                <Card className="p-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Preferences
                  </h3>
                  <dl className="space-y-2 text-sm">
                    {Object.entries(preferences).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              {/* Pain Points & Needs */}
              {customer.pain_points && (
                <Card className="p-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Pain Points
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {customer.pain_points}
                  </p>
                </Card>
              )}

              {customer.needs && (
                <Card className="p-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    Needs
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{customer.needs}</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Interactions' && (
          <div>
            {interactions.length === 0 ? (
              <EmptyState
                title="No interactions recorded"
                description="Add interactions to track your engagement with this customer"
              />
            ) : (
              <div className="relative space-y-4">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                {interactions.map((interaction: any, idx: number) => (
                  <div key={idx} className="relative flex gap-4 pl-12">
                    <div
                      className={clsx(
                        'absolute left-4 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-900',
                        interaction.sentiment === 'positive'
                          ? 'border-emerald-400'
                          : interaction.sentiment === 'negative'
                          ? 'border-red-400'
                          : 'border-gray-300'
                      )}
                    >
                      <div
                        className={clsx(
                          'h-2 w-2 rounded-full',
                          interaction.sentiment === 'positive'
                            ? 'bg-emerald-400'
                            : interaction.sentiment === 'negative'
                            ? 'bg-red-400'
                            : 'bg-gray-400'
                        )}
                      />
                    </div>
                    <Card
                      className={clsx(
                        'flex-1 border-l-4 p-4',
                        sentimentColors[interaction.sentiment ?? 'neutral']
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">
                            {interactionIcons[interaction.type] ?? (
                              <MessageSquare className="h-4 w-4" />
                            )}
                          </span>
                          <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                            {interaction.type}
                          </span>
                          {interaction.sentiment && (
                            <span
                              className={clsx(
                                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                                interaction.sentiment === 'positive'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : interaction.sentiment === 'negative'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              )}
                            >
                              {interaction.sentiment}
                            </span>
                          )}
                        </div>
                        {interaction.date && (
                          <span className="text-xs text-gray-400">
                            {format(new Date(interaction.date), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                      {interaction.summary && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          {interaction.summary}
                        </p>
                      )}
                      {interaction.notes && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {interaction.notes}
                        </p>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Pitches' && (
          <div>
            {!customerPitches?.results?.length ? (
              <EmptyState
                title="No pitches generated"
                description="Generate a pitch for this customer"
              />
            ) : (
              <div className="space-y-4">
                {customerPitches.results.map((pitch: Pitch) => (
                  <Card
                    key={pitch.id}
                    className="cursor-pointer p-5 transition hover:shadow-md"
                    onClick={() => navigate(`/pitches/${pitch.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {pitch.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                          {pitch.content?.substring(0, 200)}...
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                          <span className="capitalize">{pitch.pitch_type}</span>
                          <span>v{pitch.version ?? 1}</span>
                          <span>{format(new Date(pitch.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <StatusBadge status={pitch.status} />
                        {pitch.overall_score != null && (
                          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                            {(pitch.overall_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === '360\u00B0 View' && (
          <div>
            {Object.keys(customer360).length === 0 ? (
              <EmptyState
                title="No 360\u00B0 data available"
                description="Customer 360 data will be populated by the AI agents"
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(customer360).map(([section, data]) => (
                  <Card key={section} className="overflow-hidden">
                    <button
                      onClick={() => toggleSection(section)}
                      className="flex w-full items-center justify-between p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <h3 className="text-sm font-semibold capitalize text-gray-900 dark:text-white">
                        {section.replace(/_/g, ' ')}
                      </h3>
                      {expandedSections[section] ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSections[section] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-gray-100 p-5 dark:border-gray-800"
                      >
                        <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">
                          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
