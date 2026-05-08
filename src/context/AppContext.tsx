'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User, Customer, Device, Job, PartRequest,
  InventoryItem, Notification, JobStatus, PartRequestStatus, Sale,
} from '../types';

// ── Login result type (what LoginPage expects) ────────────────────
interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AppContextType {
  currentUser: User | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  users: User[];
  customers: Customer[];
  devices: Device[];
  jobs: Job[];
  partRequests: PartRequest[];
  inventory: InventoryItem[];
  notifications: Notification[];
  addUser: (user: Omit<User, 'id'>) => Promise<{ ok: boolean; error?: string }>;
  updateUser: (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'role'>> & { password?: string }) => Promise<{ ok: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleUserActive: (userId: string) => Promise<{ ok: boolean; error?: string }>;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  addDevice: (d: Omit<Device, 'id'>) => Promise<Device>;
  addJob: (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Job>;
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string) => Promise<{ ok: boolean; error?: string }>;
  assignEngineer: (jobId: string, engineerId: string) => void;
  addPartRequest: (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => void;
  updatePartRequest: (id: string, status: PartRequestStatus) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventory: (id: string, quantity: number) => void;
  sales: Sale[];
  addSale: (sale: { companyName: string; contactName: string; phone: string; notes: string; customerId?: string; items: { inventoryItemId: string; quantity: number }[] }) => Promise<{ ok: boolean; error?: string; sale?: Sale }>;
  markNotificationRead: (id: string) => void;
  getUnreadCount: (userId: string) => number;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Session is now managed via HttpOnly cookie on the server.
// The frontend stores only the user profile (no token) in localStorage
// for UI purposes (survives page refresh). The actual auth token is
// never accessible to JS — it lives in the HttpOnly cookie only.
const SESSION_KEY = 'fixhub_session_user';

// ── Load all app data from the real API ──────────────────────────
async function loadAppData() {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error('Failed to fetch app data');
  return res.json();
}

function applyAppData(data: any, setters: {
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setPartRequests: React.Dispatch<React.SetStateAction<PartRequest[]>>;
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
}) {
  setters.setUsers(data.users);
  setters.setCustomers(data.customers);
  setters.setDevices(data.devices);
  setters.setJobs(data.jobs);
  setters.setPartRequests(data.partRequests);
  setters.setInventory(data.inventory);
  setters.setNotifications(data.notifications);
  if (data.sales) setters.setSales(data.sales);
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Auth state — currentUser and hydrated are set atomically ────────
  // Using a single state object prevents any render where hydrated=true
  // but currentUser=null for a logged-in user (which would flash LoginPage).
  const [auth, setAuth] = useState<{ currentUser: User | null; hydrated: boolean }>({
    currentUser: null,
    hydrated: false,
  });
  const currentUser = auth.currentUser;
  const hydrated = auth.hydrated;
  const setCurrentUser = (user: User | null) =>
    setAuth(prev => ({ ...prev, currentUser: user }));

  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const setters = { setUsers, setCustomers, setDevices, setJobs, setPartRequests, setInventory, setNotifications, setSales };

  // ── Restore session AFTER hydration (client only) ────────────────
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const user = JSON.parse(stored) as User;
          const res = await fetch('/api/data');
          if (res.ok) {
            const data = await res.json();
            // Set currentUser + hydrated atomically — single setState,
            // no intermediate render where hydrated=true but user=null.
            setAuth({ currentUser: user, hydrated: true });
            applyAppData(data, setters);
            return;
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch { /**/ }
      // No valid session — mark hydrated so LoginPage can render
      setAuth({ currentUser: null, hydrated: true });
    };
    restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth ─────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'same-origin' is the default for same-origin fetches.
        // The server will set the HttpOnly session cookie in the response.
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Invalid credentials — please try again.' };
      }

      const user: User = data.user;
      setCurrentUser(user);
      // Store only UI profile — NOT the session token (that lives in HttpOnly cookie)
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) { /**/ }

      // Load all real data after successful login
      const appData = await loadAppData();
      applyAppData(appData, setters);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const logout = async () => {
    // Tell the server to destroy the session and clear the cookie
    try {
      await fetch('/api/auth/login', { method: 'DELETE' });
    } catch { /**/ }

    setCurrentUser(null);
    try { localStorage.removeItem(SESSION_KEY); } catch (_) { /**/ }
    setUsers([]); setCustomers([]); setDevices([]); setJobs([]);
    setPartRequests([]); setInventory([]); setNotifications([]);
  };

  // ── Users ────────────────────────────────────────────────────────
  const addUser = async (user: Omit<User, 'id'>): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // Map API response shape → frontend User shape
      const mapped: User = {
        id: real.id,
        name: real.name,
        email: real.email,
        password: '',
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Roll back optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !newStatus } : u));
        return { ok: false, error: json.error ?? 'Failed to update user status.' };
      }
      return { ok: true };
    } catch {
      // Roll back on network error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !newStatus } : u));
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const updateUser = async (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'role'>> & { password?: string }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'Failed to update user.' };
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...json } : u));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error.' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
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

  // ── Customers ────────────────────────────────────────────────────
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Customer = { ...c, id: tempId, createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c),
      });
      const real = await res.json();
      if (!real?.id) throw new Error('Invalid customer response');
      setCustomers(prev => prev.map(x => x.id === tempId ? real : x));
      return real;
    } catch (err) {
      setCustomers(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  // ── Devices ──────────────────────────────────────────────────────
  const addDevice = async (d: Omit<Device, 'id'>): Promise<Device> => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Device = { ...d, id: tempId };
    setDevices(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d),
      });
      const real = await res.json();
      if (!real?.id) throw new Error('Invalid device response');
      setDevices(prev => prev.map(x => x.id === tempId ? real : x));
      return real;
    } catch (err) {
      setDevices(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  // ── Jobs ─────────────────────────────────────────────────────────
  const addJob = async (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
    const now = new Date().toISOString();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Job = { ...j, id: tempId, createdAt: now, updatedAt: now };
    setJobs(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(j),
      });
      const real = await res.json();
      if (!real?.id) {
        console.error('[addJob] API returned invalid job:', real);
        setJobs(prev => prev.filter(x => x.id !== tempId));
        throw new Error(real?.error ?? 'Failed to create job');
      }
      setJobs(prev => prev.map(x => x.id === tempId ? real : x));
      loadAppData().then(data => setNotifications(data.notifications)).catch(() => { });
      return real;
    } catch (err) {
      setJobs(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  // ── updateJobStatus ───────────────────────────────────────────────
  // Engineers  → PATCH /api/jobs/:id  (ownership-checked, status + notes only)
  // Admin/Reception → PUT /api/jobs/:id  (full update, existing behaviour)
  //
  // Both paths:
  //   1. Optimistically update local state for instant UI feedback
  //   2. Await the real API call
  //   3. On error: roll back the optimistic update and return the error message
  const updateJobStatus = async (
    jobId: string,
    status: JobStatus,
    notes?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    // Snapshot current state for rollback
    const previousJobs = jobs;
    const now = new Date().toISOString();

    // Optimistic update
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status,
      updatedAt: now,
      ...(notes !== undefined ? { repairNotes: notes } : {}),
      ...(status === 'Completed' ? { completedAt: now } : {}),
    } : j));

    try {
      const isEngineer = currentUser?.role === 'engineer';

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: isEngineer ? 'PATCH' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, repairNotes: notes }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        // Roll back optimistic update on failure
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job status.' };
      }

      return { ok: true };
    } catch {
      // Roll back on network error
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const assignEngineer = (jobId: string, engineerId: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, assignedEngineerId: engineerId, status: 'Assigned' as JobStatus, updatedAt: now }
      : j
    ));

    fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedEngineerId: engineerId, status: 'Assigned' }),
    })
      .then(() => loadAppData().then(data => setNotifications(data.notifications)))
      .catch(console.error);
  };

  // ── Part Requests ────────────────────────────────────────────────
  const addPartRequest = (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: PartRequest = { ...r, id: tempId, createdAt: new Date().toISOString(), status: 'Pending' };
    setPartRequests(prev => [...prev, optimistic]);

    fetch('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r),
    })
      .then(res => res.json())
      .then(real => setPartRequests(prev => prev.map(x => x.id === tempId ? real : x)))
      .catch(() => setPartRequests(prev => prev.filter(x => x.id !== tempId)));
  };

  const updatePartRequest = (id: string, status: PartRequestStatus) => {
    setPartRequests(prev => prev.map(r => r.id === id
      ? { ...r, status, reviewedAt: new Date().toISOString() }
      : r
    ));

    fetch(`/api/parts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(() => loadAppData().then(data => setNotifications(data.notifications)))
      .catch(console.error);
  };

  // ── Inventory ────────────────────────────────────────────────────
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { ...item, id: tempId } as InventoryItem;
    setInventory(prev => [...prev, optimistic]);

    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
      .then(res => res.json())
      .then(real => setInventory(prev => prev.map(x => x.id === tempId ? real : x)))
      .catch(() => setInventory(prev => prev.filter(x => x.id !== tempId)));
  };

  const updateInventory = (id: string, quantity: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));

    fetch('/api/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantity }),
    }).catch(console.error);
  };

  // ── Notifications ────────────────────────────────────────────────
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {
      // Revert optimistic update on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    });
  };

  // ── Sales ────────────────────────────────────────────────────────
  const addSale = async (saleData: {
    companyName: string;
    contactName: string;
    phone: string;
    notes: string;
    customerId?: string;
    items: { inventoryItemId: string; quantity: number }[];
  }): Promise<{ ok: boolean; error?: string; sale?: Sale }> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to create sale.' };

      // Add sale to state and refresh inventory + notifications (stock may have changed)
      setSales(prev => [data, ...prev]);
      const appData = await loadAppData();
      setInventory(appData.inventory);
      setNotifications(appData.notifications);

      return { ok: true, sale: data };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const getUnreadCount = (userId: string) =>
    notifications.filter(n => n.userId === userId && !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, hydrated, login, logout,
      users, customers, devices, jobs, partRequests, inventory, notifications,
      addUser, toggleUserActive, updateUser, deleteUser,
      addCustomer, addDevice, addJob, updateJobStatus, assignEngineer,
      addPartRequest, updatePartRequest,
      addInventoryItem, updateInventory,
      sales, addSale,
      markNotificationRead, getUnreadCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};