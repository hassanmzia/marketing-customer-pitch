import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '@/store';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  FileText,
  PenTool,
  Library,
  Megaphone,
  Bot,
  BarChart3,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    title: 'Customers',
    items: [
      { label: 'Customer List', path: '/customers', icon: <Users size={20} /> },
    ],
  },
  {
    title: 'Pitches',
    items: [
      { label: 'Pitch List', path: '/pitches', icon: <FileText size={20} /> },
      { label: 'Generator', path: '/pitches/new', icon: <PenTool size={20} /> },
      { label: 'Templates', path: '/templates', icon: <Library size={20} /> },
    ],
  },
  {
    title: 'Campaigns',
    items: [
      { label: 'Campaigns', path: '/campaigns', icon: <Megaphone size={20} /> },
    ],
  },
  {
    title: 'AI & Tools',
    items: [
      { label: 'AI Agents', path: '/agents', icon: <Bot size={20} /> },
      { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
      { label: 'MCP Tools', path: '/mcp-tools', icon: <Wrench size={20} /> },
    ],
  },
];

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out',
        'bg-gray-900 border-r border-gray-800',
        sidebarCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-bg flex-shrink-0">
          <Sparkles size={20} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white truncate">AI Marketing</h1>
            <p className="text-[10px] text-gray-400 truncate">Pitch Assistant</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {!sidebarCollapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      clsx(
                        isActive ? 'sidebar-link-active' : 'sidebar-link',
                        sidebarCollapsed && 'justify-center px-0'
                      )
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="flex-shrink-0 border-t border-gray-800 p-3">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full h-9 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
