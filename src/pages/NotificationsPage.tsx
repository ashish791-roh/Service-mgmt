import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/ui';

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

  const getIcon = (message: string) => {
    if (message.includes('assigned')) return '📌';
    if (message.includes('approved')) return '✅';
    if (message.includes('rejected')) return '❌';
    if (message.includes('updated')) return '🔄';
    if (message.includes('Part')) return '🔩';
    return '🔔';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-indigo-500 font-semibold hover:text-indigo-400 transition px-4 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
              filter === f ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {f === 'unread' ? `Unread (${unreadCount})` : 'All'}
          </button>
        ))}
      </div>

      {myNotifs.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" desc="You're all caught up! Notifications will appear here." />
      ) : (
        <div className="space-y-2">
          {myNotifs.map(notif => {
            const relatedJob = notif.jobId ? jobs.find(j => j.id === notif.jobId) : null;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all ${
                  !notif.read ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  !notif.read ? 'bg-indigo-100' : 'bg-slate-100'
                }`}>
                  {getIcon(notif.message)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                    {notif.message}
                  </p>
                  {relatedJob && (
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Job #{relatedJob.id} · {relatedJob.problemDescription.substring(0, 50)}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{getRelativeTime(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notif.read && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <button
                        onClick={() => markNotificationRead(notif.id)}
                        className="text-xs text-indigo-500 font-semibold hover:underline"
                      >
                        Mark read
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};