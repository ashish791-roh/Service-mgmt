import { useState, useEffect } from 'react';
import { getSettings } from './pages_components/SystemSettingsPage';
import { AppProvider, useApp } from './context/AppContext';
import { useSLAWatcher } from './hooks/useSLAWatcher';
import { LoginPage } from './pages_components/LoginPage';
import { Sidebar } from './components/Sidebar';
import { lazy, Suspense } from 'react';

const AdminDashboard     = lazy(() => import('./pages_components/AdminPages').then(m => ({ default: m.AdminDashboard })));
const UserManagement     = lazy(() => import('./pages_components/AdminPages').then(m => ({ default: m.UserManagement })));
const AuditLogPage       = lazy(() => import('./pages_components/AdminPages').then(m => ({ default: m.AuditLogPage })));
const ReceptionDashboard = lazy(() => import('./pages_components/ReceptionPages').then(m => ({ default: m.ReceptionDashboard })));
const JobsPage           = lazy(() => import('./pages_components/ReceptionPages').then(m => ({ default: m.JobsPage })));
const PartsRequestPage   = lazy(() => import('./pages_components/ReceptionPages').then(m => ({ default: m.PartsRequestPage })));
const InventoryPage      = lazy(() => import('./pages_components/InventoryPage').then(m => ({ default: m.InventoryPage })));
const BillingPage        = lazy(() => import('./pages_components/BillingPage').then(m => ({ default: m.BillingPage })));
const SalesPage          = lazy(() => import('./pages_components/SalesPage').then(m => ({ default: m.SalesPage })));
const EngineerDashboard  = lazy(() => import('./pages_components/EngineersPage').then(m => ({ default: m.EngineerDashboard })));
const MyJobsPage         = lazy(() => import('./pages_components/EngineersPage').then(m => ({ default: m.MyJobsPage })));
const AnalyticsPage      = lazy(() => import('./pages_components/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const NotificationsPage  = lazy(() => import('./pages_components/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const AssignJobsPage     = lazy(() => import('./pages_components/AssignJobsPage').then(m => ({ default: m.AssignJobsPage })));
const ReportsPage        = lazy(() => import('./pages_components/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SystemSettingsPage = lazy(() => import('./pages_components/SystemSettingsPage').then(m => ({ default: m.SystemSettingsPage })));
const BranchesPage       = lazy(() => import('./pages_components/BranchesPage').then(m => ({ default: m.BranchesPage })));
import { 
  LayoutDashboard, Users, BarChart3, LineChart, 
  Wrench, Pin, Nut, Box, 
  Wallet, ClipboardList, Bell, ChevronRight, Search, Menu, Settings, ShoppingCart, Shield, AlertCircle, GitBranch
} from 'lucide-react';


const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'User Management', analytics: 'Analytics',
  reports: 'Reports', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  billing: 'Billing', sales: 'Sales', 'my-jobs': 'My Jobs', notifications: 'Notifications',
  settings: 'System Settings', branches: 'Branch Management',
};

const PAGE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard, users: Users, analytics: BarChart3, reports: LineChart,
  jobs: Wrench, assign: Pin, parts: Nut,
  inventory: Box, billing: Wallet, sales: ShoppingCart, 'my-jobs': ClipboardList, notifications: Bell,
  settings: Settings,
  'audit-log': Shield,
  branches: GitBranch,
};


function AppContent() {
  const { currentUser, hydrated, isLoading, error, retryLoad } = useApp();
  // ── SLA breach watcher — runs after login ─────────────────────
  useSLAWatcher();
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const applyTheme = () => {
      const { theme } = getSettings();
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };

    applyTheme(); // Run on mount

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    window.addEventListener('theme-change', applyTheme);

    return () => {
      mediaQuery.removeEventListener('change', applyTheme);
      window.removeEventListener('theme-change', applyTheme);
    };
  }, []);

  // Show spinner while session is being restored from localStorage/cookie.
  // This prevents the login page from flashing on every refresh.
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-gray-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white px-4">
        <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-800/80 border border-red-500/30 shadow-2xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Connection Failed</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => retryLoad()}
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold rounded-xl transition-all shadow-lg hover:shadow-teal-500/20 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (currentUser && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-800/50 backdrop-blur-md border border-slate-700/50 shadow-2xl max-w-sm w-full text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-teal-400 rounded-full animate-spin animate-duration-1000" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100 font-sans">Synchronizing Data</h3>
            <p className="text-xs text-teal-400 mt-1 animate-pulse font-sans">Connecting to database...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) return <LoginPage />;

  const isAdmin     = currentUser.role === 'admin';
  const isAdminOrReception = currentUser.role === 'admin' || currentUser.role === 'reception';
  const isEngineer  = currentUser.role === 'engineer';

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Search size={48} className="mb-4 opacity-50" />
      <p className="text-[13px] font-medium text-gray-500">Access denied</p>
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        if (isAdmin)            return <AdminDashboard onNavigate={setActivePage} />;
        if (isAdminOrReception) return <ReceptionDashboard onNavigate={setActivePage} />;
        return <EngineerDashboard />;
      case 'users':         return isAdmin            ? <UserManagement />     : <AccessDenied />;
      case 'analytics':     return isAdmin            ? <AnalyticsPage />      : <AccessDenied />;
      case 'reports':       return isAdminOrReception ? <ReportsPage />        : <AccessDenied />;
      case 'jobs':          return isAdminOrReception ? <JobsPage />           : <AccessDenied />;
      case 'assign':        return isAdminOrReception ? <AssignJobsPage />     : <AccessDenied />;
      case 'parts':         return isAdminOrReception ? <PartsRequestPage />   : <AccessDenied />;
      case 'inventory':     return isAdminOrReception ? <InventoryPage />      : <AccessDenied />;
      case 'billing':       return isAdminOrReception ? <BillingPage />        : <AccessDenied />;
      case 'sales':         return isAdminOrReception ? <SalesPage />          : <AccessDenied />;
      case 'my-jobs':       return isEngineer         ? <MyJobsPage />         : <AccessDenied />;
      case 'notifications': return <NotificationsPage />;
      case 'settings':      return isAdmin ? <SystemSettingsPage /> : <AccessDenied />;
      case 'audit-log':     return isAdmin ? <AuditLogPage />       : <AccessDenied />;
      case 'branches':      return (isAdmin || currentUser?.role === 'super_admin') ? <BranchesPage /> : <AccessDenied />;


      default:              return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Search size={48} className="mb-4 opacity-50" />
          <p className="text-[13px] font-medium text-gray-500">Page not found</p>
        </div>
      );
    }
  };

  const IconComponent = PAGE_ICONS[activePage] || LayoutDashboard;

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Sidebar activePage={activePage} onNavigate={setActivePage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="md:ml-[260px] flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[60px] bg-white border-b border-gray-200 flex items-center px-4 md:px-8 gap-4 shadow-sm">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <IconComponent size={20} className="text-gray-500 hidden sm:block" />
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-gray-500 font-medium hidden sm:block">FixHub</span>
              <ChevronRight size={14} className="text-gray-400 hidden sm:block" />
              <span className="font-semibold text-gray-900">{PAGE_LABELS[activePage] ?? activePage}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 px-3 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-2 text-[11px] text-gray-600 font-medium uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="hidden sm:inline">System Online</span>
              <span className="sm:hidden">Online</span>
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <Suspense fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
                  Loading…
                </div>
              }>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Wrap AppContent's imports and use motion
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}