import React from 'react';
import Card from '@/components/common/Card';
import { BarChart3 } from 'lucide-react';

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track performance metrics and gain insights from your marketing data
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-pitch-blue-100 dark:bg-pitch-blue-900/20 mb-4">
          <BarChart3 size={28} className="text-pitch-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Analytics Dashboard
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
          Full analytics dashboard coming in Part 2
        </p>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
