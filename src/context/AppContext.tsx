'use client';

import React, { createContext, useContext, useState } from 'react';
import type { User, Customer, Device, Job, PartRequest, InventoryItem, Notification, Role, JobStatus, PartRequestStatus } from '../types';
import {
  mockUsers, mockCustomers, mockDevices, mockJobs,
  mockPartRequests, mockInventory, mockNotifications,
} from '../data/mockData';

// ── Context shape ─────────────────────────────────────────────
interface AppContextType {
  // Auth
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Data
  users: User[];
  customers: Customer[];
  devices: Device[];
  jobs: Job[];
  partRequests: PartRequest[];
  inventory: InventoryItem[];
  notifications: Notification[];

  // Users
  addUser: (user: Omit<User, 'id'>) => void;
  toggleUserActive: (userId: string) => void;

  // Customers / Devices / Jobs
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  addDevice: (d: Omit<Device, 'id'>) => Device;
  addJob: (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Job;
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string) => void;
  assignEngineer: (jobId: string, engineerId: string) => void;

  // Parts
  addPartRequest: (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => void;
  updatePartRequest: (id: string, status: PartRequestStatus) => void;

  // Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventory: (id: string, quantity: number) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  getUnreadCount: (userId: string) => number;
}

const AppContext = createContext<AppContextType | null>(null);

let userIdCounter   = 100;
let custIdCounter   = 100;
let devIdCounter    = 100;
let jobIdCounter    = 100;
let partIdCounter   = 100;
let invIdCounter    = 100;
let notifIdCounter  = 100;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers]             = useState<User[]>(mockUsers);
  const [customers, setCustomers]     = useState<Customer[]>(mockCustomers);
  const [devices, setDevices]         = useState<Device[]>(mockDevices);
  const [jobs, setJobs]               = useState<Job[]>(mockJobs);
  const [partRequests, setPartRequests] = useState<PartRequest[]>(mockPartRequests);
  const [inventory, setInventory]     = useState<InventoryItem[]>(mockInventory);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // ── Auth ──────────────────────────────────────────────────
  const login = (email: string, password: string): boolean => {
    const user = users.find(u => u.email === email && u.password === password && u.active);
    if (user) { setCurrentUser(user); return true; }
    return false;
  };
  const logout = () => setCurrentUser(null);

  // ── Users ────────────────────────────────────────────────
  const addUser = (user: Omit<User, 'id'>) => {
    const newUser: User = { ...user, id: `u${++userIdCounter}` };
    setUsers(prev => [...prev, newUser]);
  };
  const toggleUserActive = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
  };

  // ── Customers / Devices / Jobs ───────────────────────────
  const addCustomer = (c: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCust: Customer = { ...c, id: `c${++custIdCounter}`, createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, newCust]);
    return newCust;
  };
  const addDevice = (d: Omit<Device, 'id'>): Device => {
    const newDev: Device = { ...d, id: `d${++devIdCounter}` };
    setDevices(prev => [...prev, newDev]);
    return newDev;
  };
  const addJob = (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Job => {
    const now = new Date().toISOString();
    const newJob: Job = { ...j, id: `j${++jobIdCounter}`, createdAt: now, updatedAt: now };
    setJobs(prev => [...prev, newJob]);

    // Notify engineer if assigned
    if (j.assignedEngineerId) {
      const eng = users.find(u => u.id === j.assignedEngineerId);
      if (eng) {
        const notif: Notification = {
          id: `n${++notifIdCounter}`,
          userId: j.assignedEngineerId,
          message: `New job assigned: ${j.problemDescription.substring(0, 50)}`,
          read: false,
          createdAt: now,
          jobId: newJob.id,
        };
        setNotifications(prev => [...prev, notif]);
      }
    }
    return newJob;
  };

  const updateJobStatus = (jobId: string, status: JobStatus, notes?: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status,
      updatedAt: now,
      ...(notes ? { repairNotes: notes } : {}),
      ...(status === 'Completed' || status === 'Delivered' ? { completedAt: now } : {}),
    } : j));
  };

  const assignEngineer = (jobId: string, engineerId: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, assignedEngineerId: engineerId, status: 'Assigned' as JobStatus, updatedAt: now }
      : j
    ));
    const eng = users.find(u => u.id === engineerId);
    const job = jobs.find(j => j.id === jobId);
    if (eng && job) {
      const notif: Notification = {
        id: `n${++notifIdCounter}`,
        userId: engineerId,
        message: `New job assigned: ${job.problemDescription.substring(0, 50)}`,
        read: false,
        createdAt: now,
        jobId,
      };
      setNotifications(prev => [...prev, notif]);
    }
  };

  // ── Part Requests ────────────────────────────────────────
  const addPartRequest = (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: PartRequest = { ...r, id: `pr${++partIdCounter}`, createdAt: new Date().toISOString(), status: 'Pending' };
    setPartRequests(prev => [...prev, newReq]);
  };

  const updatePartRequest = (id: string, status: PartRequestStatus) => {
    const now = new Date().toISOString();
    setPartRequests(prev => prev.map(r => r.id === id ? { ...r, status, reviewedAt: now } : r));

    // Notify engineer
    const req = partRequests.find(r => r.id === id);
    if (req) {
      const notif: Notification = {
        id: `n${++notifIdCounter}`,
        userId: req.engineerId,
        message: `Part request ${status.toLowerCase()}: ${req.partName}`,
        read: false,
        createdAt: now,
      };
      setNotifications(prev => [...prev, notif]);
    }
  };

  // ── Inventory ────────────────────────────────────────────
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = { ...item, id: `i${++invIdCounter}` };
    setInventory(prev => [...prev, newItem]);
  };
  const updateInventory = (id: string, quantity: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  };

  // ── Notifications ────────────────────────────────────────
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const getUnreadCount = (userId: string) =>
    notifications.filter(n => n.userId === userId && !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, login, logout,
      users, customers, devices, jobs, partRequests, inventory, notifications,
      addUser, toggleUserActive,
      addCustomer, addDevice, addJob, updateJobStatus, assignEngineer,
      addPartRequest, updatePartRequest,
      addInventoryItem, updateInventory,
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
