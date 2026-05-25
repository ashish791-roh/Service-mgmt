'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User, Customer, Device, Job, PartRequest, JobPhoto,
  InventoryItem, Notification, JobStatus, PartRequestStatus, Sale,
} from '../types';
import {
  loadSLATiers, getSLAStatus as computeSLAStatus,
  fetchSLATiersFromAPI, saveSLATiersToAPI,
  type SLATier, type SLAStatus,
} from '../lib/sla';
import {
  loadWarrantyConfig,
  fetchWarrantyConfigFromAPI,
  type WarrantyEntry,
} from '../lib/warrantyConfig';

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
  updateCustomer: (id: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'email'>>) => Promise<{ ok: boolean; error?: string }>;
  deleteCustomer: (id: string) => Promise<{ ok: boolean; error?: string }>;
  deleteJob: (id: string) => Promise<{ ok: boolean; error?: string }>;
  addDevice: (d: Omit<Device, 'id'>) => Promise<Device>;
  addJob: (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Job>;
  updateJob: (jobId: string, data: { problemDescription?: string; estimatedCost?: number; advanceAmount?: number; assignedEngineerId?: string | null; reassignReason?: string }) => Promise<{ ok: boolean; error?: string }>;
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string, checklist?: any[], rating?: number, feedback?: string, linkedJobId?: string) => Promise<{ ok: boolean; error?: string }>;
  uploadJobPhoto: (jobId: string, file: File, type: 'before' | 'after') => Promise<{ ok: boolean; error?: string; photo?: JobPhoto }>;
  assignEngineer: (jobId: string, engineerId: string, reassignReason?: string) => void;
  addPartRequest: (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => void;
  updatePartRequest: (id: string, status: PartRequestStatus) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventory: (id: string, quantity: number) => void;
  editInventoryItem: (id: string, data: { unitCost?: number; minStock?: number }) => void;
  deleteInventoryItem: (id: string) => void;
  sales: Sale[];
  addSale: (sale: { companyName: string; contactName: string; phone: string; notes: string; customerId?: string; items: { inventoryItemId: string; quantity: number; unitPrice?: number }[] }) => Promise<{ ok: boolean; error?: string; sale?: Sale }>;
  markSalePaid: (saleId: string) => Promise<{ ok: boolean; error?: string }>;
  markNotificationRead: (id: string) => void;
  postAnnouncement: (message: string) => Promise<{ ok: boolean; error?: string }>;
  getUnreadCount: (userId: string) => number;
  // ── SLA ────────────────────────────────────────────────────────
  slaTiers: SLATier[];
  updateSLATiers: (tiers: SLATier[]) => void;
  getJobSLAStatus: (job: Job, deviceType?: string) => SLAStatus;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Session is now managed via HttpOnly cookie on the server.
// The frontend stores only the user profile (no token) in localStorage
// for UI purposes (survives page refresh). The actual auth token is
// never accessible to JS — it lives in the HttpOnly cookie only.
const SESSION_KEY = 'fixhub_session_user';

// ── CSRF helper ───────────────────────────────────────────────────
// Reads the fixhub_csrf cookie (not HttpOnly) and returns its value
// so it can be echoed in the x-csrf-token header on every mutating request.
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie
      .split('; ')
      .find(r => r.startsWith('fixhub_csrf='))
      ?.split('=')[1] ?? ''
  );
}

