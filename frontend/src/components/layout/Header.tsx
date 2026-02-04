import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import clsx from 'clsx';
import {
  Search,
  Sun,
  Moon,
  Bell,
  User,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/pitches': 'Pitches',
  '/pitches/new': 'Pitch Generator',
  '/templates': 'Template Library',
  '/campaigns': 'Campaigns',
  '/campaigns/new': 'Create Campaign',
  '/agents': 'AI Agents',
  '/analytics': 'Analytics',
  '/mcp-tools': 'MCP Tools',
};

const Header: React.FC = () => {
  const location = useLocation();
  const {
    darkMode,
    toggleDarkMode,
    notifications,
    markNotificationRead,
    clearNotifications,
    searchQuery,
    setSearchQuery,
  } = useAppStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Derive page title from route
  const pageTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/customers/') ? 'Customer Details' :
    location.pathname.startsWith('/pitches/') ? 'Pitch Details' :
    location.pathname.startsWith('/campaigns/') ? 'Campaign Details' :
    'Page');

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      {/* Left - Page Title */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {pageTitle}
        </h2>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-pitch-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl animate-fade-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-pitch-blue-500 hover:text-pitch-blue-600"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className={clsx(
                        'w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                        !notif.read && 'bg-pitch-blue-50/50 dark:bg-pitch-blue-900/10'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-pitch-blue-500 flex-shrink-0" />
                        )}
                        <div className={clsx(!notif.read ? '' : 'pl-4')}>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-pitch-blue-500 to-pitch-purple-500 cursor-pointer">
          <User size={16} className="text-white" />
        </div>
      </div>
    </header>
  );
};

export default Header;
