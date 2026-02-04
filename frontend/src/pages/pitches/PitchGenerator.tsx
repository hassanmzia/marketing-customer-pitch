import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { customerApi, pitchApi, mcpApi } from '@/services/api';
import { Customer, Pitch, PitchTemplate, PitchScore } from '@/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Wand2,
  BarChart3,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Send,
  Download,
  ThumbsUp,
  MessageSquare,
  Copy,
  FileText,
  Zap,
  Target,
  Mail,
  Search,
  Plus,
  Check,
  ChevronDown,
  Clock,
  Building2,
  User,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ScoreDisplay from '@/components/common/ScoreDisplay';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PitchConfig {
  type: string;
  tone: string;
  templateId: string;
  context: string;
}

const PITCH_TYPES = [
  {
    value: 'initial',
    label: 'Initial Pitch',
    description: 'First contact sales pitch',
    icon: FileText,
  },
  {
    value: 'follow_up',
    label: 'Follow-up',
    description: 'Follow up on previous contact',
    icon: Mail,
  },
  {
    value: 'product_demo',
    label: 'Product Demo',
    description: 'Product demonstration pitch',
    icon: Zap,
  },
  {
    value: 'renewal',
    label: 'Renewal',
    description: 'Renewal/retention pitch',
    icon: RefreshCw,
  },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'consultative', label: 'Consultative' },
];

const QUICK_FEEDBACK = [
  'More concise',
  'More persuasive',
  'Add urgency',
  'Softer tone',
  'Add data points',
  'Stronger CTA',
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Media',
  'Energy',
  'Other',
];

// ─── Animation Variants ─────────────────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// ─── Step Indicator ─────────────────────────────────────────────────────────

