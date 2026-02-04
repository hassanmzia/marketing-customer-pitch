import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Wrench,
  Play,
  ChevronDown,
  ChevronRight,
  Code,
  Clock,
  Loader2,
  Copy,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

import { mcpApi } from '@/services/api';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

interface ToolParam {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

interface MCPTool {
  name: string;
  description: string;
  parameters?: ToolParam[] | Record<string, any>;
}

export default function MCPToolExplorer() {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  const { data: tools, isLoading } = useQuery<any>({
    queryKey: ['mcp-tools'],
    queryFn: () => mcpApi.listTools(),
  });

  const executeMutation = useMutation({
    mutationFn: ({ tool, params }: { tool: string; params: Record<string, any> }) =>
      mcpApi.executeTool({ tool_name: tool, arguments: params }),
    onSuccess: (data: any) => {
      setResult(data);
      setExecutionHistory((prev) => [
        { tool: selectedTool, params: { ...paramValues }, result: data, timestamp: new Date().toISOString() },
        ...prev,
      ].slice(0, 20));
      toast.success('Tool executed successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message ?? 'Execution failed');
      setResult({ error: error?.message ?? 'Execution failed' });
    },
  });

  const toolList: MCPTool[] = tools?.tools ?? tools?.results ?? tools ?? [];

  const getToolParams = (tool: MCPTool): ToolParam[] => {
    if (Array.isArray(tool.parameters)) return tool.parameters;
    if (tool.parameters && typeof tool.parameters === 'object') {
      const props = (tool.parameters as any).properties ?? tool.parameters;
      const required = (tool.parameters as any).required ?? [];
      return Object.entries(props).map(([name, schema]: [string, any]) => ({
        name,
        type: schema?.type ?? 'string',
        description: schema?.description,
        required: required.includes(name),
        default: schema?.default,
      }));
    }
    return [];
  };

  const handleExecute = () => {
    if (!selectedTool) return;
    const parsedParams: Record<string, any> = {};
    Object.entries(paramValues).forEach(([key, value]) => {
      if (value) {
        try { parsedParams[key] = JSON.parse(value); } catch { parsedParams[key] = value; }
      }
    });
    executeMutation.mutate({ tool: selectedTool, params: parsedParams });
  };

  const handleSelectTool = (toolName: string) => {
    setSelectedTool(toolName);
    setParamValues({});
    setResult(null);
    const tool = toolList.find((t) => t.name === toolName);
    if (tool) {
      const defaults: Record<string, string> = {};
      getToolParams(tool).forEach((p) => {
        if (p.default != null) defaults[p.name] = String(p.default);
      });
      setParamValues(defaults);
    }
  };

  const selectedToolObj = toolList.find((t) => t.name === selectedTool);

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Tools</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Explore and execute Model Context Protocol tools</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tool List */}
        <div className="space-y-3 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Available Tools</h2>
          {isLoading ? (
            <LoadingSpinner />
          ) : toolList.length === 0 ? (
            <EmptyState title="No tools" description="No MCP tools available" />
          ) : (
            <div className="space-y-2">
              {toolList.map((tool) => (
                <Card key={tool.name} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
                    className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{tool.name}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{tool.description}</p>
                    </div>
                    {expandedTool === tool.name ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </button>

                  <AnimatePresence>
                    {expandedTool === tool.name && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-gray-100 dark:border-gray-800">
                        <div className="p-3 space-y-2">
                          <p className="text-xs text-gray-600 dark:text-gray-300">{tool.description}</p>
                          {getToolParams(tool).length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium uppercase text-gray-400">Parameters</p>
                              {getToolParams(tool).map((p) => (
                                <div key={p.name} className="mt-1 text-xs">
                                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{p.name}</span>
                                  <span className="text-gray-400"> ({p.type})</span>
                                  {p.required && <span className="text-red-400">*</span>}
                                  {p.description && <p className="text-gray-500">{p.description}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => handleSelectTool(tool.name)}
                            className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
                          >
                            Use This Tool
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tool Executor & Results */}
        <div className="space-y-4 lg:col-span-2">
          {/* Executor */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tool Executor</h2>
            {!selectedTool ? (
              <p className="py-8 text-center text-sm text-gray-400">Select a tool from the list to execute</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-indigo-600" />
                  <span className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400">{selectedTool}</span>
                </div>

                {selectedToolObj && getToolParams(selectedToolObj).map((param) => (
                  <div key={param.name}>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {param.name}
                      {param.required && <span className="text-red-400">*</span>}
                      <span className="text-gray-400">({param.type})</span>
                    </label>
                    {param.type === 'object' || param.type === 'array' ? (
                      <textarea
                        value={paramValues[param.name] ?? ''}
                        onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                        rows={3}
                        placeholder={param.description ?? `Enter ${param.type}...`}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    ) : (
                      <input
                        type={param.type === 'number' || param.type === 'integer' ? 'number' : 'text'}
                        value={paramValues[param.name] ?? ''}
                        onChange={(e) => setParamValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                        placeholder={param.description ?? `Enter ${param.name}...`}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={handleExecute}
                  disabled={executeMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {executeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Execute
                </button>
              </div>
            )}
          </Card>

          {/* Results */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Result</h3>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); toast.success('Copied!'); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </Card>
            </motion.div>
          )}

          {/* Execution History */}
          {executionHistory.length > 0 && (
            <Card className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Execution History</h3>
                <button onClick={() => setExecutionHistory([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              </div>
              <div className="space-y-2">
                {executionHistory.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                    <Clock className="h-3 w-3 flex-shrink-0 text-gray-400" />
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{entry.tool}</span>
                    <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                    <button
                      onClick={() => {
                        setSelectedTool(entry.tool);
                        setParamValues(entry.params);
                        setResult(entry.result);
                      }}
                      className="ml-auto text-[10px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      Replay
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