// ── JSON headers with CSRF ────────────────────────────────────────
function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-csrf-token': getCsrfToken(),
  };
}

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
  const [slaTiers, setSlaTiers] = useState<SLATier[]>(loadSLATiers);
  const [warrantyEntries, setWarrantyEntries] = useState<WarrantyEntry[]>(loadWarrantyConfig);

  const setters = { setUsers, setCustomers, setDevices, setJobs, setPartRequests, setInventory, setNotifications, setSales };

  // ── Listen for config changes from other tabs/windows ────────────────
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fixhub_sla_tiers' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as SLATier[];
          setSlaTiers(updated);
        } catch { /* ignore */ }
      }
      if (e.key === 'fixhub_warranty_config' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as WarrantyEntry[];
          setWarrantyEntries(updated);
        } catch { /* ignore */ }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
            setAuth({ currentUser: user, hydrated: true });
            applyAppData(data, setters);

            const slaTiers = await fetchSLATiersFromAPI();
            setSlaTiers(slaTiers);
            const warranty = await fetchWarrantyConfigFromAPI();
            setWarrantyEntries(warranty);

            return;
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch { /**/ }
      setAuth({ currentUser: null, hydrated: true });
    };
    restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth ─────────────────────────────────────────────────────────
  // Login does NOT use jsonHeaders() — no CSRF token exists yet at this point.
  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error ?? 'Invalid credentials — please try again.' };
      }

      const user: User = data.user;
      setCurrentUser(user);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) { /**/ }

      const appData = await loadAppData();
      applyAppData(appData, setters);

      const slaTiers = await fetchSLATiersFromAPI();
      setSlaTiers(slaTiers);
      const warranty = await fetchWarrantyConfigFromAPI();
      setWarrantyEntries(warranty);

      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/login', {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
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
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
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

  // ── Customers ────────────────────────────────────────────────────
  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Customer = { ...c, id: tempId, createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: jsonHeaders(),
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

  const updateCustomer = async (id: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'email'>>): Promise<{ ok: boolean; error?: string }> => {
    // Optimistic update — apply immediately so the UI feels instant
    let previous: Customer | undefined;
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c;
      previous = c;
      return { ...c, ...data };
    }));

    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        // Roll back optimistic update on failure
        if (previous) setCustomers(prev => prev.map(c => c.id === id ? previous! : c));
        return { ok: false, error: json.error ?? 'Failed to update customer.' };
      }
      // Reconcile with server response (picks up server-generated fields like updatedAt)
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...json } : c));
      return { ok: true };
    } catch {
      // Roll back on network error
      if (previous) setCustomers(prev => prev.map(c => c.id === id ? previous! : c));
      return { ok: false, error: 'Network error.' };
    }
  };

  const deleteCustomer = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    // Optimistic removal — hide the customer immediately so UI feels instant
    let removed: Customer | undefined;
    setCustomers(prev => {
      removed = prev.find(c => c.id === id);
      return prev.filter(c => c.id !== id);
    });

    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json();
        // Roll back — put the customer back in place
        if (removed) setCustomers(prev => [...prev, removed!]);
        return { ok: false, error: json.error ?? 'Failed to delete customer.' };
      }
      return { ok: true };
    } catch {
      // Roll back on network error
      if (removed) setCustomers(prev => [...prev, removed!]);
      return { ok: false, error: 'Network error.' };
    }
  };

  const deleteJob = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json();
        return { ok: false, error: json.error ?? 'Failed to delete job.' };
      }
      setJobs(prev => prev.filter(j => j.id !== id));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error.' };
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
        headers: jsonHeaders(),
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
        headers: jsonHeaders(),
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

  const updateJobStatus = async (
    jobId: string,
    status: JobStatus,
    notes?: string,
    checklist?: any[],
    rating?: number,
    feedback?: string,
    linkedJobId?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const previousJobs = jobs;
    const now = new Date().toISOString();

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status,
      updatedAt: now,
      ...(notes !== undefined ? { repairNotes: notes } : {}),
      ...(checklist !== undefined ? { checklist } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
      ...(linkedJobId !== undefined ? { linkedJobId } : {}),
      ...(status === 'Completed' ? { completedAt: now } : {}),
    } : j));

    try {
      const isEngineer = currentUser?.role === 'engineer';

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: isEngineer ? 'PATCH' : 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ status, repairNotes: notes, checklist, rating, feedback, linkedJobId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job status.' };
      }

      return { ok: true };
    } catch {
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const uploadJobPhoto = async (jobId: string, file: File, type: 'before' | 'after'): Promise<{ ok: boolean; error?: string; photo?: JobPhoto }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: 'POST',
        // No Content-Type — browser sets it with multipart boundary.
        // CSRF header is still required.
        headers: { 'x-csrf-token': getCsrfToken() },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to upload photo.' };
      }

      setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          const newPhotos = [...(j.photos || []), data];
          return { ...j, photos: newPhotos };
        }
        return j;
      }));

      return { ok: true, photo: data };
    } catch (err) {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const assignEngineer = (jobId: string, engineerId: string, reassignReason?: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, assignedEngineerId: engineerId, status: 'Assigned' as JobStatus, updatedAt: now }
      : j
    ));

    fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ assignedEngineerId: engineerId, status: 'Assigned', ...(reassignReason ? { reassignReason } : {}) }),
    })
      .then(() => loadAppData().then(data => setNotifications(data.notifications)))
      .catch(console.error);
  };

  const updateJob = async (
    jobId: string,
    data: {
      problemDescription?: string;
      estimatedCost?: number;
      advanceAmount?: number;
      assignedEngineerId?: string | null;
      reassignReason?: string;
    }
  ): Promise<{ ok: boolean; error?: string }> => {
    const previousJobs = jobs;
    const now = new Date().toISOString();

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      updatedAt: now,
      ...(data.problemDescription !== undefined ? { problemDescription: data.problemDescription } : {}),
      ...(data.estimatedCost !== undefined ? { estimatedCost: data.estimatedCost } : {}),
      ...(data.advanceAmount !== undefined ? { advanceAmount: data.advanceAmount } : {}),
      ...(data.assignedEngineerId !== undefined ? { assignedEngineerId: data.assignedEngineerId } : {}),
    } : j));

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job.' };
      }

      const updated = await res.json().catch(() => null);
      if (updated?.id) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updated } : j));
      }

      return { ok: true };
    } catch {
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  // ── Part Requests ────────────────────────────────────────────────
  const addPartRequest = (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: PartRequest = { ...r, id: tempId, createdAt: new Date().toISOString(), status: 'Pending' };
    setPartRequests(prev => [...prev, optimistic]);

    fetch('/api/parts', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(r),
    })
      .then(res => res.json())
      .then(real => setPartRequests(prev => prev.map(x => x.id === tempId ? {
        ...real,
        inventoryStatus: real.inventoryStatus,
        inventoryQuantity: real.inventoryQuantity,
        inventoryMinStock: real.inventoryMinStock,
      } : x)))
      .catch(() => setPartRequests(prev => prev.filter(x => x.id !== tempId)));
  };

  const updatePartRequest = (id: string, status: PartRequestStatus) => {
    setPartRequests(prev => prev.map(r => r.id === id
      ? { ...r, status, reviewedAt: new Date().toISOString() }
      : r
    ));

    fetch(`/api/parts/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ status }),
    })
      .then(() => loadAppData().then(data => {
        setNotifications(data.notifications);
        if (status === 'Approved') {
          setJobs(data.jobs);
        }
      }))
      .catch(console.error);
  };

  // ── Inventory ────────────────────────────────────────────────────
  const promoteAwaitingStockRequests = async (updatedInventory: InventoryItem[]) => {
    setPartRequests(prev => {
      const toPromote = prev.filter(r => {
        if (r.status !== 'AwaitingStock') return false;
        const match = updatedInventory.find(
          i => i.name.toLowerCase() === r.partName.toLowerCase()
        );
        return match && match.quantity > 0;
      });

      if (toPromote.length === 0) return prev;

      const next = prev.map(r =>
        toPromote.some(p => p.id === r.id)
          ? { ...r, status: 'Pending' as const, inventoryStatus: 'available' as const }
          : r
      );

      toPromote.forEach(r => {
        fetch(`/api/parts/${r.id}`, {
          method: 'PATCH',
          headers: { 'x-csrf-token': getCsrfToken() },
        }).catch(console.error);
      });

      return next;
    });
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { ...item, id: tempId } as InventoryItem;
    setInventory(prev => [...prev, optimistic]);

    fetch('/api/inventory', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(item),
    })
      .then(res => res.json())
      .then(real => {
        setInventory(prev => {
          const next = prev.map(x => x.id === tempId ? real : x);
          promoteAwaitingStockRequests(next);
          return next;
        });
      })
      .catch(() => setInventory(prev => prev.filter(x => x.id !== tempId)));
  };

  const updateInventory = (id: string, quantity: number) => {
    setInventory(prev => {
      const next = prev.map(i => i.id === id ? { ...i, quantity } : i);
      if (quantity > 0) promoteAwaitingStockRequests(next);
      return next;
    });

    fetch('/api/inventory', {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ id, quantity }),
    }).catch(console.error);
  };

  const editInventoryItem = (id: string, data: { unitCost?: number; minStock?: number }) => {
    setInventory(prev => prev.map(i => i.id === id ? {
      ...i,
      ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
      ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
    } : i));

    fetch('/api/inventory', {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ id, ...data }),
    }).catch(console.error);
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));

    fetch(`/api/inventory?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrfToken() },
    })
      .then(res => { if (!res.ok) throw new Error(); })
      .catch(() => {
        console.error('Failed to delete inventory item');
      });
  };

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
      const appData = await loadAppData();
      setNotifications(appData.notifications);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  // ── Sales ────────────────────────────────────────────────────────
  const addSale = async (saleData: {
    companyName: string;
    contactName: string;
    phone: string;
    notes: string;
    customerId?: string;
    items: { inventoryItemId: string; quantity: number; unitPrice?: number }[];
  }): Promise<{ ok: boolean; error?: string; sale?: Sale }> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to create sale.' };

      setSales(prev => [data, ...prev]);
      const appData = await loadAppData();
      setInventory(appData.inventory);
      setNotifications(appData.notifications);

      return { ok: true, sale: data };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const markSalePaid = async (saleId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to mark sale as paid.' };

      setSales(prev => prev.map(s => s.id === saleId ? { ...s, paidAt: data.paidAt } : s));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  // ── SLA ──────────────────────────────────────────────────────────
  const updateSLATiers = async (tiers: SLATier[]) => {
    setSlaTiers(tiers);
    await saveSLATiersToAPI(tiers);
  };

  const getJobSLAStatus = (job: Job, deviceType?: string): SLAStatus => {
    return computeSLAStatus(job.createdAt, job.status, deviceType, slaTiers);
  };

  const getUnreadCount = (userId: string) =>
    notifications.filter(n => n.userId === userId && !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, hydrated, login, logout,
      users, customers, devices, jobs, partRequests, inventory, notifications,
      addUser, toggleUserActive, updateUser, deleteUser,
      addCustomer, updateCustomer, deleteCustomer, addDevice, addJob, updateJob, updateJobStatus, uploadJobPhoto, assignEngineer,
      addPartRequest, updatePartRequest,
      addInventoryItem, updateInventory, editInventoryItem, deleteInventoryItem,
      sales, addSale, markSalePaid,
      markNotificationRead, postAnnouncement, getUnreadCount,
      slaTiers, updateSLATiers, getJobSLAStatus,
      deleteJob,
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