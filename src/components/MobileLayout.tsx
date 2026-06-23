import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { Role } from '../types';
import {
  LayoutDashboard, Users, BarChart3, LineChart,
  UserSquare2, Wrench, Pin, Nut, Box,
  Wallet, ClipboardList, Bell, LogOut, Wrench as ToolIcon,
  Settings, ShoppingCart, ChevronRight, X, Menu, GitBranch,
} from 'lucide-react';

interface NavItem { id: string; label: string; shortLabel: string; icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; roles: Role[]; }

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',       shortLabel: 'Home',    icon: LayoutDashboard,  roles: ['admin', 'reception', 'engineer'] },
  { id: 'users',         label: 'User Management', shortLabel: 'Users',   icon: Users,            roles: ['admin'] },
  { id: 'analytics',     label: 'Analytics',       shortLabel: 'Stats',   icon: BarChart3,        roles: ['admin'] },
  { id: 'reports',       label: 'Reports',         shortLabel: 'Reports', icon: LineChart,        roles: ['admin', 'reception'] },
  { id: 'customers',     label: 'Customers',       shortLabel: 'Clients', icon: UserSquare2,      roles: ['admin', 'reception'] },
  { id: 'jobs',          label: 'Jobs',            shortLabel: 'Jobs',    icon: Wrench,           roles: ['admin', 'reception'] },
  { id: 'assign',        label: 'Assign Jobs',     shortLabel: 'Assign',  icon: Pin,              roles: ['admin', 'reception'] },
  { id: 'parts',         label: 'Parts Requests',  shortLabel: 'Parts',   icon: Nut,              roles: ['admin', 'reception'] },
  { id: 'inventory',     label: 'Inventory',       shortLabel: 'Stock',   icon: Box,              roles: ['admin', 'reception'] },
  { id: 'sales',         label: 'Sales',           shortLabel: 'Sales',   icon: ShoppingCart,     roles: ['admin', 'reception'] },
  { id: 'billing',       label: 'Billing',         shortLabel: 'Billing', icon: Wallet,           roles: ['admin', 'reception'] },
  { id: 'branches',      label: 'Branch Management', shortLabel: 'Branches',icon: GitBranch,        roles: ['admin', 'super_admin'] },
  { id: 'my-jobs',       label: 'My Jobs',         shortLabel: 'My Jobs', icon: ClipboardList,    roles: ['engineer'] },
  { id: 'notifications', label: 'Notifications',   shortLabel: 'Alerts',  icon: Bell,             roles: ['admin', 'reception', 'engineer', 'super_admin'] },
  { id: 'settings',      label: 'System Settings', shortLabel: 'Settings',icon: Settings,         roles: ['admin'] },
];

// Which pages appear in the bottom tab bar (primary navigation, max 4 + "More")
const TAB_BAR_IDS: Record<Role, string[]> = {
  admin:     ['dashboard', 'jobs', 'analytics', 'notifications'],
  super_admin: ['dashboard', 'jobs', 'analytics', 'notifications'],
  reception: ['dashboard', 'jobs', 'customers', 'notifications'],
  engineer:  ['dashboard', 'my-jobs', 'notifications'],
};

interface MobileLayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', users: 'Users', analytics: 'Analytics',
  reports: 'Reports', customers: 'Customers', jobs: 'Jobs',
  assign: 'Assign Jobs', parts: 'Parts Requests', inventory: 'Inventory',
  sales: 'Sales', billing: 'Billing', 'my-jobs': 'My Jobs',
  notifications: 'Notifications', settings: 'Settings', branches: 'Branch Management',
};

const SECTIONS = [
  { label: 'Overview',    ids: ['dashboard', 'analytics', 'reports'] },
  { label: 'Operations',  ids: ['customers', 'jobs', 'assign', 'my-jobs', 'parts'] },
  { label: 'Management',  ids: ['users', 'inventory', 'sales', 'billing'] },
  { label: 'System',      ids: ['notifications', 'branches', 'settings'] },
];

