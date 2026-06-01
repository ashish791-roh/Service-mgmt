'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationRead: (id: string) => void;
  postAnnouncement: (message: string) => Promise<{ ok: boolean; error?: string }>;
  getUnreadCount: (userId: string) => number;
}

import { jsonHeaders } from '../lib/api';

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    fetch('/api/notifications', {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ id }),
    }).catch(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    });
  };

  const postAnnouncement = async (message: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to post announcement.' };
      
      // Reload notifications
      fetch('/api/data')
        .then(res => res.json())
        .then(appData => {
          if (appData.notifications) setNotifications(appData.notifications);
        })
        .catch(() => {});

      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const getUnreadCount = (userId: string) =>
    notifications.filter(n => n.userId === userId && !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        setNotifications,
        markNotificationRead,
        postAnnouncement,
        getUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
