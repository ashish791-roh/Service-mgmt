import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';

// ── Icons ────────────────────────────────────────────────────────
const Icons = {
  Bell: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Pin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
  CheckCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  XCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  Refresh: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Tool: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
};

// ── Interactive UI Components ────────────────────────────────────
const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
  >
    <div>
      <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 tracking-tight leading-tight">{title}</h1>
      <p className="text-sm font-bold text-violet-500 uppercase tracking-widest mt-2">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </motion.div>
);

const GlowButton = ({ icon, text, onClick, variant = 'primary', className = "" }: any) => {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_16px_rgba(0,0,0,0.15)]",
    vivid: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_25px_rgba(139,92,246,0.4)]",
    outline: "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  };
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm transition-all ${styles[variant]} ${className}`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      {text}
    </motion.button>
  );
};

export const NotificationsPage: React.FC = () => {
  const { currentUser, notifications, markNotificationRead, jobs } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!currentUser) return null;

  const myNotifs = notifications
    .filter(n => n.userId === currentUser.id)
    .filter(n => filter === 'all' ? true : !n.read)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = notifications.filter(n => n.userId === currentUser.id && !n.read).length;

  const handleMarkAllRead = () => {
    notifications
      .filter(n => n.userId === currentUser.id && !n.read)
      .forEach(n => markNotificationRead(n.id));
  };

  const getRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  const getIconData = (message: string) => {
    if (message.includes('assigned')) return { icon: Icons.Pin, color: 'text-indigo-600', bg: 'bg-indigo-100' };
    if (message.includes('approved')) return { icon: Icons.CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (message.includes('rejected')) return { icon: Icons.XCircle, color: 'text-rose-600', bg: 'bg-rose-100' };
    if (message.includes('updated')) return { icon: Icons.Refresh, color: 'text-blue-600', bg: 'bg-blue-100' };
    if (message.includes('Part')) return { icon: Icons.Tool, color: 'text-amber-600', bg: 'bg-amber-100' };
    return { icon: Icons.Bell, color: 'text-violet-600', bg: 'bg-violet-100' };
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-12 space-y-8">
      <PageHeader 
        title="Notifications" 
        subtitle={unreadCount > 0 ? `${unreadCount} unread system alerts` : 'All caught up!'} 
        action={
          unreadCount > 0 ? (
            <GlowButton 
              text="Mark all as read" 
              icon={Icons.Check} 
              variant="outline" 
              onClick={handleMarkAllRead} 
            />
          ) : null
        }
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex bg-white p-2 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap flex items-center gap-3 ${
              filter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {f === 'unread' ? 'Unread' : 'All Alerts'}
            {f === 'unread' && unreadCount > 0 && (
              <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-widest ${filter === f ? 'bg-violet-500 text-white' : 'bg-violet-100 text-violet-600'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {myNotifs.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-16 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mt-8">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 shadow-inner">
            {Icons.Bell}
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight mb-2">No notifications</p>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">You're completely caught up</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {myNotifs.map((notif, i) => {
              const relatedJob = notif.jobId ? jobs.find(j => j.id === notif.jobId) : null;
              const { icon, color, bg } = getIconData(notif.message);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, height: 0 }} transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-[2rem] border shadow-sm p-6 flex items-start sm:items-center flex-col sm:flex-row gap-5 transition-all group ${
                    !notif.read ? 'border-violet-200 bg-violet-50/30 shadow-[0_8px_30px_rgba(139,92,246,0.06)]' : 'border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${!notif.read ? bg : 'bg-slate-50'} ${!notif.read ? color : 'text-slate-400'}`}>
                    {icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-base tracking-tight mb-1 ${!notif.read ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                      {notif.message}
                    </p>
                    {relatedJob && (
                      <p className="text-xs font-bold text-slate-400 truncate mb-2">
                        <span className="uppercase tracking-widest">Job #{relatedJob.id}</span> · {relatedJob.problemDescription}
                      </p>
                    )}
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{getRelativeTime(notif.createdAt)}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {!notif.read && (
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-violet-100 hover:border-violet-200 text-violet-600 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        {Icons.Check} Mark Read
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};