export type Role = 'admin' | 'reception' | 'engineer';

export type JobStatus = 'New' | 'Assigned' | 'In Progress' | 'Completed' | 'Delivered';

export type PartRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  avatar?: string;
  joinedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Device {
  id: string;
  customerId: string;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
}

export interface Job {
  id: string;
  customerId: string;
  deviceId: string;
  assignedEngineerId: string | null;
  status: JobStatus;
  problemDescription: string;
  estimatedCost: number;
  actualCost?: number;
  repairNotes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PartRequest {
  id: string;
  jobId: string;
  engineerId: string;
  partName: string;
  quantity: number;
  reason: string;
  status: PartRequestStatus;
  createdAt: string;
  reviewedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  category: string;
  minStock: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
  jobId?: string;
}
