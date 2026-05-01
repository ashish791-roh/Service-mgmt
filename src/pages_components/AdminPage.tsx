import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

/* ─────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────── */
const WrenchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const ZapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────────────────────── */
const Counter: React.FC<{ target: number; prefix?: string; suffix?: string; duration?: number }> = ({
  target, prefix = '', suffix = '', duration = 1400,
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{prefix}{count}{suffix}</>;
};

/* ─────────────────────────────────────────────────────────────
   FLOATING ORBS
───────────────────────────────────────────────────────────── */
const FloatingOrb: React.FC<{ size: number; x: string; y: string; color: string; delay: number; duration: number }> = ({
  size, x, y, color, delay, duration,
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, left: x, top: y, background: color, filter: 'blur(60px)', zIndex: 0 }}
    animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

/* ─────────────────────────────────────────────────────────────
   DASHBOARD STAT CARD
───────────────────────────────────────────────────────────── */
const StatCard: React.FC<{
  title: string; value: number; prefix?: string; suffix?: string; 
  icon: React.ReactNode; accent: string; trend: string; delay: number;
}> = ({ title, value, prefix, suffix, icon, accent, trend, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      padding: '24px',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column', gap: 16
    }}
  >
    <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${accent}15, transparent 70%)` }} />
    
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${accent}15`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        {icon}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 20,
        background: 'rgba(34,197,94,0.1)', color: '#22c55e',
        fontSize: 12, fontWeight: 600
      }}>
        <ArrowUpIcon /> {trend}
      </div>
    </div>
    
    <div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
        <Counter target={value} prefix={prefix} suffix={suffix} duration={1200 + delay * 500} />
      </div>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   RECENT ACTIVITY ITEM
