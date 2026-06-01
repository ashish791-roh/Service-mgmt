'use client';

import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  currentUser: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setAuth: React.Dispatch<React.SetStateAction<{ currentUser: User | null; hydrated: boolean }>>;
  setCurrentUser: (user: User | null) => void;
}

const SESSION_KEY = 'fixhub_session_user';

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<{ currentUser: User | null; hydrated: boolean }>({
    currentUser: null,
    hydrated: false,
  });

  const currentUser = auth.currentUser;
  const hydrated = auth.hydrated;

  const setCurrentUser = (user: User | null) =>
    setAuth(prev => ({ ...prev, currentUser: user }));

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Invalid credentials — please try again.' };
      }

      const user: User = data.user;
      setCurrentUser(user);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } catch (_) {
        /* ignore */
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/login', {
        method: 'DELETE',
        headers: {
          'x-csrf-token':
            typeof document !== 'undefined'
              ? document.cookie
                  .split('; ')
                  .find(r => r.startsWith('fixhub_csrf='))
                  ?.split('=')[1] ?? ''
              : '',
        },
      });
    } catch {
      /* ignore */
    }

    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        hydrated,
        login,
        logout,
        setAuth,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
