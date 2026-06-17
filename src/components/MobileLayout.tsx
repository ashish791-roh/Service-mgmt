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
    if (item.id === 'branches' && !isHQ) return false;
    if (currentUser.role === 'super_admin') return true;
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
    <div className="flex flex-col min-h-screen bg-[#eef0f6]">
      {/* ── Compact Top Bar ── */}
      <header className="sticky top-0 z-20 h-[52px] bg-white border-b border-gray-200/80 flex items-center px-4 gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
            <ToolIcon size={14} className="text-white" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-medium text-gray-400 shrink-0">FixHub</span>
            <ChevronRight size={11} className="text-gray-300 shrink-0" />
            <span className="text-[14px] font-semibold text-gray-900 truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
              {PAGE_LABELS[activePage] ?? activePage}
            </span>
          </div>
        </div>

        {/* Notification bell + unread badge */}
        <button
          onClick={() => handleNavigate('notifications')}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-teal-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Avatar / profile tap */}
        <button
          onClick={openDrawer}
          className={`w-8 h-8 rounded-lg ${roleInfo.bg} flex items-center justify-center text-white text-[13px] font-semibold shrink-0`}
          aria-label="Open menu"
        >
          {currentUser.name.charAt(0)}
        </button>
      </header>

      {/* ── Page Content (padded bottom for tab bar) ── */}
      <main className="flex-1 overflow-x-hidden px-3 py-4 pb-[80px]">
        {children}
      </main>

      {/* ── Bottom Tab Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch" style={{ height: '60px' }}>
          {tabItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const isNotif = item.id === 'notifications';
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all"
                aria-label={item.label}
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                  isActive ? 'bg-teal-50' : ''
                }`}>
                  <Icon size={19} className={isActive ? 'text-teal-600' : 'text-gray-400'} strokeWidth={isActive ? 2.2 : 1.8} />
                  {isNotif && unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-teal-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-medium tracking-wide ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                  {item.shortLabel}
                </span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal-500 rounded-b-full" />
                )}
              </button>
            );
          })}

          {/* More button */}
          {moreItems.length > 0 && (
            <button
              onClick={openDrawer}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              aria-label="More navigation"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-xl">
                <Menu size={19} className="text-gray-400" strokeWidth={1.8} />
              </div>
              <span className="text-[9px] font-medium text-gray-400 tracking-wide">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* ── Slide-up Drawer (More menu + profile) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${drawerVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={closeDrawer}
          />

          {/* Sheet */}
          <div
            ref={drawerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${drawerVisible ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight: '85vh', overflowY: 'auto' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* User profile strip */}
            <div className="px-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl ${roleInfo.bg} flex items-center justify-center text-white text-[16px] font-semibold`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900 truncate">{currentUser.name}</p>
                  <p className="text-[12px] text-gray-500">{roleInfo.label}</p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Branch Selector for HQ */}
            {isHQ && (
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Physical Branch</p>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 text-[13px] font-medium rounded-xl focus:ring-teal-500 focus:border-teal-500 p-2.5 focus:outline-none transition-colors shadow-sm"
                >
                  <option value="all">All Branches (HQ Consolidated)</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* More nav sections */}
            <div className="px-4 py-3">
              {SECTIONS.map(section => {
                const items = section.ids
                  .map(id => moreItems.find(f => f.id === id))
                  .filter(Boolean) as NavItem[];
                if (!items.length) return null;
                return (
                  <div key={section.label} className="mb-4">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-1.5">{section.label}</p>
                    <div className="space-y-0.5">
                      {items.map(item => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl text-[14px] font-medium transition-colors ${
                              isActive
                                ? 'bg-teal-50 text-teal-700'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              isActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <Icon size={18} />
                            </div>
                            <span className="flex-1 text-left">{item.label}</span>
                            {item.id === 'notifications' && unread > 0 && (
                              <span className="bg-teal-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">{unread}</span>
                            )}
                            <ChevronRight size={14} className="text-gray-300" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Logout */}
            <div className="px-4 pb-2 border-t border-gray-100 pt-3">
              <button
                onClick={() => { closeDrawer(); setTimeout(logout, 200); }}
                className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl text-[14px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <LogOut size={18} />
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