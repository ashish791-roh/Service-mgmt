'use client';

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LoginPage } from '../pages_components/LoginPage';
import { Sidebar } from '../components/Sidebar';
import { AdminDashboard, UserManagement } from '../pages_components/AdminPages';
import { ReceptionDashboard, CustomersPage, JobsPage, PartsRequestPage } from '../pages_components/ReceptionPages';
import { AssignJobsPage } from '../pages_components/AssignJobsPage';
import { InventoryPage } from '../pages_components/InventoryPage';
import { BillingPage } from '../pages_components/BillingPage';
import { EngineerDashboard, MyJobsPage } from '../pages_components/EngineersPage';
import { AnalyticsPage } from '../pages_components/AnalyticsPage';
import { NotificationsPage } from '../pages_components/NotificationsPage';
import { ReportsPage } from '../pages_components/ReportsPage';
import { SystemSettingsPage } from '../pages_components/SystemSettingsPage';
import { SalesPage } from '../pages_components/SalesPage';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'User Management', analytics: 'Analytics',
  reports: 'Reports', customers: 'Customers', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  sales: 'Sales', billing: 'Billing', 'my-jobs': 'My Jobs',
  notifications: 'Notifications', settings: 'System Settings',
};

const PAGE_ICONS: Record<string, string> = {
  dashboard: '⊞', users: '👥', analytics: '📊', reports: '📈',
  customers: '🧑‍💼', jobs: '🔧', assign: '📌', parts: '🔩',
  inventory: '📦', sales: '🛒', billing: '💰', 'my-jobs': '📋',
  notifications: '🔔', settings: '⚙️',
};

function AppContent() {
  const { currentUser, hydrated } = useApp();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Wait for session restore — prevents login page flash on refresh
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef0f6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        if (currentUser.role === 'admin') return <AdminDashboard onNavigate={setActivePage} />;
        if (currentUser.role === 'reception') return <ReceptionDashboard onNavigate={setActivePage} />;
        return <EngineerDashboard />;
      case 'users': return <UserManagement />;
      case 'customers': return <CustomersPage />;
      case 'jobs': return <JobsPage />;
      case 'my-jobs': return <MyJobsPage />;
      case 'assign': return <AssignJobsPage />;
      case 'parts': return <PartsRequestPage />;
      case 'inventory': return <InventoryPage />;
      case 'sales': return <SalesPage />;
      case 'billing': return <BillingPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'reports': return <ReportsPage />;
      case 'settings': return currentUser.role === 'admin' ? <SystemSettingsPage /> : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <span className="text-4xl mb-3">🔒</span>
          <p className="text-sm font-medium">Access denied</p>
        </div>
      );
      default: return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm font-medium">Page not found</p>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#eef0f6]">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="md:ml-[260px] flex-1 flex flex-col min-h-screen transition-all duration-300">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[60px] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 md:px-8 gap-3 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
          <button
            className="md:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setIsSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none hidden sm:block">{PAGE_ICONS[activePage] ?? '📄'}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium hidden sm:block">FixHub</span>
              <svg className="w-3 h-3 text-slate-300 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-slate-800" style={{ fontFamily: "'Syne', sans-serif" }}>
                {PAGE_LABELS[activePage] ?? activePage}
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 px-2 md:px-3 rounded-lg bg-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline">System Online</span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-4 md:p-7 overflow-x-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}