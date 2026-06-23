import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, Check, Pin, CheckCircle, XCircle, RefreshCw, Wrench, Megaphone, Send, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { MotionListItem } from '../components/MotionListItem';

const PageHeader = ({ title, subtitle, action }: { title: string, subtitle: string, action?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-xl border border-gray-200">
    <div>
      <h1 className="text-[18px] font-medium text-gray-900">{title}</h1>
      <p className="text-[13px] font-normal text-teal-500 mt-1">{subtitle}</p>
    </div>
    {action && <div>{action}</div>}
  </div>
);

interface ButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'outline' | 'outline_danger' | 'teal';
  className?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
}

const Button = ({ text, onClick, variant = 'primary', className = "", icon: Icon, disabled }: ButtonProps) => {
  const styles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    success: "bg-green-500 text-white hover:bg-green-600",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
    outline: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    outline_danger: "bg-white border border-rose-200 text-rose-600 hover:bg-rose-50",
    teal: "bg-teal-600 text-white hover:bg-teal-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${styles[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {Icon && <Icon size={16} />}
      {text}
    </button>
  );
};

// ── Admin Announcement Modal ──────────────────────────────────────
const AnnouncementModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { postAnnouncement } = useApp();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePost = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setLoading(true);
    setFeedback(null);
    const result = await postAnnouncement(trimmed);
    setLoading(false);
    if (result.ok) {
      setFeedback({ type: 'success', text: 'Announcement sent to all users!' });
      setMessage('');
      setTimeout(onClose, 1500);
    } else {
      setFeedback({ type: 'error', text: result.error ?? 'Failed to post announcement.' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Megaphone size={16} className="text-teal-600" />
            </div>
            <h2 className="text-[15px] font-medium text-gray-900">Post Announcement</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-500">
            This message will be sent as a notification to <span className="font-medium text-gray-700">all active users</span> (managers and engineers).
          </p>
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1 uppercase tracking-wide">
              Announcement Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Office will be closed on Monday for maintenance…"
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1 text-right">{message.length} chars</p>
          </div>

          {feedback && (
            <div className={`px-4 py-3 rounded-lg text-[13px] font-medium ${
              feedback.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {feedback.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-end gap-3">
          <Button text="Cancel" variant="outline" onClick={onClose} />
          <Button
            text={loading ? 'Sending…' : 'Send to All'}
            icon={Send}
            variant="teal"
            onClick={handlePost}
            disabled={loading || !message.trim()}
          />
        </div>
      </div>
    </div>
  );
};

export const NotificationsPage: React.FC = () => {
  const { currentUser, notifications, markNotificationRead, jobs } = useApp();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

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
    if (message.startsWith('📢')) return { Icon: Megaphone, colorClass: 'text-purple-600 bg-purple-100 border-purple-200' };
    if (message.includes('assigned')) return { Icon: Pin, colorClass: 'text-indigo-600 bg-indigo-100 border-indigo-200' };
    if (message.includes('approved')) return { Icon: CheckCircle, colorClass: 'text-emerald-600 bg-emerald-100 border-emerald-200' };
    if (message.includes('rejected')) return { Icon: XCircle, colorClass: 'text-rose-600 bg-rose-100 border-rose-200' };
    if (message.includes('updated')) return { Icon: RefreshCw, colorClass: 'text-cyan-600 bg-cyan-100 border-cyan-200' };
    if (message.includes('Part')) return { Icon: Wrench, colorClass: 'text-amber-600 bg-amber-100 border-amber-200' };
    return { Icon: Bell, colorClass: 'text-teal-600 bg-teal-100 border-teal-200' };
  };

  return (
    <div className="max-w-[1000px] mx-auto pb-6 space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread system alerts` : 'All caught up!'}
        action={
          <div className="flex items-center gap-3">
            {/* Admin-only: Post Announcement button */}
            {isAdmin && (
              <Button
                text="Post Announcement"
                icon={Megaphone}
                variant="teal"
                onClick={() => setShowAnnouncementModal(true)}
              />
            )}
            {unreadCount > 0 && (
              <Button
                text="Mark all as read"
                icon={Check}
                variant="outline"
                onClick={handleMarkAllRead}
              />
            )}
          </div>
        }
      />

      {/* Admin announcement info banner */}
      {isAdmin && (
        <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-4">
          <Megaphone size={18} className="text-purple-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-purple-900">Admin Broadcast</p>
            <p className="text-[12px] text-purple-600 mt-0.5">
              Use <span className="font-semibold">Post Announcement</span> to instantly notify all managers and engineers with a custom message. Announcements appear in everyone's notification feed.
            </p>
          </div>
        </div>
      )}

      <div className="flex bg-white p-1 rounded-lg border border-gray-200 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              filter === f ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {f === 'unread' ? 'Unread' : 'All Alerts'}
            {f === 'unread' && unreadCount > 0 && (
              <span className={`px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${filter === f ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-600'}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {myNotifs.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-gray-200">
          <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Bell size={24} />
          </div>
          <p className="text-[13px] font-medium text-gray-900 mb-1">No notifications</p>
          <p className="text-[11px] font-normal text-gray-500 uppercase tracking-wide">You're completely caught up</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {myNotifs.map((notif, i) => {
              const relatedJob = notif.jobId ? jobs.find(j => j.id === notif.jobId) : null;
              const { Icon, colorClass } = getIconData(notif.message);
              const isAnnouncement = notif.message.startsWith('📢');
              return (
                <MotionListItem key={notif.id} index={i}>
                  <div
                    className={`bg-white rounded-xl border p-4 flex items-start sm:items-center flex-col sm:flex-row gap-4 transition-colors ${
                      isAnnouncement && !notif.read
                        ? 'border-purple-200 bg-purple-50/30'
                        : !notif.read
                        ? 'border-teal-200 bg-teal-50/30'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${!notif.read ? colorClass : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      <Icon size={18} strokeWidth={2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isAnnouncement && (
                        <span className="inline-block mb-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-purple-100 text-purple-700">
                          Announcement
                        </span>
                      )}
                      <p className={`text-[13px] mb-0.5 ${!notif.read ? 'font-medium text-gray-900' : 'font-normal text-gray-600'}`}>
                        {notif.message.replace(/^📢 Announcement: /, '')}
                      </p>
                      {relatedJob && (
                        <p className="text-[11px] font-medium text-gray-500 truncate mb-1">
                          <span className="uppercase tracking-wide">Job #{relatedJob.id}</span> · {relatedJob.problemDescription}
                        </p>
                      )}
                      <p className="text-[11px] font-normal text-gray-400 uppercase tracking-wide">{getRelativeTime(notif.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {!notif.read && (
                        <Button
                          text="Mark Read"
                          icon={Check}
                          variant="outline"
                          onClick={() => markNotificationRead(notif.id)}
                          className="w-full sm:w-auto"
                        />
                      )}
                    </div>
                  </div>
                </MotionListItem>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <AnnouncementModal onClose={() => setShowAnnouncementModal(false)} />
      )}
    </div>
  );
};