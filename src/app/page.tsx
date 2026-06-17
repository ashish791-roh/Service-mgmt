'use client';

import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LoginPage } from '../pages_components/LoginPage';
import { Sidebar } from '../components/Sidebar';
import { MobileLayout } from '../components/MobileLayout';
import { AdminDashboard, UserManagement, AuditLogPage } from '../pages_components/AdminPages';
import { ReceptionDashboard, JobsPage, PartsRequestPage, CustomersPage } from '../pages_components/ReceptionPages';
import { AssignJobsPage } from '../pages_components/AssignJobsPage';
import { InventoryPage } from '../pages_components/InventoryPage';
import { BillingPage } from '../pages_components/BillingPage';
import { EngineerDashboard, MyJobsPage } from '../pages_components/EngineersPage';
import { AnalyticsPage } from '../pages_components/AnalyticsPage';
import { NotificationsPage } from '../pages_components/NotificationsPage';
import { ReportsPage } from '../pages_components/ReportsPage';
import { SystemSettingsPage } from '../pages_components/SystemSettingsPage';
import { SalesPage } from '../pages_components/SalesPage';
import { TallyIntegrationPage } from '../pages_components/TallyIntegrationPage';
import { BranchesPage } from '../pages_components/BranchesPage';
import { Search, ChevronRight } from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'User Management', analytics: 'Analytics',
  reports: 'Reports', customers: 'Customers', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  sales: 'Sales', billing: 'Billing', tally: 'Tally Integration', 'my-jobs': 'My Jobs',
  notifications: 'Notifications', settings: 'System Settings',
  'audit-log': 'Audit Log', branches: 'Branch Management',
};

const PAGE_ICONS: Record<string, string> = {
  dashboard: '⊞', users: '👥', analytics: '📊', reports: '📈',
  jobs: '🔧', assign: '📌', parts: '🔩',
  inventory: '📦', sales: '🛒', billing: '💰', tally: '📇', 'my-jobs': '📋',
  notifications: '🔔', settings: '⚙️', 'audit-log': '🛡️', branches: '🌿',
};

function PageContent({ activePage, setActivePage }: { activePage: string; setActivePage: (p: string) => void }) {
  const { currentUser } = useApp();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isAdminOrReception = currentUser.role === 'admin' || currentUser.role === 'reception' || currentUser.role === 'super_admin';
  const isEngineer = currentUser.role === 'engineer' || currentUser.role === 'super_admin';

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <span className="text-4xl mb-3">🔒</span>
      <p className="text-sm font-medium">Access denied</p>
    </div>
  );

  switch (activePage) {
    case 'dashboard':
      if (isAdmin) return <AdminDashboard onNavigate={setActivePage} />;
      if (isAdminOrReception) return <ReceptionDashboard onNavigate={setActivePage} />;
      return <EngineerDashboard />;
    case 'users':       return isAdmin ? <UserManagement /> : <AccessDenied />;
    case 'customers':   return isAdminOrReception ? <CustomersPage /> : <AccessDenied />;
    case 'jobs':        return isAdminOrReception ? <JobsPage /> : <AccessDenied />;
    case 'my-jobs':     return isEngineer ? <MyJobsPage /> : <AccessDenied />;
    case 'assign':      return isAdminOrReception ? <AssignJobsPage /> : <AccessDenied />;
    case 'parts':       return isAdminOrReception ? <PartsRequestPage /> : <AccessDenied />;
    case 'inventory':   return isAdminOrReception ? <InventoryPage /> : <AccessDenied />;
    case 'sales':       return isAdminOrReception ? <SalesPage /> : <AccessDenied />;
    case 'billing':     return isAdminOrReception ? <BillingPage /> : <AccessDenied />;
    case 'analytics':   return isAdmin ? <AnalyticsPage /> : <AccessDenied />;
    case 'notifications': return <NotificationsPage />;
    case 'reports':     return isAdminOrReception ? <ReportsPage /> : <AccessDenied />;
    case 'settings':    return isAdmin ? <SystemSettingsPage /> : <AccessDenied />;
    case 'tally':       return isAdmin ? <TallyIntegrationPage /> : <AccessDenied />;
    case 'audit-log':   return isAdmin ? <AuditLogPage />       : <AccessDenied />;
    case 'branches':    return (isAdmin || currentUser?.role === 'super_admin') ? <BranchesPage /> : <AccessDenied />;
    default: return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <Search size={40} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">Page not found</p>
      </div>
    );
  }
}

const PAGE_STORAGE_KEY = 'fixhub_active_page';

function getInitialPage(): string {
  if (typeof window === 'undefined') return 'dashboard';

  const validPages = new Set(Object.keys(PAGE_LABELS));
  const hashPage = window.location.hash?.slice(1);
  if (hashPage && validPages.has(hashPage)) return hashPage;

  const searchParams = new URLSearchParams(window.location.search);
  const queryPage = searchParams.get('page');
  if (queryPage && validPages.has(queryPage)) return queryPage;

  const storedPage = localStorage.getItem(PAGE_STORAGE_KEY);
  if (storedPage && validPages.has(storedPage)) return storedPage;

  return 'dashboard';
}

function AppContent() {
  const { currentUser, hydrated } = useApp();
  const [activePage, setActivePage] = useState<string>(() => getInitialPage());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(PAGE_STORAGE_KEY, activePage);
      const newUrl = `${window.location.pathname}#${activePage}`;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // ignore storage or history errors in private mode
    }
  }, [activePage]);

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

  const content = <PageContent activePage={activePage} setActivePage={setActivePage} />;

  return (
    <>
      {/* Mobile layout (< md) */}
      <div className="md:hidden">
        <MobileLayout activePage={activePage} onNavigate={setActivePage}>
          {content}
        </MobileLayout>
      </div>

      {/* Desktop layout (>= md) */}
      <div className="hidden md:flex min-h-screen bg-[#eef0f6]">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        <div className="md:ml-[260px] flex-1 flex flex-col min-h-screen transition-all duration-300">
          <header className="sticky top-0 z-20 h-[60px] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-4 md:px-8 gap-3 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2.5">
              <span className="text-base leading-none">{PAGE_ICONS[activePage] ?? 'icon'}</span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 font-medium">FixHub</span>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="font-semibold text-slate-800">
                  {PAGE_LABELS[activePage] ?? activePage}
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="h-8 px-3 rounded-lg bg-slate-100 flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>System Online</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-7 overflow-x-hidden">
            {content}
          </main>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return <AppContent />;
}