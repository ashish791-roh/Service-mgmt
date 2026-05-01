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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);
const ShieldIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const ZapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const UsersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────────────────────── */
const Counter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target, suffix = '', duration = 1400,
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
  return <>{count}{suffix}</>;
};

/* ─────────────────────────────────────────────────────────────
   FLOATING ORBS (right panel background)
───────────────────────────────────────────────────────────── */
const FloatingOrb: React.FC<{ size: number; x: string; y: string; color: string; delay: number; duration: number }> = ({
  size, x, y, color, delay, duration,
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, left: x, top: y, background: color, filter: 'blur(60px)' }}
    animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
    transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
  />
);

/* ─────────────────────────────────────────────────────────────
   STAT PILL (left panel)
───────────────────────────────────────────────────────────── */
const StatPill: React.FC<{
  icon: React.ReactNode; value: number; suffix?: string;
  label: string; accent: string; delay: number;
}> = ({ icon, value, suffix, label, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16,
      backdropFilter: 'blur(8px)',
    }}
  >
    <div style={{
      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
      background: `${accent}20`, border: `1px solid ${accent}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: accent,
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
        <Counter target={value} suffix={suffix ?? ''} duration={1000 + delay * 600} />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11.5, fontWeight: 500, marginTop: 3, letterSpacing: '0.02em' }}>
        {label}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <motion.div
        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, delay: delay * 0.5 }}
        style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}
      />
      <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>LIVE</span>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   FEATURE ITEM (right panel)
───────────────────────────────────────────────────────────── */
const FeatureItem: React.FC<{ text: string; delay: number }> = ({ text, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
  >
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#818cf8',
    }}>
      <CheckCircleIcon />
    </div>
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>{text}</span>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────
   MAIN LOGIN PAGE
───────────────────────────────────────────────────────────── */
export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [remember, setRemember]         = useState(false);
  const [focused, setFocused]           = useState<'email' | 'password' | null>(null);
  const [mousePos, setMousePos]         = useState({ x: 0.5, y: 0.5 });
  const [loginSuccess, setLoginSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fixhub_user');
    if (saved) {
      try { const p = JSON.parse(saved); setEmail(p.email || ''); setPassword(p.password || ''); setRemember(true); } catch {}
    }
    setTimeout(() => emailRef.current?.focus(), 400);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in both fields.'); return; }
    setError(''); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    const ok = login(email.trim(), password);
    if (!ok) { setError('Invalid credentials — please try again.'); setLoading(false); return; }
    if (remember) localStorage.setItem('fixhub_user', JSON.stringify({ email, password }));
    else localStorage.removeItem('fixhub_user');
    setLoginSuccess(true);
    setLoading(false);
  };

  const quickLogin = (e: string, p: string) => { setEmail(e); setPassword(p); setError(''); };

  const quickRoles = [
    { label: 'Admin',    sub: 'Full Access',  email: 'admin@fixhub.com',     pass: 'admin123', color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  init: 'A' },
    { label: 'Manager',  sub: 'Reception',    email: 'reception@fixhub.com', pass: 'rec123',   color: '#10b981', glow: 'rgba(16,185,129,0.4)',  init: 'M' },
    { label: 'Engineer', sub: 'Field Tech',   email: 'eng1@fixhub.com',      pass: 'eng123',   color: '#818cf8', glow: 'rgba(129,140,248,0.4)', init: 'E' },
  ];

  const features = [
    'Real-time job tracking & dispatch',
    'Smart inventory & parts management',
    'Automated billing & invoicing',
    'Multi-role access control',
  ];

  return (
    <div
      className="min-h-screen flex items-stretch overflow-hidden"
      style={{ fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        @keyframes fh-spin { to { transform: rotate(360deg); } }
        @keyframes fh-dash { to { stroke-dashoffset: 0; } }
        @keyframes fh-node { 0%,100%{opacity:.3;r:3px} 50%{opacity:.85;r:4.5px} }
        @keyframes fh-grid-x { 0%{transform:translateX(0)} 100%{transform:translateX(40px)} }
        @keyframes fh-grid-y { 0%{transform:translateY(0)} 100%{transform:translateY(40px)} }
        .fh-circuit { stroke-dasharray: 600; stroke-dashoffset: 600; animation: fh-dash 2.2s ease forwards; }
      `}</style>

      {/* ══════════════════════════════════════════════
          LEFT PANEL — Dark brand hero
      ══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{
          background: 'linear-gradient(152deg, #060c1a 0%, #0b1325 50%, #0f172a 100%)',
          padding: '48px 56px',
          justifyContent: 'space-between',
        }}
      >
        {/* Animated grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.035 }}>
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

        {/* Mouse-tracked ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 55% 50% at ${20 + mousePos.x * 25}% ${30 + mousePos.y * 30}%, rgba(99,102,241,0.18) 0%, transparent 65%),
              radial-gradient(ellipse 40% 40% at ${70 + mousePos.x * 15}% ${65 + mousePos.y * 18}%, rgba(251,191,36,0.1) 0%, transparent 60%)
            `,
            transition: 'background 2s ease',
          }}
        />

        {/* Circuit board SVG art */}
        <svg
          className="absolute pointer-events-none"
          style={{ bottom: 0, right: 0, width: '75%', height: '60%', opacity: 0.14 }}
          viewBox="0 0 400 320"
          fill="none"
        >
          <path className="fh-circuit" d="M 380 280 L 300 280 L 300 200 L 180 200" stroke="rgba(251,191,36,0.9)" strokeWidth="1.2" style={{ animationDelay: '0s' }} />
          <path className="fh-circuit" d="M 180 200 L 180 120 L 80 120 L 80 60" stroke="rgba(251,191,36,0.9)" strokeWidth="1.2" style={{ animationDelay: '0.3s' }} />
          <path className="fh-circuit" d="M 380 160 L 260 160 L 260 80 L 140 80" stroke="rgba(251,191,36,0.7)" strokeWidth="1" style={{ animationDelay: '0.6s' }} />
          <path className="fh-circuit" d="M 380 60 L 320 60 L 320 120 L 260 120" stroke="rgba(251,191,36,0.6)" strokeWidth="0.8" style={{ animationDelay: '0.9s' }} />
          <path className="fh-circuit" d="M 80 220 L 80 280 L 200 280 L 200 320" stroke="rgba(99,102,241,0.8)" strokeWidth="1" style={{ animationDelay: '1.1s' }} />
          <path className="fh-circuit" d="M 140 80 L 140 40 L 60 40" stroke="rgba(251,191,36,0.5)" strokeWidth="0.8" style={{ animationDelay: '1.3s' }} />
          {[
            { cx: 380, cy: 280, c: 'rgba(251,191,36,0.8)', d: 0.2 },
            { cx: 300, cy: 280, c: 'rgba(251,191,36,0.7)', d: 0.5 },
            { cx: 180, cy: 200, c: 'rgba(251,191,36,0.9)', d: 0.8 },
            { cx: 80,  cy: 120, c: 'rgba(251,191,36,0.7)', d: 1.0 },
            { cx: 260, cy: 160, c: 'rgba(251,191,36,0.6)', d: 0.6 },
            { cx: 260, cy: 80,  c: 'rgba(251,191,36,0.5)', d: 1.2 },
            { cx: 320, cy: 120, c: 'rgba(251,191,36,0.5)', d: 1.5 },
            { cx: 80,  cy: 280, c: 'rgba(99,102,241,0.8)', d: 0.9 },
            { cx: 300, cy: 200, c: 'rgba(251,191,36,0.6)', d: 0.4 },
          ].map((n, i) => (
            <circle key={i} cx={n.cx} cy={n.cy} r="3.5" fill="none" stroke={n.c} strokeWidth="1.5"
              style={{ animation: `fh-node 2.5s ease-in-out ${n.d}s infinite` }} />
          ))}
          {/* CPU-like square in center */}
          <rect x="150" y="100" width="60" height="60" rx="4" fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth="1" />
          <rect x="160" y="110" width="40" height="40" rx="3" fill="rgba(251,191,36,0.06)" stroke="rgba(251,191,36,0.25)" strokeWidth="0.8" />
          {/* CPU pins */}
          {[0,1,2].map(i => <line key={`pt${i}`} x1={160 + i * 15} y1="100" x2={160 + i * 15} y2="90" stroke="rgba(251,191,36,0.3)" strokeWidth="0.8" />)}
          {[0,1,2].map(i => <line key={`pb${i}`} x1={160 + i * 15} y1="160" x2={160 + i * 15} y2="170" stroke="rgba(251,191,36,0.3)" strokeWidth="0.8" />)}
          {[0,1,2].map(i => <line key={`pl${i}`} x1="150" y1={112 + i * 14} x2="138" y2={112 + i * 14} stroke="rgba(251,191,36,0.3)" strokeWidth="0.8" />)}
          {[0,1,2].map(i => <line key={`pr${i}`} x1="210" y1={112 + i * 14} x2="222" y2={112 + i * 14} stroke="rgba(251,191,36,0.3)" strokeWidth="0.8" />)}
        </svg>

        {/* ── Brand ── */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center gap-4"
        >
          <div style={{
            width: 50, height: 50, borderRadius: 16,
            background: 'linear-gradient(135deg, #b45309 0%, #d97706 40%, #fbbf24 100%)',
            boxShadow: '0 0 0 1px rgba(251,191,36,0.25), 0 10px 32px rgba(180,83,9,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#0c0e18' }}><WrenchIcon /></span>
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 24, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, margin: 0 }}>FixHub</h1>
            <p style={{ color: 'rgba(253,230,138,0.45)', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '4px 0 0' }}>
              Service Platform
            </p>
          </div>
        </motion.div>

        {/* ── Hero copy ── */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
            padding: '7px 16px', borderRadius: 100,
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.22)',
          }}>
            <motion.span
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', display: 'block' }}
            />
            <span style={{ color: '#fbbf24', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Trusted by 200+ Service Centers
            </span>
          </div>

          <h2 style={{
            color: 'white', fontSize: 50, fontWeight: 800,
            lineHeight: 1.05, letterSpacing: '-0.045em', margin: '0 0 20px',
          }}>
            Repair smarter,<br />
            <span style={{
              background: 'linear-gradient(90deg, #fbbf24 0%, #fb923c 45%, #e879f9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              deliver faster.
            </span>
          </h2>

          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 14.5, lineHeight: 1.8, maxWidth: 380, margin: 0 }}>
            One unified workspace for your entire service operation — job intake, engineer dispatch, inventory, billing, and analytics.
          </p>
        </motion.div>

        {/* ── Stats ── */}
        <div className="relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <StatPill icon={<ZapIcon />}   value={24} suffix=" jobs"   label="Completed today"        accent="#fbbf24" delay={0.38} />
          <StatPill icon={<UsersIcon />} value={6}  suffix=" online" label="Engineers active now"   accent="#22c55e" delay={0.50} />
          <StatPill icon={<StarIcon />}  value={98} suffix="%"       label="Customer satisfaction"  accent="#818cf8" delay={0.62} />
        </div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="relative z-10"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {['SOC 2', 'ISO 27001', 'GDPR'].map(t => (
            <div key={t} style={{
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.25)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.06em',
            }}>{t}</div>
          ))}
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: 500 }}>
            © 2026 FixHub Technologies
          </span>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Dark form panel (equally bold)
      ══════════════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(152deg, #0e0f1e 0%, #111228 55%, #0d1220 100%)', padding: '48px 24px' }}
      >
        {/* Floating orbs */}
        <FloatingOrb size={350} x="-10%"  y="-5%"  color="rgba(99,102,241,0.07)"  delay={0}   duration={7} />
        <FloatingOrb size={280} x="60%"   y="55%"  color="rgba(139,92,246,0.07)"  delay={2}   duration={9} />
        <FloatingOrb size={200} x="10%"   y="65%"  color="rgba(251,191,36,0.05)"  delay={1}   duration={8} />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Diagonal accent line top-right */}
        <div className="absolute pointer-events-none" style={{
          top: 0, right: 0, width: 1, height: '35%',
          background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.35), transparent)',
          marginRight: 60,
        }} />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full"
          style={{ maxWidth: 420 }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center" style={{ marginBottom: 36 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#d97706,#fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#0c0e18' }}><WrenchIcon /></span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.04em' }}>FixHub</span>
          </div>

          {/* ── Form card ── */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 24,
            backdropFilter: 'blur(24px)',
            padding: '36px 36px 30px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 64px rgba(0,0,0,0.4)',
          }}>
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ marginBottom: 28 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 4, height: 28, borderRadius: 2,
                  background: 'linear-gradient(180deg, #6366f1, #a78bfa)',
                }} />
                <h2 style={{ color: 'white', fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', margin: 0 }}>
                  Welcome back
                </h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.5, fontWeight: 500, margin: '0 0 0 14px' }}>
                Sign in to your FixHub workspace
              </p>
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)', marginTop: 22 }} />
            </motion.div>

            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={{ marginBottom: 14 }}
            >
              <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: focused === 'email' ? '#818cf8' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.2s', pointerEvents: 'none', display: 'flex',
                }}>
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
                    borderRadius: 13, fontSize: 14, fontFamily: 'inherit',
                    color: 'white',
                    background: focused === 'email' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${focused === 'email' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: focused === 'email' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                    outline: 'none', transition: 'all 0.2s ease',
                  }}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Password
                </label>
                <button style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: focused === 'password' ? '#818cf8' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.2s', pointerEvents: 'none', display: 'flex',
                }}>
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
                    borderRadius: 13, fontSize: 14, fontFamily: 'inherit',
                    color: 'white',
                    background: focused === 'password' ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${focused === 'password' ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
                    outline: 'none', transition: 'all 0.2s ease',
                  }}
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)', padding: 6, borderRadius: 8, display: 'flex',
                  }}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </motion.div>

            {/* Remember me */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}
              onClick={() => setRemember(v => !v)}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                background: remember ? '#6366f1' : 'rgba(255,255,255,0.07)',
                border: `1.5px solid ${remember ? '#6366f1' : 'rgba(255,255,255,0.18)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {remember && <span style={{ color: 'white' }}><CheckIcon /></span>}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: 500, userSelect: 'none' }}>
                Keep me signed in
              </span>
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
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px 14px', borderRadius: 11,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontSize: 13, fontWeight: 500,
                  }}>
                    <AlertIcon />{error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              style={{ marginTop: 22 }}
            >
              <motion.button
                whileHover={!loading ? { scale: 1.016, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.984 } : {}}
                onClick={handleLogin}
                disabled={loading}
                style={{
                  width: '100%', padding: '14.5px 0', borderRadius: 14, border: 'none',
                  background: loginSuccess
                    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1,
                  transition: 'all 0.4s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'inherit', letterSpacing: '-0.01em',
                  boxShadow: loading ? 'none' : loginSuccess
                    ? '0 8px 24px rgba(16,185,129,0.4)'
                    : '0 8px 28px rgba(99,102,241,0.45), 0 2px 8px rgba(67,56,202,0.3)',
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

          {/* ── Features strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.65 }}
            style={{
              margin: '18px 0 0',
              padding: '20px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px',
            }}
          >
            {features.map((f, i) => (
              <FeatureItem key={f} text={f} delay={0.48 + i * 0.06} />
            ))}
          </motion.div>

          {/* ── Demo divider ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.58 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}
          >
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
              Quick Demo Access
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </motion.div>

          {/* ── Role cards ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.64 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}
          >
            {quickRoles.map(role => (
              <motion.button
                key={role.label}
                whileHover={{ scale: 1.04, y: -3 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => quickLogin(role.email, role.pass)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 8px', borderRadius: 16,
                  background: `${role.color}0d`,
                  border: `1px solid ${role.color}28`,
                  cursor: 'pointer', transition: 'all 0.18s ease', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: `linear-gradient(135deg, ${role.color}cc, ${role.color})`,
                  color: '#0c0e18', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                  boxShadow: `0 6px 16px ${role.glow}`,
                }}>
                  {role.init}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: role.color, margin: 0, lineHeight: 1.2 }}>{role.label}</p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 500, margin: '3px 0 0' }}>{role.sub}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.72 }}
            style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500, marginTop: 12 }}
          >
            Select a role · credentials auto-fill · then Sign In
          </motion.p>

          {/* Security note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.78 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}
          >
            <span style={{ color: 'rgba(255,255,255,0.2)', display: 'flex' }}><ShieldIcon /></span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
              256-bit encrypted · SOC 2 compliant · Zero data sharing
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};