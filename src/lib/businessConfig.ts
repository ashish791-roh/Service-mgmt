export interface BusinessConfig {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  taxRate: number; // in percentage, e.g. 18 for 18%
  taxLabel: string;
}

export const BUSINESS_INFO: BusinessConfig = {
  shopName: 'FixHub',
  tagline: 'Device Repair & Service Centre',
  address: '123 Main Street, Sector 5, Bangalore, Karnataka - 560001',
  phone: '+91 98765 43210',
  email: 'support@fixhub.com',
  gstin: '29ABCDE1234F1Z5',
  taxRate: 18,
  taxLabel: 'GST (18%)',
};
