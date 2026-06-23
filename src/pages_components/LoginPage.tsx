import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

/* ─────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────── */
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const WrenchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const GitBranchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER (supports decimals)
───────────────────────────────────────────────────────────── */
const Counter: React.FC<{ target: number; suffix?: string; duration?: number; decimals?: number }> = ({
  target, suffix = '', duration = 1400, decimals = 0,
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{count.toFixed(decimals)}{suffix}</>;
};

/* ─────────────────────────────────────────────────────────────
   STAT CARD (left panel) — premium light card style
───────────────────────────────────────────────────────────── */
const StatCard: React.FC<{
  icon: React.ReactNode; value: number; suffix?: string;
  label: string; iconColor: string; iconBg: string; delay: number;
  decimals?: number;
}> = ({ icon, value, suffix, label, iconColor, iconBg, delay, decimals = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, y: -2, borderColor: '#cbd5e1', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
    transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '16px 20px',
      background: 'white',
      border: '1px solid #e8edf2',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      cursor: 'pointer',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: iconBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: iconColor,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ color: '#111827', fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
        <Counter target={value} suffix={suffix ?? ''} duration={1000 + delay * 500} decimals={decimals} />
      </div>
      <div style={{ color: '#9ca3af', fontSize: 12.5, fontWeight: 500, marginTop: 4 }}>
        {label}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: delay * 0.5 }}
        style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }}
      />
      <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>LIVE</span>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   FEATURE ITEM (right panel) - premium micro-card
