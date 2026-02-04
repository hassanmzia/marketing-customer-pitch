import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CustomerList = lazy(() => import('@/pages/customers/CustomerList'));
const CustomerDetail = lazy(() => import('@/pages/customers/CustomerDetail'));
const PitchList = lazy(() => import('@/pages/pitches/PitchList'));
const PitchGenerator = lazy(() => import('@/pages/pitches/PitchGenerator'));
const PitchDetail = lazy(() => import('@/pages/pitches/PitchDetail'));
const CampaignList = lazy(() => import('@/pages/campaigns/CampaignList'));
const CampaignDetail = lazy(() => import('@/pages/campaigns/CampaignDetail'));
const CampaignCreate = lazy(() => import('@/pages/campaigns/CampaignCreate'));
const AgentDashboard = lazy(() => import('@/pages/agents/AgentDashboard'));
const AnalyticsDashboard = lazy(() => import('@/pages/analytics/AnalyticsDashboard'));
const MCPToolExplorer = lazy(() => import('@/pages/mcp/MCPToolExplorer'));
const TemplateLibrary = lazy(() => import('@/pages/templates/TemplateLibrary'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" label="Loading..." />
  </div>
);

const App: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/pitches" element={<PitchList />} />
          <Route path="/pitches/new" element={<PitchGenerator />} />
          <Route path="/pitches/:id" element={<PitchDetail />} />
          <Route path="/campaigns" element={<CampaignList />} />
          <Route path="/campaigns/new" element={<CampaignCreate />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/agents" element={<AgentDashboard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/mcp-tools" element={<MCPToolExplorer />} />
          <Route path="/templates" element={<TemplateLibrary />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