───────────────────────────────────────────────────────────── */
const ActivityItem: React.FC<{
  title: string; time: string; status: string; type: 'success' | 'warning' | 'info'; delay: number;
}> = ({ title, time, status, type, delay }) => {
  const colors = {
    success: '#10b981', warning: '#fbbf24', info: '#6366f1'
  };
  const bgColors = {
    success: 'rgba(16,185,129,0.15)', warning: 'rgba(251,191,36,0.15)', info: 'rgba(99,102,241,0.15)'
  };
  const Icon = type === 'success' ? CheckCircleIcon : type === 'warning' ? ClockIcon : ActivityIcon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: bgColors[type], color: colors[type],
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'white', fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500 }}>{time}</div>
      </div>
      <div style={{
        padding: '4px 10px', borderRadius: 6,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em'
      }}>
        {status}
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   USER MANAGEMENT VIEW
───────────────────────────────────────────────────────────── */
const UserManagementView: React.FC = () => {
  const { users, addUser, toggleUserActive } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'engineer' });

  const handleAdd = () => {
    if (!form.name || !form.email || !form.password) return;
    addUser({ ...form, active: true, joinedAt: new Date().toISOString().split('T')[0] } as any);
    setShowModal(false);
    setForm({ name: '', email: '', password: '', role: 'engineer' });
  };

  const roleColors: Record<string, { bg: string, text: string, border: string }> = {
    admin: { bg: 'rgba(244,63,94,0.1)', text: '#f43f5e', border: 'rgba(244,63,94,0.2)' },
    reception: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', border: 'rgba(16,185,129,0.2)' },
    engineer: { bg: 'rgba(14,165,233,0.1)', text: '#0ea5e9', border: 'rgba(14,165,233,0.2)' },
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            User Management
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, fontWeight: 500 }}>
            {users.length} team members total.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
            color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.3)', fontFamily: 'inherit'
          }}
        >
          <PlusIcon /> Add User
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, backdropFilter: 'blur(12px)', overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const rColor = roleColors[user.role] || roleColors.engineer;
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700
                        }}>
                          {user.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                        background: rColor.bg, color: rColor.text, border: `1px solid ${rColor.border}`
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{user.email}</td>
                    <td style={{ padding: '16px 24px', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                        background: user.active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        color: user.active ? '#10b981' : 'rgba(255,255,255,0.4)',
                        border: `1px solid ${user.active ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'}`
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: user.active ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <button
                        onClick={() => toggleUserActive(user.id)}
                        style={{
                          background: user.active ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                          border: `1px solid ${user.active ? 'rgba(244,63,94,0.2)' : 'rgba(16,185,129,0.2)'}`,
                          color: user.active ? '#f43f5e' : '#10b981',
                          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)'
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420, padding: 32,
                background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 20
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0 }}>Add New User</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', fontFamily: 'inherit' }} placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', fontFamily: 'inherit' }} placeholder="email@fixhub.com" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', fontFamily: 'inherit' }} placeholder="Minimum 6 characters" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="engineer" style={{ background: '#0f172a' }}>Engineer</option>
                    <option value="reception" style={{ background: '#0f172a' }}>Reception/Manager</option>
                    <option value="admin" style={{ background: '#0f172a' }}>Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleAdd} style={{ flex: 1, padding: '12px', background: '#6366f1', border: 'none', borderRadius: 12, color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Create User</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MANAGER DASHBOARD VIEW
───────────────────────────────────────────────────────────── */
const ManagerDashboardView: React.FC = () => {
  const { jobs, customers, partRequests } = useApp();
  const pendingParts = partRequests.filter(r => r.status === 'Pending');
  const unassigned = jobs.filter(j => !j.assignedEngineerId);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Manager Dashboard
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, fontWeight: 500 }}>
          Manage daily operations, assign jobs, and review requests.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatCard title="Total Jobs" value={jobs.length} icon={<BriefcaseIcon />} accent="#3b82f6" trend="+3.2%" delay={0.1} />
        <StatCard title="Unassigned" value={unassigned.length} icon={<ActivityIcon />} accent="#ef4444" trend="Needs Action" delay={0.2} />
        <StatCard title="In Progress" value={jobs.filter(j => j.status === 'In Progress').length} icon={<ZapIcon />} accent="#f59e0b" trend="Active" delay={0.3} />
        <StatCard title="Total Customers" value={customers.length} icon={<UsersIcon />} accent="#10b981" trend="+5.0%" delay={0.4} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {unassigned.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              style={{
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)'
              }}
            >
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}><ActivityIcon /></span>
                Jobs Needing Assignment ({unassigned.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {unassigned.slice(0, 3).map((job, i) => {
                  const customer = customers.find(c => c.id === job.customerId);
                  return (
                    <motion.div key={job.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i*0.1 }}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>{customer?.name}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{job.problemDescription.substring(0, 50)}...</div>
                      </div>
                      <button style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Assign
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white' }}>Recent Jobs</h4>
              <button style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>View All</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <tbody>
                {jobs.slice(0, 5).map((job) => {
                  const customer = customers.find(c => c.id === job.customerId);
                  return (
                    <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '16px 0', width: 40, color: 'rgba(255,255,255,0.4)' }}><BriefcaseIcon /></td>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 2 }}>{customer?.name}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{job.problemDescription.substring(0, 40)}</div>
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{job.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {pendingParts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
              style={{
                background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)'
              }}
            >
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '6px', background: 'rgba(245,158,11,0.1)', borderRadius: 8 }}><SettingsIcon /></span>
                Pending Parts ({pendingParts.length})
              </h4>
              <button style={{ width: '100%', padding: '12px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Review Requests
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}
            style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)'
            }}
          >
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: 'white' }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, color: 'white', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ padding: '8px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: 8 }}><PlusIcon /></div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>New Job Registration</span>
              </button>
              <button style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, color: 'white', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ padding: '8px', background: 'rgba(16,185,129,0.1)', color: '#34d399', borderRadius: 8 }}><UsersIcon /></div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Customer Directory</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ADMIN DASHBOARD PAGE
