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
  shopName: process.env.NEXT_PUBLIC_SHOP_NAME || 'FixHub',
  tagline: process.env.NEXT_PUBLIC_SHOP_TAGLINE || 'Device Repair & Service Centre',
  address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || '123 Main Street, Sector 5, Bangalore, Karnataka - 560001',
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE || '+91 98765 43210',
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL || 'support@fixhub.com',
  gstin: process.env.NEXT_PUBLIC_SHOP_GSTIN || '29ABCDE1234F1Z5',
  taxRate: process.env.NEXT_PUBLIC_SHOP_TAX_RATE ? Number(process.env.NEXT_PUBLIC_SHOP_TAX_RATE) : 18,
  taxLabel: process.env.NEXT_PUBLIC_SHOP_TAX_LABEL || 'GST (18%)',
};
