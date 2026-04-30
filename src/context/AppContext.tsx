import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User, Customer, Device, Job, PartRequest, InventoryItem, Notification, JobStatus, PartRequestStatus } from '../types';
import { mockUsers, mockCustomers, mockDevices, mockJobs, mockPartRequests, mockInventory, mockNotifications } from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  users: User[];
  customers: Customer[];
  devices: Device[];
  jobs: Job[];
  partRequests: PartRequest[];
  inventory: InventoryItem[];
  notifications: Notification[];
  addUser: (user: Omit<User, 'id'>) => void;
  toggleUserActive: (userId: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  addDevice: (device: Omit<Device, 'id'>) => Device;
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string) => void;
  assignEngineer: (jobId: string, engineerId: string) => void;
  addPartRequest: (req: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => void;
  updatePartRequest: (reqId: string, status: PartRequestStatus) => void;
  markNotificationRead: (notifId: string) => void;
  getUnreadCount: (userId: string) => number;
  // Inventory management
  updateInventory: (itemId: string, changes: Partial<InventoryItem>) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  // Billing
  updateActualCost: (jobId: string, actualCost: number) => void;
}

const AppContext = createContext<AppContextType | null>(null);

let idCounter = 100;
const genId = (prefix: string) => `${prefix}${++idCounter}`;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [partRequests, setPartRequests] = useState<PartRequest[]>(mockPartRequests);
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const login = useCallback((email: string, password: string): boolean => {
    const user = users.find(u => u.email === email && u.password === password && u.active);
    if (user) { setCurrentUser(user); return true; }
    return false;
  }, [users]);

  const logout = useCallback(() => setCurrentUser(null), []);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    setUsers(prev => [...prev, { ...user, id: genId('u') }]);
  }, []);

  const toggleUserActive = useCallback((userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
  }, []);

  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCustomer = { ...customer, id: genId('c'), createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  const addDevice = useCallback((device: Omit<Device, 'id'>): Device => {
    const newDevice = { ...device, id: genId('d') };
    setDevices(prev => [...prev, newDevice]);
    return newDevice;
  }, []);

  const addJob = useCallback((job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newJob: Job = { ...job, id: genId('j'), createdAt: now, updatedAt: now };
    setJobs(prev => [...prev, newJob]);
    if (job.assignedEngineerId) {
      const notif: Notification = {
        id: genId('n'), userId: job.assignedEngineerId,
        message: `New job assigned: ${job.problemDescription.substring(0, 50)}`,
        read: false, createdAt: now, jobId: newJob.id,
      };
      setNotifications(prev => [...prev, notif]);
    }
  }, []);

  const updateJobStatus = useCallback((jobId: string, status: JobStatus, notes?: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j, status, updatedAt: new Date().toISOString(),
      repairNotes: notes ?? j.repairNotes,
      completedAt: status === 'Completed' ? new Date().toISOString() : j.completedAt,
    } : j));
  }, []);

  const assignEngineer = useCallback((jobId: string, engineerId: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, assignedEngineerId: engineerId, status: 'Assigned', updatedAt: now } : j));
    const job = jobs.find(j => j.id === jobId);
    const notif: Notification = {
      id: genId('n'), userId: engineerId,
      message: `Job assigned to you: ${job?.problemDescription.substring(0, 50) ?? 'New job'}`,
      read: false, createdAt: now, jobId,
    };
    setNotifications(prev => [...prev, notif]);
  }, [jobs]);

  const addPartRequest = useCallback((req: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => {
    setPartRequests(prev => [...prev, { ...req, id: genId('pr'), status: 'Pending', createdAt: new Date().toISOString() }]);
  }, []);

  const updatePartRequest = useCallback((reqId: string, status: PartRequestStatus) => {
    setPartRequests(prev => prev.map(r => r.id === reqId ? { ...r, status, reviewedAt: new Date().toISOString() } : r));
    const req = partRequests.find(r => r.id === reqId);
    if (req) {
      const notif: Notification = {
        id: genId('n'), userId: req.engineerId,
        message: `Part request ${status.toLowerCase()}: ${req.partName}`,
        read: false, createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [...prev, notif]);
    }
  }, [partRequests]);

  const markNotificationRead = useCallback((notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  }, []);

  const getUnreadCount = useCallback((userId: string) => {
    return notifications.filter(n => n.userId === userId && !n.read).length;
  }, [notifications]);

  // ── Inventory management ──────────────────────────────────────
  const updateInventory = useCallback((itemId: string, changes: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => i.id === itemId ? { ...i, ...changes } : i));
  }, []);

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id'>) => {
    setInventory(prev => [...prev, { ...item, id: genId('inv') }]);
  }, []);

  // ── Billing ───────────────────────────────────────────────────
  const updateActualCost = useCallback((jobId: string, actualCost: number) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, actualCost, updatedAt: new Date().toISOString() } : j));
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      users, customers, devices, jobs, partRequests, inventory, notifications,
      addUser, toggleUserActive, addCustomer, addDevice, addJob,
      updateJobStatus, assignEngineer, addPartRequest, updatePartRequest,
      markNotificationRead, getUnreadCount,
      updateInventory, addInventoryItem,
      updateActualCost,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};