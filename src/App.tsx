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
import { 
  LayoutDashboard, Users, BarChart3, LineChart, 
  UserSquare2, Wrench, Pin, Nut, Box, 
  Wallet, ClipboardList, Bell, ChevronRight, Search 
} from 'lucide-react';

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'User Management', analytics: 'Analytics',
  reports: 'Reports', customers: 'Customers', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  billing: 'Billing', 'my-jobs': 'My Jobs', notifications: 'Notifications',
};

const PAGE_ICONS: Record<string, any> = {
  dashboard: LayoutDashboard, users: Users, analytics: BarChart3, reports: LineChart,
  customers: UserSquare2, jobs: Wrench, assign: Pin, parts: Nut,
  inventory: Box, billing: Wallet, 'my-jobs': ClipboardList, notifications: Bell,
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
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="ml-[260px] flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-[60px] bg-white border-b border-gray-200 flex items-center px-8 gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <IconComponent size={20} className="text-gray-500" />
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-gray-500 font-medium">FixHub</span>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="font-semibold text-gray-900">{PAGE_LABELS[activePage] ?? activePage}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="h-8 px-3 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-2 text-[11px] text-gray-600 font-medium uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              System Online
            </div>
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-8 overflow-x-hidden">
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
