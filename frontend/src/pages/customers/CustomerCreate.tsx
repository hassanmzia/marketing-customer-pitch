import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Loader2,
  UserPlus,
} from 'lucide-react';
import clsx from 'clsx';

import { customerApi } from '@/services/api';
import Card from '@/components/common/Card';

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

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup' },
  { value: 'smb', label: 'Small & Medium Business' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'enterprise', label: 'Enterprise' },
];

const STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'customer', label: 'Customer' },
];

interface FormData {
  name: string;
  company: string;
  industry: string;
  company_size: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  status: string;
}

export default function CustomerCreate() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      company_size: 'smb',
      status: 'prospect',
      industry: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<FormData>) => customerApi.create(data),
    onSuccess: (result: any) => {
      toast.success('Customer created!');
      navigate(`/customers/${result.id}`);
    },
    onError: (error: any) =>
      toast.error(error?.message ?? 'Failed to create customer'),
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Customer
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a new customer or prospect
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto max-w-3xl space-y-6"
      >
        {/* Basic Info */}
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name *
              </label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="John Smith"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company *
              </label>
              <input
                {...register('company', { required: 'Company is required' })}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Acme Corp"
              />
              {errors.company && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.company.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Industry *
              </label>
              <select
                {...register('industry', { required: 'Industry is required' })}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              {errors.industry && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.industry.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Company Size
              </label>
              <select
                {...register('company_size')}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                {COMPANY_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:w-1/2"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="john@acme.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <input
                {...register('phone')}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Website
            </label>
            <input
              {...register('website')}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="https://acme.com"
            />
          </div>
        </Card>

        {/* Description */}
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Additional Details
          </h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Notes about this customer, their needs, pain points..."
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Create Customer
          </button>
        </div>
      </form>
    </motion.div>
  );
}
