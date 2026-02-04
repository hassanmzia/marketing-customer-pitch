import React from 'react';
import Card from '@/components/common/Card';
import { Bot } from 'lucide-react';

const AgentDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agents</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor and manage your AI agent configurations and executions
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-pitch-purple-100 dark:bg-pitch-purple-900/20 mb-4">
          <Bot size={28} className="text-pitch-purple-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Agent Dashboard
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
          Full agent dashboard coming in Part 2
        </p>
      </Card>
    </div>
  );
};

export default AgentDashboard;