───────────────────────────────────────────────────────────── */
const FeatureItem: React.FC<{ text: string; delay: number }> = ({ text, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2, scale: 1.02, borderColor: '#cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      boxShadow: '0 2px 6px rgba(0,0,0,0.015)',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      cursor: 'default',
    }}
  >
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(13,148,136,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#0d9488',
    }}>
      <CheckCircleIcon />
    </div>
    <span style={{ color: '#334155', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{text}</span>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────────────────────────── */
export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only restore the email (never the password)
    const savedEmail = localStorage.getItem('fixhub_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
    setTimeout(() => emailRef.current?.focus(), 400);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in both fields.'); return; }
    setError(''); setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Invalid credentials — please try again.');
      return;
    }
    // Only remember the email, never the password
    if (remember) localStorage.setItem('fixhub_remembered_email', email.trim());
    else localStorage.removeItem('fixhub_remembered_email');
    setLoginSuccess(true);
  };

  const features = [
    'Cross-branch job & performance visibility',
    'Centralized settings & config management',
    'Unified billing, parts & inventory overview',
    'Engineer & branch access control',
  ];

  return (
    <div
      className="min-h-screen flex items-stretch overflow-hidden"
      style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: '#f9fafb' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fh-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; }
        input::-webkit-input-placeholder { color: #9ca3af; }
      `}</style>

      {/* ══════════════════════════════════════════════
          LEFT PANEL — Light brand hero (Theme preserved)
      ══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{
          background: '#f9fafb',
          padding: '48px 56px',
          justifyContent: 'space-between',
          borderRight: '1px solid #e5e7eb',
        }}
      >
        {/* Subtle grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.5,
          zIndex: 0
        }} />

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center gap-3"
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
          }}>
            <span style={{ color: 'white' }}><WrenchIcon /></span>
          </div>
          <div>
            <h1 style={{ color: '#111827', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>FixHub</h1>
            <p style={{ color: '#0d9488', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '3px 0 0' }}>
              HQ OPERATIONS CENTER
            </p>
          </div>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {/* original light/amber badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
            padding: '7px 16px', borderRadius: 100,
            background: '#f0f9ff', border: '1px solid #bae6fd',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ea5e9', display: 'block', flexShrink: 0 }} />
            <span style={{ color: '#0369a1', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              HQ COMMAND CENTER
            </span>
          </div>

          <h2 style={{ color: '#111827', fontSize: 52, fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.04em', margin: '0 0 20px' }}>
            One command center,<br />
            <span style={{ color: '#0d9488' }}>every branch.</span>
          </h2>

          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.75, maxWidth: 400, margin: 0, fontWeight: 400 }}>
            Monitor performance, push settings, and oversee every service location — all from a single HQ workspace.
          </p>
        </motion.div>

        {/* Stats (with original card theme but polished layouts) */}
        <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
          <StatCard icon={<GitBranchIcon />} value={8} suffix=" branches" label="Branches connected" iconColor="#7c3aed" iconBg="#ede9fe" delay={0.32} decimals={0} />
          <StatCard icon={<UsersIcon />} value={6} suffix=" online" label="Engineers active now" iconColor="#10b981" iconBg="#d1fae5" delay={0.44} />
          <StatCard icon={<ShieldCheckIcon />} value={99.4} suffix="%" label="SLA compliance rate" iconColor="#6366f1" iconBg="#e0e7ff" delay={0.56} decimals={1} />
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="relative z-10"
          style={{ color: '#d1d5db', fontSize: 11, fontWeight: 500 }}
        >
          © 2026 FixHub Technologies · All rights reserved
        </motion.p>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Premium light form panel
      ══════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          padding: '48px 24px'
        }}
      >
        {/* Soft bottom-left decorative glow overlay */}
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.04) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0
        }} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full z-10"
          style={{ maxWidth: 440 }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center" style={{ marginBottom: 32 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0f766e, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(13,148,136,0.3)'
            }}>
              <span style={{ color: 'white' }}><WrenchIcon /></span>
            </div>
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.04em', display: 'block', lineHeight: 1 }}>FixHub</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0369a1', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginTop: 2 }}>HQ Operations</span>
            </div>
          </div>

          {/* Form card */}
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 24,
            padding: '40px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(0,0,0,0.01)',
          }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 4, height: 26, borderRadius: 4, background: '#0d9488' }} />
                <h2 style={{ color: '#111827', fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>Welcome back</h2>
              </div>
              <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500, margin: '4px 0 0 14px' }}>
                Sign in to HQ · FixHub Operations
              </p>
              <div style={{ height: 1, background: '#f1f5f9', marginTop: 22 }} />
            </motion.div>

            {/* Email */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#0d9488' : '#94a3b8', transition: 'color 0.2s', pointerEvents: 'none', display: 'flex' }}>
                  <MailIcon />
                </div>
                <input
                  ref={emailRef}
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@fixhub.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 44, paddingRight: 16, paddingTop: 13, paddingBottom: 13,
                    borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
                    background: '#ffffff',
                    border: `1.5px solid ${focused === 'email' ? '#0d9488' : '#e2e8f0'}`,
                    boxShadow: focused === 'email' ? '0 0 0 4px rgba(13,148,136,0.08)' : 'none',
                    outline: 'none', transition: 'all 0.2s ease-in-out',
                  }}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PASSWORD</label>
                <button style={{ fontSize: 12.5, fontWeight: 600, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.2s' }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#0d9488' : '#94a3b8', transition: 'color 0.2s', pointerEvents: 'none', display: 'flex' }}>
                  <LockIcon />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 44, paddingRight: 50, paddingTop: 13, paddingBottom: 13,
                    borderRadius: 12, fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
                    background: '#ffffff',
                    border: `1.5px solid ${focused === 'password' ? '#0d9488' : '#e2e8f0'}`,
                    boxShadow: focused === 'password' ? '0 0 0 4px rgba(13,148,136,0.08)' : 'none',
                    outline: 'none', transition: 'all 0.2s ease-in-out',
                  }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 6, borderRadius: 8, display: 'flex' }}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </motion.div>

            {/* Remember me */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.29 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 6 }}
              onClick={() => setRemember(v => !v)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                background: remember ? '#0d9488' : 'white',
                border: `1.5px solid ${remember ? '#0d9488' : '#cbd5e1'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}>
                {remember && <span style={{ color: 'white' }}><CheckIcon /></span>}
              </div>
              <span style={{ fontSize: 13.5, color: '#475569', fontWeight: 500, userSelect: 'none' }}>Keep me signed in</span>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 14 }}
                  exit={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, fontWeight: 500 }}>
                    <AlertIcon />{error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign In Button */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ marginTop: 22 }}>
              <motion.button
                whileHover={!loading ? { scale: 1.01, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                  background: loginSuccess
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                  boxShadow: loading ? 'none' : loginSuccess
                    ? '0 6px 20px rgba(16,185,129,0.4)'
                    : '0 4px 14px rgba(3,105,161,0.30)',
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: 'fh-spin 1s linear infinite', width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                      <path fill="white" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Signing in…
                  </>
                ) : loginSuccess ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Authenticated!
                  </>
                ) : (
                  <><span>Sign In to Workspace</span><ArrowIcon /></>
                )}
              </motion.button>
            </motion.div>
          </div>

          {/* Features strip */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.6 }}
            style={{
              margin: '16px 0 0',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px',
            }}
          >
            {features.map((f, i) => <FeatureItem key={f} text={f} delay={0.46 + i * 0.06} />)}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};