'use client';

import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';

interface UserContextType {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addUser: (user: Omit<User, 'id'> & { password?: string }) => Promise<{ ok: boolean; error?: string }>;
  updateUser: (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'role'>> & { password?: string }) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleUserActive: (userId: string) => Promise<{ ok: boolean; error?: string }>;
}

import { getCsrfToken, jsonHeaders } from '../lib/api';

const UserContext = createContext<UserContextType | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);

  const addUser = async (user: Omit<User, 'id'> & { password?: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          isActive: true,
        }),
      });
      const real = await res.json();
      if (!res.ok || real.error) {
        return { ok: false, error: real.error ?? 'Failed to create user.' };
      }
      const mapped: User = {
        id: real.id,
        name: real.name,
        email: real.email,
        role: real.role as User['role'],
        active: real.active ?? real.isActive ?? true,
        joinedAt: real.joinedAt ?? real.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      };
      setUsers(prev => [...prev, mapped]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const toggleUserActive = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    const target = users.find(u => u.id === userId);
    if (!target) return { ok: false, error: 'User not found.' };
    const newStatus = !target.active;

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: newStatus } : u));

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !newStatus } : u));
        return { ok: false, error: json.error ?? 'Failed to update user status.' };
      }
      return { ok: true };
    } catch {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !newStatus } : u));
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const updateUser = async (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'role'>> & { password?: string }): Promise<{ ok: boolean; error?: string }> => {
    const originalUsers = [...users];
    
    // Optimistically update local users state
    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      name: data.name ?? u.name,
      email: data.email ?? u.email,
      role: data.role ?? u.role
    } : u));

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setUsers(originalUsers);
        return { ok: false, error: json.error ?? 'Failed to update user.' };
      }
      setUsers(prev => prev.map(u => u.id === userId ? { 
        ...u, 
        ...json, 
        active: json.active ?? json.isActive ?? u.active,
        joinedAt: json.joinedAt ?? u.joinedAt
      } : u));
      return { ok: true };
    } catch {
      setUsers(originalUsers);
      return { ok: false, error: 'Network error.' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json();
        return { ok: false, error: json.error ?? 'Failed to delete user.' };
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error.' };
    }
  };

  return (
    <UserContext.Provider
      value={{
        users,
        setUsers,
        addUser,
        updateUser,
        deleteUser,
        toggleUserActive,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUsers = (): UserContextType => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUsers must be used within UserProvider');
  return ctx;
};
