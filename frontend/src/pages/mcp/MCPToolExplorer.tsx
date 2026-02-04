import React from 'react';
import Card from '@/components/common/Card';
import { Wrench } from 'lucide-react';

const MCPToolExplorer: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Tools</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Explore and execute Model Context Protocol tools
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-pitch-blue-100 dark:bg-pitch-blue-900/20 mb-4">
          <Wrench size={28} className="text-pitch-blue-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          MCP Tool Explorer
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
          Full MCP tool explorer coming in Part 2
        </p>
      </Card>
    </div>
  );
};

export default MCPToolExplorer;
