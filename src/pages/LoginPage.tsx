import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const ok = login(email, password);
    if (!ok) setError('Invalid credentials or account inactive.');
    setLoading(false);
  };

  const quickLogin = (e: string, p: string) => { setEmail(e); setPassword(p); };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">🔧</div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">FixHub</h1>
              <p className="text-slate-400 text-sm">Service Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-7">Sign in to your portal</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <><span className="animate-spin">↻</span> Signing in...</> : 'Sign In →'}
            </button>
          </div>

          {/* Quick login demo */}
          <div className="mt-7 pt-5 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '👑 Admin', e: 'admin@fixhub.com', p: 'admin123' },
                { label: '🗂 Reception', e: 'reception@fixhub.com', p: 'rec123' },
                { label: '🔩 Engineer', e: 'eng1@fixhub.com', p: 'eng123' },
              ].map(({ label, e, p }) => (
                <button
                  key={label}
                  onClick={() => quickLogin(e, p)}
                  className="px-2 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs text-slate-300 font-medium transition-colors text-center"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
