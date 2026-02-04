import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/store';
import Sidebar from './Sidebar';
import Header from './Header';
import clsx from 'clsx';

const Layout: React.FC = () => {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div
        className={clsx(
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'ml-[68px]' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
