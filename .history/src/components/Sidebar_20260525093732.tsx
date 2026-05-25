import React from 'react';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';
import {
  LayoutDashboard, Users, BarChart3, LineChart,
  UserSquare2, Wrench, Pin, Nut, Box,
  Wallet, ClipboardList, Bell, LogOut, Wrench as ToolIcon,
  Settings, Shield, ShoppingCart
} from 'lucide-react';

interface NavItem { id: string; label: string; icon: any; roles: Role[]; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'reception', 'engineer'] },
  { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { id: 'reports', label: 'Reports', icon: LineChart, roles: ['admin', 'reception'] },
  { id: 'customers', label: 'Customers', icon: UserSquare2, roles: ['admin', 'reception'] },
  { id: 'jobs', label: 'Jobs', icon: Wrench, roles: ['admin', 'reception'] },
  { id: 'assign', label: 'Assign Jobs', icon: Pin, roles: ['reception'] },
  { id: 'parts', label: 'Parts Requests', icon: Nut, roles: ['admin', 'reception'] },
  { id: 'inventory', label: 'Inventory', icon: Box, roles: ['admin', 'reception'] },
  { id: 'billing', label: 'Billing', icon: Wallet, roles: ['admin', 'reception'] },
  { id: 'my-jobs', label: 'My Jobs', icon: ClipboardList, roles: ['engineer'] },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'reception', 'engineer'] },
  { id: 'settings', label: 'System Settings', icon: Settings, roles: ['admin'] },
  { id: 'audit-log', label: 'Audit Log', icon: Shield, roles: ['admin'] },
];

const SECTIONS = [
  { label: 'Overview', ids: ['dashboard', 'analytics', 'reports'] },
  { label: 'Operations', ids: ['customers', 'jobs', 'assign', 'my-jobs', 'parts'] },
  { label: 'Management', ids: ['users', 'inventory', 'billing'] },
  { label: 'System', ids: ['notifications', 'settings', 'audit-log'] },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isOpen, setIsOpen }) => {
  const { currentUser, logout, getUnreadCount } = useApp();
  if (!currentUser) return null;

  const unread = getUnreadCount(currentUser.id);
  const filtered = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  const roleConfig: Record<string, { bgClass: string; label: string }> = {
    admin: { bgClass: 'bg-amber-500', label: 'Administrator' },
    reception: { bgClass: 'bg-teal-500', label: 'Reception' },
    engineer: { bgClass: 'bg-cyan-500', label: 'Engineer' },
  };
  const role = roleConfig[currentUser.role];

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsOpen?.(false)}
        />
      )}

      <aside className={`w-[260px] min-h-screen bg-gray-900 flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Subtle top indicator line */}
        <div className="h-0.5 bg-teal-500" />

        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center text-white shrink-0">
              <ToolIcon size={20} />
            </div>
            <div>
              <p className="font-semibold text-white text-[18px] leading-tight tracking-tight">FixHub</p>
              <p className="text-gray-400 text-[11px] font-medium mt-0.5 uppercase tracking-wide">Service Manager</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-6">
          {SECTIONS.map(section => {
            const items = section.ids
              .map(id => filtered.find(f => f.id === id))
              .filter(Boolean) as NavItem[];
            if (!items.length) return null;
            return (
              <div key={section.label}>
                <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500 select-none">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setIsOpen?.(false); // Close menu on mobile after selection
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors relative group ${isActive
                          ? 'bg-gray-800 text-teal-400'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] bg-teal-500 rounded-r-full" />
                        )}
                        <Icon size={18} className="shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {(item.id === 'notifications' || item.id === 'my-jobs') && unread > 0 && (
                          <span className="bg-teal-500 text-white text-[11px] rounded-md px-1.5 py-0.5 font-bold shrink-0">
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
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-800 mb-2">
            <div className={`w-8 h-8 rounded-md ${role.bgClass} flex items-center justify-center text-[13px] font-medium text-white shrink-0`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-medium truncate">{currentUser.name}</p>
              <p className="text-gray-400 text-[11px] font-medium mt-0.5 capitalize">{role.label}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-rose-500/10 hover:text-rose-400 text-[13px] font-medium transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};