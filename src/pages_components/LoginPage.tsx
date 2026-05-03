import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Check, Shield, Zap, Users, Star, CheckCircle, Wrench } from 'lucide-react';

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-500 shrink-0">
      <CheckCircle size={12} strokeWidth={2.5} />
    </div>
    <span className="text-[13px] font-normal text-gray-600">{text}</span>
  </div>
);

const StatPill: React.FC<{ icon: React.ReactNode; value: number; suffix?: string; label: string; colorClass: string }> = ({ icon, value, suffix, label, colorClass }) => (
  <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[18px] font-medium text-gray-900 leading-tight">
        {value}{suffix}
      </div>
      <div className="text-[11px] font-medium text-gray-500 mt-0.5">
        {label}
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-green-500 text-[11px] font-medium tracking-wide">LIVE</span>
    </div>
  </div>
);

export const LoginPage: React.FC = () => {
  const { login } = useApp();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [remember, setRemember]         = useState(false);
  const [focused, setFocused]           = useState<'email' | 'password' | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fixhub_user');
    if (saved) {
      try { const p = JSON.parse(saved); setEmail(p.email || ''); setPassword(p.password || ''); setRemember(true); } catch {}
    }
    setTimeout(() => emailRef.current?.focus(), 400);
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
    { label: 'Admin',    sub: 'Full Access',  email: 'admin@fixhub.com',     pass: 'admin123', colorClass: 'text-amber-500 bg-amber-50 border-amber-200',  init: 'A' },
    { label: 'Manager',  sub: 'Reception',    email: 'reception@fixhub.com', pass: 'rec123',   colorClass: 'text-green-500 bg-green-50 border-green-200',  init: 'M' },
    { label: 'Engineer', sub: 'Field Tech',   email: 'eng1@fixhub.com',      pass: 'eng123',   colorClass: 'text-cyan-500 bg-cyan-50 border-cyan-200', init: 'E' },
  ];

  const features = [
    'Real-time job tracking & dispatch',
    'Smart inventory & parts management',
    'Automated billing & invoicing',
    'Multi-role access control',
  ];

  return (
    <div className="min-h-screen flex items-stretch bg-gray-50">
      {/* ══════════════════════════════════════════════
          LEFT PANEL — Hero
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col w-1/2 p-12 justify-between border-r border-gray-200 bg-white relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-50" style={{
          backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        {/* ── Brand ── */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-teal-500/20">
            <Wrench size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[18px] font-medium text-gray-900 leading-none">FixHub</h1>
            <p className="text-[11px] font-medium text-teal-600 tracking-wide uppercase mt-1">Service Platform</p>
          </div>
        </div>

        {/* ── Hero copy ── */}
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-600 text-[11px] font-medium tracking-wide uppercase">Trusted by 200+ Service Centers</span>
          </div>

          <h2 className="text-[36px] font-medium text-gray-900 leading-[1.1] tracking-tight mb-4">
            Repair smarter,<br />
            <span className="text-teal-500">deliver faster.</span>
          </h2>

          <p className="text-[13px] text-gray-500 leading-relaxed max-w-sm mb-8">
            One unified workspace for your entire service operation — job intake, engineer dispatch, inventory, billing, and analytics.
          </p>

          <div className="flex flex-col gap-4">
            <StatPill icon={<Zap size={20} />}   value={24} suffix=" jobs"   label="Completed today"        colorClass="text-amber-500 bg-amber-50" />
            <StatPill icon={<Users size={20} />} value={6}  suffix=" online" label="Engineers active now"   colorClass="text-green-500 bg-green-50" />
            <StatPill icon={<Star size={20} />}  value={98} suffix="%"       label="Customer satisfaction"  colorClass="text-teal-500 bg-teal-50" />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="relative z-10 flex items-center gap-3 mt-12">
          {['SOC 2', 'ISO 27001', 'GDPR'].map(t => (
            <div key={t} className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-gray-500 text-[11px] font-medium tracking-wide">
              {t}
            </div>
          ))}
          <span className="ml-auto text-gray-400 text-[11px] font-medium">© 2026 FixHub Technologies</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Form
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0">
              <Wrench size={20} strokeWidth={2.5} />
            </div>
            <span className="text-[18px] font-medium text-gray-900">FixHub</span>
          </div>

          {/* ── Form card ── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-1 h-6 rounded-full bg-teal-500" />
                <h2 className="text-[18px] font-medium text-gray-900">Welcome back</h2>
              </div>
              <p className="text-[13px] text-gray-500 ml-4">Sign in to your FixHub workspace</p>
            </div>

            <div className="h-px bg-gray-100 mb-6" />

            {/* Email */}
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">Email Address</label>
              <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 flex transition-colors ${focused === 'email' ? 'text-teal-500' : 'text-gray-400'}`}>
                  <Mail size={16} />
                </div>
                <input
                  ref={emailRef}
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@fixhub.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Password</label>
                <button className="text-[11px] font-medium text-teal-600 hover:text-teal-700 transition-colors">Forgot password?</button>
              </div>
              <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 flex transition-colors ${focused === 'password' ? 'text-teal-500' : 'text-gray-400'}`}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-10 py-2.5 text-[13px] font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-colors"
                />
                <button
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setRemember(v => !v)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${remember ? 'bg-teal-500 border-teal-500 text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                <Check size={12} strokeWidth={3} />
              </div>
              <span className="text-[13px] font-medium text-gray-600 select-none">Keep me signed in</span>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[13px] font-medium">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-medium text-white transition-colors ${loading ? 'bg-teal-400 cursor-not-allowed' : loginSuccess ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-800'}`}
            >
              {loading ? (
                <>Signing in…</>
              ) : loginSuccess ? (
                <><Check size={16} /> Authenticated!</>
              ) : (
                <>Sign In to Workspace <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          {/* ── Features strip ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 shadow-sm">
            {features.map(f => (
              <FeatureItem key={f} text={f} />
            ))}
          </div>

          {/* ── Demo divider ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Quick Demo Access</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ── Role cards ── */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {quickRoles.map(role => (
              <button
                key={role.label}
                onClick={() => quickLogin(role.email, role.pass)}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-teal-500 transition-colors shadow-sm"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-medium border ${role.colorClass}`}>
                  {role.init}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-gray-900 leading-tight">{role.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{role.sub}</p>
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] font-medium text-gray-400 mb-4">
            Select a role · credentials auto-fill · then Sign In
          </p>

          {/* Security note */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400">
            <Shield size={12} />
            <span>256-bit encrypted · SOC 2 compliant · Zero data sharing</span>
          </div>
        </div>
      </div>
    </div>
  );
};