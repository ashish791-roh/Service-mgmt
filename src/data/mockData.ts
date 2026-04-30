import type { User, Customer, Device, Job, PartRequest, InventoryItem, Notification } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'Arjun Sharma', email: 'admin@fixhub.com', password: 'admin123', role: 'admin', active: true, joinedAt: '2024-01-10' },
  { id: 'u2', name: 'Priya Mehta', email: 'reception@fixhub.com', password: 'rec123', role: 'reception', active: true, joinedAt: '2024-02-15' },
  { id: 'u3', name: 'Rohan Verma', email: 'eng1@fixhub.com', password: 'eng123', role: 'engineer', active: true, joinedAt: '2024-03-01' },
  { id: 'u4', name: 'Kiran Nair', email: 'eng2@fixhub.com', password: 'eng456', role: 'engineer', active: true, joinedAt: '2024-03-15' },
  { id: 'u5', name: 'Deepak Singh', email: 'eng3@fixhub.com', password: 'eng789', role: 'engineer', active: false, joinedAt: '2024-04-01' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'Amit Gupta', phone: '9876543210', address: '12 MG Road, Delhi', createdAt: '2026-04-01' },
  { id: 'c2', name: 'Sunita Patel', phone: '9123456789', address: '45 Nehru Nagar, Mumbai', createdAt: '2026-04-05' },
  { id: 'c3', name: 'Rajesh Kumar', phone: '9988776655', address: '7 Civil Lines, Bangalore', createdAt: '2026-04-10' },
  { id: 'c4', name: 'Meera Joshi', phone: '9765432100', address: '33 Park Street, Kolkata', createdAt: '2026-04-15' },
];

export const mockDevices: Device[] = [
  { id: 'd1', customerId: 'c1', type: 'Laptop', brand: 'Dell', model: 'Inspiron 15', serialNumber: 'DL2024001' },
  { id: 'd2', customerId: 'c2', type: 'Smartphone', brand: 'Samsung', model: 'Galaxy S23', serialNumber: 'SG2024002' },
  { id: 'd3', customerId: 'c3', type: 'Desktop', brand: 'HP', model: 'Pavilion 24', serialNumber: 'HP2024003' },
  { id: 'd4', customerId: 'c4', type: 'Tablet', brand: 'Apple', model: 'iPad Pro', serialNumber: 'AP2024004' },
];

export const mockJobs: Job[] = [
  {
    id: 'j1', customerId: 'c1', deviceId: 'd1', assignedEngineerId: 'u3',
    status: 'In Progress', problemDescription: 'Screen flickering and battery draining fast',
    estimatedCost: 3500, createdAt: '2026-04-10T09:00:00', updatedAt: '2026-04-12T11:00:00',
  },
  {
    id: 'j2', customerId: 'c2', deviceId: 'd2', assignedEngineerId: 'u4',
    status: 'Assigned', problemDescription: 'Phone not charging, screen cracked',
    estimatedCost: 5500, createdAt: '2026-04-18T10:00:00', updatedAt: '2026-04-18T12:00:00',
  },
  {
    id: 'j3', customerId: 'c3', deviceId: 'd3', assignedEngineerId: null,
    status: 'New', problemDescription: 'System not booting, blue screen error',
    estimatedCost: 2000, createdAt: '2026-04-28T09:30:00', updatedAt: '2026-04-28T09:30:00',
  },
  {
    id: 'j4', customerId: 'c4', deviceId: 'd4', assignedEngineerId: 'u3',
    status: 'Completed', problemDescription: 'iPad not connecting to WiFi',
    estimatedCost: 1500, actualCost: 1200, repairNotes: 'Replaced WiFi antenna module',
    createdAt: '2026-04-20T08:00:00', updatedAt: '2026-04-29T16:00:00', completedAt: '2026-04-29T16:00:00',
  },
  {
    id: 'j5', customerId: 'c1', deviceId: 'd1', assignedEngineerId: 'u4',
    status: 'Delivered', problemDescription: 'Keyboard keys not working properly',
    estimatedCost: 1800, actualCost: 1800,
    createdAt: '2026-04-05T11:00:00', updatedAt: '2026-04-08T15:00:00', completedAt: '2026-04-08T15:00:00',
  },
];

export const mockPartRequests: PartRequest[] = [
  { id: 'pr1', jobId: 'j1', engineerId: 'u3', partName: 'LCD Screen Panel 15"', quantity: 1, reason: 'Screen completely damaged, needs replacement', status: 'Pending', createdAt: '2026-04-12T11:00:00' },
  { id: 'pr2', jobId: 'j2', engineerId: 'u4', partName: 'Charging Port USB-C', quantity: 1, reason: 'Port pins are bent and broken', status: 'Approved', createdAt: '2026-04-18T14:00:00', reviewedAt: '2026-04-19T09:00:00' },
  { id: 'pr3', jobId: 'j4', engineerId: 'u3', partName: 'WiFi Antenna Module', quantity: 1, reason: 'Antenna completely burned out', status: 'Approved', createdAt: '2026-04-22T10:00:00', reviewedAt: '2026-04-22T16:00:00' },
];

export const mockInventory: InventoryItem[] = [
  { id: 'i1', name: 'LCD Screen Panel 15"', quantity: 3, unitCost: 2200, category: 'Display', minStock: 2 },
  { id: 'i2', name: 'Charging Port USB-C', quantity: 8, unitCost: 350, category: 'Charging', minStock: 5 },
  { id: 'i3', name: 'Laptop Battery 4000mAh', quantity: 5, unitCost: 1500, category: 'Battery', minStock: 3 },
  { id: 'i4', name: 'WiFi Antenna Module', quantity: 1, unitCost: 800, category: 'Network', minStock: 2 },
  { id: 'i5', name: 'Thermal Paste', quantity: 15, unitCost: 120, category: 'Consumable', minStock: 5 },
  { id: 'i6', name: 'RAM DDR4 8GB', quantity: 4, unitCost: 2800, category: 'Memory', minStock: 2 },
  { id: 'i7', name: 'SSD 256GB', quantity: 2, unitCost: 3500, category: 'Storage', minStock: 3 },
];

export const mockNotifications: Notification[] = [
  { id: 'n1', userId: 'u3', message: 'New job assigned: Dell Laptop - Screen flickering', read: false, createdAt: '2026-04-10T09:05:00', jobId: 'j1' },
  { id: 'n2', userId: 'u4', message: 'New job assigned: Samsung Galaxy S23 - Charging issue', read: false, createdAt: '2026-04-18T12:05:00', jobId: 'j2' },
  { id: 'n3', userId: 'u4', message: 'Part request approved: USB-C Charging Port', read: true, createdAt: '2026-04-19T09:05:00' },
  { id: 'n4', userId: 'u3', message: 'Part request approved: WiFi Antenna Module', read: true, createdAt: '2026-04-22T16:05:00' },
];
