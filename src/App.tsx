import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { AdminDashboard, UserManagement } from './pages/AdminPages';
import { ReceptionDashboard, CustomersPage, JobsPage, AssignJobsPage, PartsRequestPage } from './pages/ReceptionPages';
import { InventoryPage } from './pages/InventoryPage';
import { BillingPage } from './pages/BillingPage';
import { EngineerDashboard, MyJobsPage } from './pages/EngineersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';

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
      default:              return <div className="p-8 text-slate-500">Page not found</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="ml-64 flex-1 p-8 max-w-full overflow-x-hidden">
        {renderPage()}
      </main>
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