export const MobileLayout: React.FC<MobileLayoutProps> = ({ activePage, onNavigate, children }) => {
  const { currentUser, logout, getUnreadCount, isHQ, branches, selectedBranchId, setSelectedBranchId } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number>(0);

  if (!currentUser) return null;

  const role = currentUser.role as Role;
  const unread = getUnreadCount(currentUser.id);
  const filtered = NAV_ITEMS.filter(item => {
    if (currentUser.role === 'super_admin') return true;
    if (item.id === 'branches' && !isHQ) return false;
    return item.roles.includes(role);
  });
  const tabIds = TAB_BAR_IDS[role] ?? ['dashboard', 'notifications'];
  const tabItems = tabIds.map(id => filtered.find(f => f.id === id)).filter(Boolean) as NavItem[];

  // Items NOT in tab bar → appear in "More" drawer
  const moreItems = filtered.filter(item => !tabIds.includes(item.id));

  const roleConfig: Record<string, { bg: string; label: string }> = {
    admin:     { bg: 'bg-amber-500', label: 'Administrator' },
    super_admin: { bg: 'bg-indigo-600', label: 'HQ Super Admin' },
    reception: { bg: 'bg-teal-500',  label: 'Reception' },
    engineer:  { bg: 'bg-cyan-500',  label: 'Engineer' },
  };
  const roleInfo = roleConfig[role] || { bg: 'bg-gray-500', label: role };

  const openDrawer = () => {
    setDrawerOpen(true);
    requestAnimationFrame(() => setDrawerVisible(true));
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
    setTimeout(() => setDrawerOpen(false), 300);
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    closeDrawer();
  };

  // Swipe-down-to-close on drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    currentYRef.current = dy;
    if (dy > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (currentYRef.current > 80) {
      closeDrawer();
    } else if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
    startYRef.current = null;
    currentYRef.current = 0;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] text-slate-800">
      {/* ── Premium Glassmorphic Top Bar ── */}
      <header className="sticky top-0 z-20 h-[56px] bg-white/85 backdrop-blur-md border-b border-slate-100/80 flex items-center justify-between px-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20">
            <ToolIcon size={15} className="text-white" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase shrink-0">FixHub</span>
            <ChevronRight size={10} className="text-slate-300 shrink-0" />
            <span className="text-[14px] font-bold text-slate-800 truncate" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
              {PAGE_LABELS[activePage] ?? activePage}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell + unread badge */}
          <button
            onClick={() => handleNavigate('notifications')}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 active:scale-95 transition-all duration-200"
            aria-label="Notifications"
          >
            <Bell size={18} className="transition-transform duration-200 hover:rotate-12" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-[0_2px_6px_rgba(20,184,166,0.4)] ring-2 ring-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Avatar / profile tap */}
          <button
            onClick={openDrawer}
            className={`w-8.5 h-8.5 rounded-xl ${roleInfo.bg} flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-sm ring-2 ring-white ring-offset-2 ring-offset-slate-100 hover:scale-105 active:scale-95 transition-all duration-200`}
            aria-label="Open menu"
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ── Page Content (padded bottom for tab bar) ── */}
      <main className="flex-1 overflow-x-hidden px-4 py-5 pb-[90px]">
        {children}
      </main>

      {/* ── Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch px-2" style={{ height: '62px' }}>
          {tabItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isNotif = item.id === 'notifications';
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative transition-all active:scale-95 duration-150"
                aria-label={item.label}
              >
                <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 text-teal-600' : 'text-slate-400 hover:text-slate-600'
                }`}>
                  <Icon size={19} className={isActive ? 'text-teal-600' : 'text-slate-400'} strokeWidth={isActive ? 2.3 : 1.8} />
                  {isNotif && unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 ring-1 ring-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <span className={`text-[9.5px] font-bold tracking-wide transition-colors ${isActive ? 'text-teal-600 font-semibold' : 'text-slate-400'}`}>
                  {item.shortLabel}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.75 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-b-full shadow-[0_1px_4px_rgba(20,184,166,0.4)]" />
                )}
              </button>
            );
          })}

          {/* More button */}
          {moreItems.length > 0 && (
            <button
              onClick={openDrawer}
              className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 duration-150"
              aria-label="More navigation"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600">
                <Menu size={19} strokeWidth={1.8} />
              </div>
              <span className="text-[9.5px] font-bold text-slate-400 tracking-wide">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Slide-up Drawer (More menu + profile) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-slate-900/60 backdrop-blur-[3px] transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeDrawer}
          />

          {/* Sheet */}
          <div
            ref={drawerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative bg-white/95 backdrop-blur-xl rounded-t-[32px] border border-slate-100 shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out ${drawerVisible ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight: '85vh', overflowY: 'auto' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* User profile strip */}
            <div className="px-5 pb-4 border-b border-slate-100/80">
              <div className="flex items-center gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <div className={`w-12 h-12 rounded-2xl ${roleInfo.bg} flex items-center justify-center text-white text-[16px] font-bold shadow-md shadow-slate-200`}>
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-slate-800 truncate leading-snug">{currentUser.name}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-200/65 text-slate-600">
                    {roleInfo.label}
                  </span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-8.5 h-8.5 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm active:scale-95 transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Branch Selector for HQ */}
            {isHQ && (
              <div className="mx-5 my-4 px-4 py-3 border.5 border-slate-100/80 bg-gradient-to-r from-teal-50/30 to-emerald-50/20 rounded-2xl">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-2">Physical Branch Context</p>
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-white border border-slate-200/80 text-slate-700 text-[13px] font-semibold rounded-xl focus:ring-teal-500 focus:border-teal-500 p-2.5 focus:outline-none appearance-none transition-all shadow-sm pr-9"
                  >
                    <option value="all">All Branches (HQ Consolidated)</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronRight size={13} className="rotate-90" />
                  </div>
                </div>
              </div>
            )}

            {/* More nav sections */}
            <div className="px-5 py-2 space-y-4">
              {SECTIONS.map(section => {
                const items = section.ids
                  .map(id => moreItems.find(f => f.id === id))
                  .filter(Boolean) as NavItem[];
                if (!items.length) return null;
                return (
                  <div key={section.label} className="space-y-1.5">
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest px-2">{section.label}</p>
                    <div className="space-y-1">
                      {items.map(item => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.99] ${
                              isActive
                                ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 text-teal-700 border-l-3 border-teal-500'
                                : 'text-slate-600 hover:bg-slate-50/80 border-l-3 border-transparent'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                              isActive ? 'bg-teal-100/60 text-teal-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <Icon size={17} />
                            </div>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.id === 'notifications' && unread > 0 && (
                              <span className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[9.5px] font-bold rounded-full px-2 py-0.5 shadow-sm">{unread}</span>
                            )}
                            <ChevronRight size={12} className={isActive ? 'text-teal-400' : 'text-slate-300'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Logout */}
            <div className="px-5 pb-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => { closeDrawer(); setTimeout(logout, 200); }}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[14px] font-bold text-rose-600 hover:bg-rose-50/60 transition-colors active:scale-[0.99]"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm">
                  <LogOut size={17} />
                </div>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};