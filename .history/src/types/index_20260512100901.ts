export type Role = 'admin' | 'reception' | 'engineer';

// ── SLA ───────────────────────────────────────────────────────────
export type { SLATier, SLAStatus, SLAStatusLevel } from '../lib/sla';

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
  email?: string;
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

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface JobActivity {
  id: string;
  jobId: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface JobPhoto {
  id: string;
  jobId: string;
  url: string;
  type: 'before' | 'after';
  createdAt: string;
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
  checklist?: ChecklistItem[];
  rating?: number;
  feedback?: string;
  linkedJobId?: string;
  activities?: JobActivity[];
  photos?: JobPhoto[];
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

export interface SaleItem {
  id: string;
  saleId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId: string | null;
  companyName: string;
  contactName: string;
  phone: string;
  notes: string;
  totalAmount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
  jobId?: string;
}