───────────────────────────────────────────────────────────── */
export const AdminPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  
  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ambient glow tracking
  useEffect(() => {
    const fn = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: <DashboardIcon /> },
    { name: 'Manager', icon: <ActivityIcon /> },
    { name: 'Jobs', icon: <BriefcaseIcon /> },
    { name: 'Engineers', icon: <UsersIcon /> },
    { name: 'Customers', icon: <UsersIcon /> },
    { name: 'Reports', icon: <FileTextIcon /> },
    { name: 'Settings', icon: <SettingsIcon /> },
  ];

  const quickActions = [
    { title: 'New Job', icon: <PlusIcon />, color: '#6366f1' },
    { title: 'Assign Tech', icon: <UsersIcon />, color: '#10b981' },
    { title: 'Generate Invoice', icon: <FileTextIcon />, color: '#fbbf24' },
  ];

  return (
    <div
      className="min-h-screen flex text-white overflow-hidden"
      style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes fh-grid-x { 0%{transform:translateX(0)} 100%{transform:translateX(40px)} }
        @keyframes fh-grid-y { 0%{transform:translateY(0)} 100%{transform:translateY(40px)} }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* ══════════════════════════════════════════════
          BACKGROUND
      ══════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'linear-gradient(152deg, #060c1a 0%, #0b1325 50%, #0f172a 100%)', zIndex: 0 }}>
        <div className="absolute inset-0" style={{ opacity: 0.035 }}>
          <div style={{
            position: 'absolute', inset: '-40px',
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: 'fh-grid-y 8s linear infinite',
          }} />
          <div style={{
            position: 'absolute', inset: '-40px',
            backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: 'fh-grid-x 8s linear infinite',
          }} />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at ${20 + mousePos.x * 25}% ${30 + mousePos.y * 30}%, rgba(99,102,241,0.15) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at ${70 + mousePos.x * 15}% ${65 + mousePos.y * 18}%, rgba(251,191,36,0.08) 0%, transparent 60%)
            `,
            transition: 'background 2s ease',
          }}
        />
        <FloatingOrb size={400} x="-10%"  y="-5%"  color="rgba(99,102,241,0.05)"  delay={0}   duration={8} />
        <FloatingOrb size={300} x="70%"   y="60%"  color="rgba(139,92,246,0.05)"  delay={2}   duration={10} />
      </div>

      {/* ══════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════ */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 260 : 80,
          opacity: 1
        }}
        className="flex-shrink-0 z-20 flex flex-col hidden sm:flex"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Brand */}
        <div style={{ height: 80, display: 'flex', alignItems: 'center', padding: sidebarOpen ? '0 24px' : '0 16px', justifyContent: sidebarOpen ? 'flex-start' : 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <motion.div layout style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #b45309 0%, #d97706 40%, #fbbf24 100%)',
            boxShadow: '0 0 0 1px rgba(251,191,36,0.25), 0 8px 24px rgba(180,83,9,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#0c0e18' }}><WrenchIcon /></span>
          </motion.div>
          
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10, display: 'none' }}
                transition={{ duration: 0.2 }}
                style={{ marginLeft: 14, whiteSpace: 'nowrap' }}
              >
                <h1 style={{ color: 'white', fontSize: 18, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>FixHub</h1>
                <p style={{ color: 'rgba(253,230,138,0.5)', fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '2px 0 0' }}>
                  Workspace
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-6 flex flex-col gap-2 custom-scrollbar" style={{ padding: sidebarOpen ? '24px 16px' : '24px 12px', overflowY: 'auto' }}>
          <p style={{ 
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', 
            letterSpacing: '0.1em', textTransform: 'uppercase', 
            padding: sidebarOpen ? '0 12px' : '0', textAlign: sidebarOpen ? 'left' : 'center',
            marginBottom: 8, display: sidebarOpen ? 'block' : 'none'
          }}>
            Main Menu
          </p>
          
          {menuItems.map((item) => {
            const isActive = activeMenu === item.name;
            return (
              <motion.button
                key={item.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveMenu(item.name)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  padding: sidebarOpen ? '12px 16px' : '14px 0',
                  borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {isActive && (
                  <motion.div layoutId="activeMenu" style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 20, borderRadius: '0 4px 4px 0',
                    background: '#818cf8', boxShadow: '0 0 10px #818cf8'
                  }} />
                )}
                <div style={{ color: isActive ? '#818cf8' : 'inherit', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </div>
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0, display: 'none' }}
                      style={{ marginLeft: 14, fontSize: 14, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* User Profile */}
        <div style={{ padding: '20px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center',
            padding: sidebarOpen ? '10px' : '0', borderRadius: 14,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white'
            }}>
              A
            </div>
            {sidebarOpen && (
              <div style={{ marginLeft: 12, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap' }}>Admin User</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>admin@fixhub.com</div>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        
        {/* Navbar */}
        <header style={{
          height: 80, padding: '0 32px',
          background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            >
              <MenuIcon />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
              {activeMenu}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Search */}
            <div className="hidden md:flex" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
                <SearchIcon />
              </div>
              <input 
                type="text" placeholder="Search jobs, customers..." 
                style={{
                  width: 240, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 100, padding: '9px 16px 9px 38px', color: 'white', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s'
                }}
              />
            </div>

            {/* Notifications */}
            <button style={{ 
              position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', 
              borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <BellIcon />
              <div style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            </button>
          </div>
        </header>

        {/* Dashboard Content scrollable area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '32px' }}>
          <AnimatePresence mode="wait">
            {activeMenu === 'Dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: '0 auto' }}>
                
                {/* Welcome text */}
                <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 32 }}
            >
              <h3 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Welcome back, Admin
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, fontWeight: 500 }}>
                Here is what's happening with your service operations today.
              </p>
            </motion.div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 32 }}>
              <StatCard title="Total Revenue" value={42580} prefix="$" icon={<DollarIcon />} accent="#10b981" trend="+12.5%" delay={0.1} />
              <StatCard title="Active Jobs" value={142} icon={<BriefcaseIcon />} accent="#6366f1" trend="+5.2%" delay={0.2} />
              <StatCard title="Engineers Online" value={24} icon={<UsersIcon />} accent="#fbbf24" trend="+2.1%" delay={0.3} />
              <StatCard title="Customer Rating" value={4.8} suffix="/5" icon={<StarIcon />} accent="#ec4899" trend="+0.4%" delay={0.4} />
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
              
              {/* Left Column (Chart Placeholder & Activity) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Chart Area */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)',
                    minHeight: 320, display: 'flex', flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'white' }}>Revenue Overview</h4>
                    <select style={{ 
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                      color: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: 8, outline: 'none', fontSize: 12
                    }}>
                      <option>This Week</option>
                      <option>This Month</option>
                      <option>This Year</option>
                    </select>
                  </div>
                  {/* Abstract Chart Graphic */}
                  <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '4%', padding: '20px 0 0' }}>
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <motion.div 
                          initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.7 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                          style={{ 
                            width: '100%', borderRadius: '6px 6px 0 0', 
                            background: `linear-gradient(180deg, rgba(99,102,241,${h/100}) 0%, rgba(99,102,241,0.1) 100%)`,
                            border: '1px solid rgba(99,102,241,0.3)', borderBottom: 'none'
                          }} 
                        />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)'
                  }}
                >
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: 'white' }}>Recent Activity</h4>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <ActivityItem title="Job #4092 Completed" time="10 mins ago" status="Done" type="success" delay={0.7} />
                    <ActivityItem title="New Job assigned to Mike" time="45 mins ago" status="Assigned" type="info" delay={0.8} />
                    <ActivityItem title="Payment pending for #4088" time="2 hours ago" status="Pending" type="warning" delay={0.9} />
                    <ActivityItem title="Inventory alert: Spare Parts" time="5 hours ago" status="Low Stock" type="warning" delay={1.0} />
                  </div>
                  <button style={{ 
                    width: '100%', marginTop: 20, padding: '12px', background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', 
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                  }} className="hover:bg-white/10 hover:text-white">
                    View All Activity
                  </button>
                </motion.div>
              </div>

              {/* Right Column (Quick Actions & Info) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24, padding: 28, backdropFilter: 'blur(12px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                  }}
                >
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 20px', color: 'white' }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {quickActions.map((action, i) => (
                      <motion.button
                        key={action.title}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          width: '100%', padding: '14px 16px', borderRadius: 16,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                          color: 'white', cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'inherit'
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${action.color}20`, color: action.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {action.icon}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{action.title}</span>
                        <div style={{ color: 'rgba(255,255,255,0.2)' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* System Status Mini Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)', 
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 24, padding: 24, position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ZapIcon />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>System Status</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>All services operational</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                    <motion.div animate={{ scale: [1,1.5,1], opacity: [0.5,1,0.5] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', letterSpacing: '0.05em' }}>ONLINE</span>
                  </div>
                </motion.div>

              </div>
            </div>

              </motion.div>
            )}
            
            {activeMenu === 'Engineers' && (
              <motion.div key="engineers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <UserManagementView />
              </motion.div>
            )}
            
            {activeMenu === 'Manager' && (
              <motion.div key="manager" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <ManagerDashboardView />
              </motion.div>
            )}
            
            {/* Add placeholders for other menus if needed */}
            {activeMenu !== 'Dashboard' && activeMenu !== 'Engineers' && activeMenu !== 'Manager' && (
              <motion.div key="other" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: '0 auto' }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{activeMenu}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>This section is currently under construction.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
