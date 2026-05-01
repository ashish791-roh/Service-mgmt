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

const SECTIONS = [
  { label: 'Overview',    ids: ['dashboard', 'analytics', 'reports'] },
  { label: 'Operations',  ids: ['customers', 'jobs', 'assign', 'my-jobs', 'parts'] },
  { label: 'Management',  ids: ['users', 'inventory', 'billing'] },
  { label: 'System',      ids: ['notifications'] },
];

interface SidebarProps { activePage: string; onNavigate: (page: string) => void; }

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { currentUser, logout, getUnreadCount } = useApp();
  if (!currentUser) return null;

  const unread = getUnreadCount(currentUser.id);
  const filtered = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const roleConfig: Record<string, { gradient: string; label: string; ring: string }> = {
    admin:     { gradient: 'from-rose-500 to-pink-600',    label: 'Administrator', ring: 'ring-rose-500/20' },
    reception: { gradient: 'from-emerald-500 to-teal-600', label: 'Reception',     ring: 'ring-emerald-500/20' },
    engineer:  { gradient: 'from-sky-500 to-blue-600',     label: 'Engineer',      ring: 'ring-sky-500/20' },
  };
  const role = roleConfig[currentUser.role];

  return (
    <aside className="w-[260px] min-h-screen bg-[#0f172a] flex flex-col fixed left-0 top-0 bottom-0 z-30"
      style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}>

      {/* Subtle top gradient line */}
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-900/50 shrink-0 ring-2 ring-indigo-400/20">
            🔧
          </div>
          <div>
            <p className="font-display font-bold text-white text-base leading-tight tracking-tight">FixHub</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Service Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
        {SECTIONS.map(section => {
          const items = section.ids
            .map(id => filtered.find(f => f.id === id))
            .filter(Boolean) as NavItem[];
          if (!items.length) return null;
          return (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 select-none">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-indigo-500/15 text-indigo-300'
                          : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-200'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-indigo-400 rounded-r-full" />
                      )}
                      <span className={`text-base w-5 text-center shrink-0 transition-transform duration-150 ${!isActive ? 'group-hover:scale-110' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left font-display font-semibold text-[13px]">{item.label}</span>
                      {(item.id === 'notifications' || item.id === 'my-jobs') && unread > 0 && (
                        <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1 shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/[0.05]">
        <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.04] ring-1 ${role.ring} mb-2`}>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md font-display`}>
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate leading-tight font-display">{currentUser.name}</p>
            <p className="text-slate-500 text-[11px] font-medium mt-0.5 capitalize">{role.label}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:bg-red-500/10 hover:text-red-400 text-xs font-medium transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
};
