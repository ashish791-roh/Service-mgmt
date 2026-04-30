import React from 'react';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';

interface NavItem { id: string; label: string; icon: string; roles: Role[]; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',       icon: '⊞',  roles: ['admin', 'reception', 'engineer'] },
  { id: 'users',         label: 'User Management', icon: '👥',  roles: ['admin'] },
  { id: 'analytics',     label: 'Analytics',       icon: '📊',  roles: ['admin'] },
  { id: 'reports',       label: 'Reports',         icon: '📈',  roles: ['admin', 'reception'] },
  { id: 'customers',     label: 'Customers',       icon: '🧑‍💼', roles: ['admin', 'reception'] },
  { id: 'jobs',          label: 'Jobs',            icon: '🔧',  roles: ['admin', 'reception'] },
  { id: 'assign',        label: 'Assign Jobs',     icon: '📌',  roles: ['reception'] },
  { id: 'parts',         label: 'Parts Requests',  icon: '🔩',  roles: ['admin', 'reception'] },
  { id: 'inventory',     label: 'Inventory',       icon: '📦',  roles: ['admin', 'reception'] },
  { id: 'billing',       label: 'Billing',         icon: '💰',  roles: ['admin', 'reception'] },
  { id: 'my-jobs',       label: 'My Jobs',         icon: '📋',  roles: ['engineer'] },
  { id: 'notifications', label: 'Notifications',   icon: '🔔',  roles: ['admin', 'reception', 'engineer'] },
];

interface SidebarProps { activePage: string; onNavigate: (page: string) => void; }

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { currentUser, logout, getUnreadCount } = useApp();
  if (!currentUser) return null;

  const unread = getUnreadCount(currentUser.id);
  const filtered = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const roleColor: Record<string, string> = {
    admin: 'bg-red-500',
    reception: 'bg-emerald-500',
    engineer: 'bg-blue-500',
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 flex flex-col fixed left-0 top-0 bottom-0 z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-lg">🔧</div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">FixHub</p>
            <p className="text-slate-400 text-xs">Service Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filtered.map(item => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {(item.id === 'notifications' || item.id === 'my-jobs') && unread > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold text-white">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{currentUser.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${roleColor[currentUser.role]}`} />
              <span className="text-slate-400 text-xs capitalize">{currentUser.role}</span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 text-sm font-medium transition-all"
        >
          <span>⎋</span> Sign out
        </button>
      </div>
    </aside>
  );
};