import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './pages_components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard, UserManagement } from './pages_components/AdminPages';
import { ReceptionDashboard, CustomersPage, JobsPage, AssignJobsPage, PartsRequestPage } from './pages_components/ReceptionPages';
import { InventoryPage } from './pages_components/InventoryPage';
import { BillingPage } from './pages_components/BillingPage';
import { EngineerDashboard, MyJobsPage } from './pages_components/EngineersPage';
import { AnalyticsPage } from './pages_components/AnalyticsPage';
import { NotificationsPage } from './pages_components/NotificationsPage';
import { ReportsPage } from './pages_components/ReportsPage';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'User Management', analytics: 'Analytics',
  reports: 'Reports', customers: 'Customers', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  billing: 'Billing', 'my-jobs': 'My Jobs', notifications: 'Notifications',
};

const PAGE_ICONS: Record<string, string> = {
  dashboard: '⊞', users: '👥', analytics: '📊', reports: '📈',
  customers: '🧑‍💼', jobs: '🔧', assign: '📌', parts: '🔩',
  inventory: '📦', billing: '💰', 'my-jobs': '📋', notifications: '🔔',
};

function AppContent() {
  const { currentUser } = useApp();
  const [activePage, setActivePage] = useState<string>('dashboard');

  if (!currentUser) return <LoginPage />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        if (currentUser.role === 'admin') return <AdminDashboard onNavigate={setActivePage} />;
        if (currentUser.role === 'reception') return <ReceptionDashboard onNavigate={setActivePage} />;
        return <EngineerDashboard />;
      case 'users':         return <UserManagement />;
      case 'customers':     return <CustomersPage />;
      case 'jobs':          return <JobsPage />;
      case 'my-jobs':       return <MyJobsPage />;
      case 'assign':        return <AssignJobsPage />;
      case 'parts':         return <PartsRequestPage />;
      case 'inventory':     return <InventoryPage />;
      case 'billing':       return <BillingPage />;
      case 'analytics':     return <AnalyticsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'reports':       return <ReportsPage />;
      default:              return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm font-medium">Page not found</p>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(152deg, #060c1a 0%, #0b1325 50%, #0f172a 100%)' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="ml-[260px] flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[60px] bg-slate-900/50 backdrop-blur-xl border-b border-white/10 flex items-center px-8 gap-4 shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2.5">
            <span className="text-base">{PAGE_ICONS[activePage] ?? '📄'}</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium">FixHub</span>
              <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-semibold text-slate-200 font-display">{PAGE_LABELS[activePage] ?? activePage}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 px-3 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center gap-2 text-xs text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Online
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-7 animate-fade-in overflow-x-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