const StepIndicator: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { label: 'Select Customer', icon: Users },
    { label: 'Configure Pitch', icon: Sparkles },
    { label: 'Review & Refine', icon: Wand2 },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const StepIcon = step.icon;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check size={18} />
                ) : (
                  <StepIcon size={18} />
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mx-2 mb-6 transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const PitchGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Core wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pitchConfig, setPitchConfig] = useState<PitchConfig>({
    type: 'initial',
    tone: 'professional',
    templateId: '',
    context: '',
  });
  const [generatedPitch, setGeneratedPitch] = useState<Pitch | null>(null);
  const [scores, setScores] = useState<PitchScore | null>(null);

  // Step 1 state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: '',
    company: '',
    industry: '',
    description: '',
  });

  // Step 3 state
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [showRefinement, setShowRefinement] = useState(false);
  const [abVariants, setAbVariants] = useState<any[] | null>(null);
  const [subjectLines, setSubjectLines] = useState<any[] | null>(null);
  const [followupSequence, setFollowupSequence] = useState<any[] | null>(null);
  const [refinedPitch, setRefinedPitch] = useState<Pitch | null>(null);
  const [versionHistory, setVersionHistory] = useState<Pitch[]>([]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: customersData, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () =>
      customerSearch
        ? customerApi.search(customerSearch)
        : customerApi.list({ page_size: 50 }),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['pitch-templates'],
    queryFn: () => pitchApi.getTemplates(),
  });

  const customers = customersData?.results ?? [];
  const templates = templatesData?.results ?? [];

  // Pre-select customer from URL params
  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId && customers.length > 0) {
      const found = customers.find((c) => c.id === customerId);
      if (found && !selectedCustomer) {
        setSelectedCustomer(found);
      }
    }
  }, [searchParams, customers, selectedCustomer]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: () =>
      pitchApi.generate({
        customer_id: selectedCustomer!.id,
        pitch_type: pitchConfig.type,
        tone: pitchConfig.tone,
        template_id: pitchConfig.templateId || undefined,
        additional_context: pitchConfig.context || undefined,
      }),
    onSuccess: (data) => {
      setGeneratedPitch(data);
      toast.success('Pitch generated successfully!');
      goToStep(2);
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to generate pitch');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: () => pitchApi.score(generatedPitch!.id),
    onSuccess: (data) => {
      setScores(data);
      toast.success('Pitch scored!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to score pitch');
    },
  });

  const refineMutation = useMutation({
    mutationFn: (feedback: string) =>
      pitchApi.refine(generatedPitch!.id, feedback),
    onSuccess: (data) => {
      setRefinedPitch(data);
      setVersionHistory((prev) => [generatedPitch!, ...prev]);
      toast.success('Pitch refined successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to refine pitch');
    },
  });

  const abVariantsMutation = useMutation({
    mutationFn: () =>
      mcpApi.executeTool({
        tool_name: 'pitch_ab_variants',
        arguments: { pitch: generatedPitch!.content },
      }),
    onSuccess: (data) => {
      const result = data.result as any;
      setAbVariants(
        Array.isArray(result) ? result : result?.variants ?? [result]
      );
      toast.success('A/B variants generated!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to generate variants');
    },
  });

  const subjectLinesMutation = useMutation({
    mutationFn: () =>
      mcpApi.executeTool({
        tool_name: 'generate_subject_line',
        arguments: { pitch: generatedPitch!.content },
      }),
    onSuccess: (data) => {
      const result = data.result as any;
      setSubjectLines(
        Array.isArray(result)
          ? result
          : result?.subject_lines ?? [result]
      );
      toast.success('Subject lines generated!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to generate subject lines');
    },
  });

  const followupMutation = useMutation({
    mutationFn: () =>
      mcpApi.executeTool({
        tool_name: 'generate_followup_sequence',
        arguments: {
          pitch: generatedPitch!.content,
          customer_name:
            selectedCustomer!.name || selectedCustomer!.primary_contact_name,
        },
      }),
    onSuccess: (data) => {
      const result = data.result as any;
      setFollowupSequence(
        Array.isArray(result)
          ? result
          : result?.sequence ?? [result]
      );
      toast.success('Follow-up sequence generated!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to generate follow-up sequence');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      pitchApi.update(generatedPitch!.id, { status: 'approved' }),
    onSuccess: (data) => {
      setGeneratedPitch(data);
      toast.success('Pitch approved!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to approve pitch');
    },
  });

  const quickCreateMutation = useMutation({
    mutationFn: () =>
      customerApi.create({
        primary_contact_name: quickCustomer.name,
        company_name: quickCustomer.company,
        industry: quickCustomer.industry,
        notes: quickCustomer.description,
        lifecycle_stage: 'lead',
        engagement_score: 0,
        pain_points: [],
        current_solutions: [],
        tags: [],
        primary_contact_email: '',
      }),
    onSuccess: (data) => {
      setSelectedCustomer(data);
      setShowQuickCreate(false);
      toast.success('Customer created!');
    },
    onError: (error: any) => {
      toast.error(error?.detail || 'Failed to create customer');
    },
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const getCustomerDisplayName = (c: Customer) =>
    c.name || c.primary_contact_name || 'Unknown';

  const getCustomerCompany = (c: Customer) =>
    c.company || c.company_name || '';

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleExport = () => {
    if (!generatedPitch) return;
    const blob = new Blob([generatedPitch.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedPitch.title || 'pitch'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Pitch exported!');
  };

  const handleApplyRefinement = () => {
    if (!refinementFeedback.trim()) {
      toast.error('Please provide feedback for refinement');
      return;
    }
    refineMutation.mutate(refinementFeedback);
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      prospect: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      opportunity: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      customer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      churned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  // ─── Step 1: Select Customer ────────────────────────────────────────────────

  const renderStep1 = () => (
    <motion.div
      key="step1"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'tween', duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30">
          <Users size={20} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Step 1: Select Customer
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a customer to personalize the pitch for
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search customers by name, company, or industry..."
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Customer Grid */}
      {loadingCustomers ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" label="Loading customers..." />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>No customers found. Try a different search or create one below.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const isSelected = selectedCustomer?.id === customer.id;
            const displayName = getCustomerDisplayName(customer);
            const company = getCustomerCompany(customer);
            const leadScore = customer.lead_score ?? customer.engagement_score ?? 0;
            const status = customer.status || customer.lifecycle_stage || 'lead';

            return (
              <motion.div
                key={customer.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCustomer(customer)}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {displayName}
                    </h3>
                    {company && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Building2 size={12} />
                        {company}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {customer.industry && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {customer.industry}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${getStatusColor(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Lead Score</span>
                      <span className="font-medium">{leadScore}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(leadScore, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full rounded-full ${getLeadScoreColor(leadScore)}`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Selected Customer Summary */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-5">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                Selected Customer
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getCustomerDisplayName(selectedCustomer)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getCustomerCompany(selectedCustomer) || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Industry</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedCustomer.industry || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Stage</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {selectedCustomer.lifecycle_stage || selectedCustomer.status || '-'}
                  </p>
                </div>
                {selectedCustomer.primary_contact_email && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCustomer.primary_contact_email}
                    </p>
                  </div>
                )}
                {selectedCustomer.budget_range && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCustomer.budget_range}
                    </p>
                  </div>
                )}
                {selectedCustomer.decision_timeline && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Timeline</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedCustomer.decision_timeline}
                    </p>
                  </div>
                )}
                {selectedCustomer.pain_points &&
                  (Array.isArray(selectedCustomer.pain_points)
                    ? selectedCustomer.pain_points.length > 0
                    : selectedCustomer.pain_points) && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pain Points</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {Array.isArray(selectedCustomer.pain_points)
                          ? selectedCustomer.pain_points.join(', ')
                          : selectedCustomer.pain_points}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Create Customer */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowQuickCreate(!showQuickCreate)}
          className="flex items-center justify-between w-full px-5 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Plus size={16} />
            Quick Create Customer
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${
              showQuickCreate ? 'rotate-180' : ''
            }`}
          />
        </button>
        <AnimatePresence>
          {showQuickCreate && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 space-y-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={quickCustomer.name}
                      onChange={(e) =>
                        setQuickCustomer((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="John Smith"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={quickCustomer.company}
                      onChange={(e) =>
                        setQuickCustomer((prev) => ({ ...prev, company: e.target.value }))
                      }
                      placeholder="Acme Corp"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry
                  </label>
                  <select
                    value={quickCustomer.industry}
                    onChange={(e) =>
                      setQuickCustomer((prev) => ({ ...prev, industry: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    value={quickCustomer.description}
                    onChange={(e) =>
                      setQuickCustomer((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of the customer and their needs..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
                <button
                  onClick={() => quickCreateMutation.mutate()}
                  disabled={
                    !quickCustomer.name ||
                    !quickCustomer.company ||
                    quickCreateMutation.isPending
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {quickCreateMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create & Select
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next Step */}
      <div className="flex justify-end">
        <button
          onClick={() => goToStep(1)}
          disabled={!selectedCustomer}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          Next Step
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.div>
  );

  // ─── Step 2: Configure Pitch ────────────────────────────────────────────────

  const renderStep2 = () => (
    <motion.div
      key="step2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'tween', duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <Sparkles size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Step 2: Configure Your Pitch
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize how your pitch will be generated
            </p>
          </div>
        </div>
        <button
          onClick={() => goToStep(0)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
      </div>

      {/* Selected customer badge */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <User size={14} className="text-blue-500" />
        <span className="text-sm text-blue-900 dark:text-blue-200">
          Generating for:{' '}
          <strong>
            {getCustomerDisplayName(selectedCustomer!)} - {getCustomerCompany(selectedCustomer!)}
          </strong>
        </span>
      </div>

      {/* Pitch Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Pitch Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PITCH_TYPES.map((pt) => {
            const isActive = pitchConfig.type === pt.value;
            const Icon = pt.icon;
            return (
              <motion.button
                key={pt.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  setPitchConfig((prev) => ({ ...prev, type: pt.value }))
                }
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md shadow-purple-500/10'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
                    isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isActive
                        ? 'text-purple-900 dark:text-purple-200'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {pt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {pt.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Tone */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Tone
        </label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((tone) => {
            const isActive = pitchConfig.tone === tone.value;
            return (
              <button
                key={tone.value}
                onClick={() =>
                  setPitchConfig((prev) => ({ ...prev, tone: tone.value }))
                }
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tone.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Template (Optional)
        </label>
        <select
          value={pitchConfig.templateId}
          onChange={(e) =>
            setPitchConfig((prev) => ({ ...prev, templateId: e.target.value }))
          }
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
          <option value="">None - Generate from scratch</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
              {tpl.avg_score ? ` (avg score: ${Number(tpl.avg_score).toFixed(1)})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Additional Context */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Additional Context
        </label>
        <textarea
          value={pitchConfig.context}
          onChange={(e) =>
            setPitchConfig((prev) => ({ ...prev, context: e.target.value }))
          }
          placeholder="Add any specific context, products, or talking points..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
        />
      </div>

      {/* Generate Button */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => goToStep(0)}
          className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
        >
          {generateMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 size={18} />
              Generate Pitch
            </>
          )}
        </button>
      </div>

      {/* Generation loading overlay */}
      <AnimatePresence>
        {generateMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                  <Sparkles
                    size={24}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
                  />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Generating your pitch
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Our AI is crafting a personalized pitch for{' '}
                {getCustomerDisplayName(selectedCustomer!)}...
              </p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // ─── Step 3: Review & Refine ────────────────────────────────────────────────

  const renderStep3 = () => {
    if (!generatedPitch) return null;

    const displayContent = refinedPitch?.content ?? generatedPitch.content;
    // scores state is already in PitchScore format (0-10 scale) from score endpoint.
    // generatedPitch.scores is the raw JSON field (0-1 scale, flat values, may lack dimensions).
    const rawScores = generatedPitch.scores;
    const displayScores: PitchScore | null = scores ?? (rawScores && typeof rawScores === 'object' && Object.keys(rawScores).length > 0
      ? {
          persuasiveness: (rawScores.persuasiveness ?? 0) * 10,
          clarity: (rawScores.clarity ?? 0) * 10,
          relevance: (rawScores.relevance ?? 0) * 10,
          personalization: (rawScores.personalization ?? 0) * 10,
          call_to_action: (rawScores.call_to_action ?? 0) * 10,
          overall_score: ((rawScores.persuasiveness ?? 0) + (rawScores.clarity ?? 0) + (rawScores.relevance ?? 0) + (rawScores.personalization ?? 0) + (rawScores.call_to_action ?? 0)) / Math.max(Object.keys(rawScores).length, 1) * 10,
          feedback: '',
          suggestions: [],
        }
      : null);

    return (
      <motion.div
        key="step3"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'tween', duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
              <Wand2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Your AI-Generated Pitch
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {generatedPitch.title}
              </p>
            </div>
          </div>
          <button
            onClick={() => goToStep(1)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Config
          </button>
        </div>

        {/* Customer info card */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <User size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {getCustomerDisplayName(selectedCustomer!)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getCustomerCompany(selectedCustomer!)}
              {selectedCustomer!.industry ? ` - ${selectedCustomer!.industry}` : ''}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 capitalize">
              {generatedPitch.pitch_type}
            </span>
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 capitalize">
              {generatedPitch.tone}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pitch Content */}
            <motion.div
              variants={fadeUpVariant}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
              className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => handleCopyContent(displayContent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <div className="p-6 pt-12 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{displayContent}</ReactMarkdown>
              </div>
            </motion.div>

            {/* Scores */}
            <AnimatePresence>
              {displayScores && (
                <motion.div
                  variants={fadeUpVariant}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-blue-500" />
                    Pitch Score Analysis
                  </h3>
                  <ScoreDisplay scores={displayScores} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <motion.div
              variants={fadeUpVariant}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              <button
                onClick={() => scoreMutation.mutate()}
                disabled={scoreMutation.isPending}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all text-center"
              >
                {scoreMutation.isPending ? (
                  <RefreshCw size={20} className="text-blue-500 animate-spin" />
                ) : (
                  <BarChart3 size={20} className="text-blue-500" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Score Pitch
                </span>
              </button>

              <button
                onClick={() => setShowRefinement(!showRefinement)}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all text-center ${
                  showRefinement
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
                }`}
              >
                <RefreshCw size={20} className="text-purple-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Refine Pitch
                </span>
              </button>

              <button
                onClick={() => abVariantsMutation.mutate()}
                disabled={abVariantsMutation.isPending}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all text-center"
              >
                {abVariantsMutation.isPending ? (
                  <RefreshCw size={20} className="text-orange-500 animate-spin" />
                ) : (
                  <Target size={20} className="text-orange-500" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  A/B Variants
                </span>
              </button>

              <button
                onClick={() => subjectLinesMutation.mutate()}
                disabled={subjectLinesMutation.isPending}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all text-center"
              >
                {subjectLinesMutation.isPending ? (
                  <RefreshCw size={20} className="text-teal-500 animate-spin" />
                ) : (
                  <Mail size={20} className="text-teal-500" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Subject Lines
                </span>
              </button>

              <button
                onClick={() => followupMutation.mutate()}
                disabled={followupMutation.isPending}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all text-center"
              >
                {followupMutation.isPending ? (
                  <RefreshCw size={20} className="text-indigo-500 animate-spin" />
                ) : (
                  <Send size={20} className="text-indigo-500" />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Follow-up Seq.
                </span>
              </button>

              <button
                onClick={handleExport}
                className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md transition-all text-center"
              >
                <Download size={20} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Export
                </span>
              </button>

              <button
                onClick={() => approveMutation.mutate()}
                disabled={
                  approveMutation.isPending ||
                  generatedPitch.status === 'approved'
                }
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all text-center ${
                  generatedPitch.status === 'approved'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md'
                }`}
              >
                {approveMutation.isPending ? (
                  <RefreshCw size={20} className="text-green-500 animate-spin" />
                ) : (
                  <ThumbsUp
                    size={20}
                    className={
                      generatedPitch.status === 'approved'
                        ? 'text-green-600'
                        : 'text-green-500'
                    }
                  />
                )}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {generatedPitch.status === 'approved'
                    ? 'Approved'
                    : 'Approve'}
                </span>
              </button>
            </motion.div>

            {/* Refinement Panel */}
            <AnimatePresence>
              {showRefinement && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MessageSquare size={16} className="text-purple-500" />
                      Refine Your Pitch
                    </h3>
                    <textarea
                      value={refinementFeedback}
                      onChange={(e) => setRefinementFeedback(e.target.value)}
                      placeholder="Describe how you'd like the pitch improved..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {QUICK_FEEDBACK.map((chip) => (
                        <button
                          key={chip}
                          onClick={() =>
                            setRefinementFeedback((prev) =>
                              prev ? `${prev}, ${chip.toLowerCase()}` : chip
                            )
                          }
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleApplyRefinement}
                      disabled={refineMutation.isPending || !refinementFeedback.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {refineMutation.isPending ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Refining...
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          Apply Refinement
                        </>
                      )}
                    </button>

                    {/* Side-by-side comparison */}
                    {refinedPitch && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                            Original
                          </p>
                          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto prose prose-sm dark:prose-invert">
                            <ReactMarkdown>{generatedPitch.content}</ReactMarkdown>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wider">
                            Refined
                          </p>
                          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 text-sm text-gray-700 dark:text-gray-300 max-h-64 overflow-y-auto prose prose-sm dark:prose-invert">
                            <ReactMarkdown>{refinedPitch.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* A/B Variants Section */}
            <AnimatePresence>
              {abVariants && (
                <motion.div
                  variants={fadeUpVariant}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Target size={16} className="text-orange-500" />
                    A/B Variants
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {abVariants.map((variant, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                            Variant {String.fromCharCode(65 + index)}
                          </span>
                          <button
                            onClick={() =>
                              handleCopyContent(
                                typeof variant === 'string'
                                  ? variant
                                  : variant.content || JSON.stringify(variant)
                              )
                            }
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>
                            {typeof variant === 'string'
                              ? variant
                              : variant.content || JSON.stringify(variant, null, 2)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subject Lines Section */}
            <AnimatePresence>
              {subjectLines && (
                <motion.div
                  variants={fadeUpVariant}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Mail size={16} className="text-teal-500" />
                    Subject Line Options
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
                    {subjectLines.map((line, index) => {
                      const text =
                        typeof line === 'string'
                          ? line
                          : line.subject_line || line.text || JSON.stringify(line);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between px-5 py-3 group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-teal-500 w-6">
                              {index + 1}.
                            </span>
                            <span className="text-sm text-gray-900 dark:text-white">
                              {text}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyContent(text)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Follow-up Sequence Section */}
            <AnimatePresence>
              {followupSequence && (
                <motion.div
                  variants={fadeUpVariant}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Send size={16} className="text-indigo-500" />
                    Follow-up Sequence
                  </h3>
                  <div className="space-y-0">
                    {followupSequence.map((item, index) => {
                      const day =
                        typeof item === 'object' ? item.day || index + 1 : index + 1;
                      const content =
                        typeof item === 'string'
                          ? item
                          : item.content || item.message || JSON.stringify(item);
                      const subject =
                        typeof item === 'object' ? item.subject : null;

                      return (
                        <div key={index} className="flex gap-4">
                          {/* Timeline indicator */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                              D{day}
                            </div>
                            {index < followupSequence.length - 1 && (
                              <div className="w-0.5 flex-1 bg-indigo-200 dark:bg-indigo-800 my-1" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 pb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
                              {subject && (
                                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                                  {subject}
                                </p>
                              )}
                              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                                <ReactMarkdown>{content}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Version History */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pitch Info
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {generatedPitch.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Version</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      v{generatedPitch.version}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {generatedPitch.pitch_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Tone</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {generatedPitch.tone}
                    </span>
                  </div>
                  {generatedPitch.generation_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Gen Time</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Number(generatedPitch.generation_time).toFixed(1)}s
                      </span>
                    </div>
                  )}
                  {generatedPitch.ai_model_used && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Model</span>
                      <span className="font-medium text-gray-900 dark:text-white text-xs">
                        {generatedPitch.ai_model_used}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Version History */}
              {versionHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} />
                    Version History
                  </h4>
                  <div className="space-y-2">
                    {versionHistory.map((version, index) => (
                      <button
                        key={version.id || index}
                        onClick={() => {
                          setGeneratedPitch(version);
                          setRefinedPitch(null);
                          setScores(null); // Let displayScores convert from generatedPitch.scores
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            v{version.version} - {version.pitch_type}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(version.updated_at || version.created_at).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="space-y-2">
                <button
                  onClick={() => generatedPitch.id && navigate(`/pitches/${generatedPitch.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FileText size={16} />
                  View Full Pitch Detail
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setDirection(-1);
                    setSelectedCustomer(null);
                    setGeneratedPitch(null);
                    setScores(null);
                    setRefinedPitch(null);
                    setAbVariants(null);
                    setSubjectLines(null);
                    setFollowupSequence(null);
                    setRefinementFeedback('');
                    setShowRefinement(false);
                    setVersionHistory([]);
                    setPitchConfig({
                      type: 'initial',
                      tone: 'professional',
                      templateId: '',
                      context: '',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/20"
                >
                  <Sparkles size={16} />
                  Generate New Pitch
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pitch Generator
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Generate AI-powered marketing pitches tailored to your customers
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}
      </AnimatePresence>
    </div>
  );
};

export default PitchGenerator;
