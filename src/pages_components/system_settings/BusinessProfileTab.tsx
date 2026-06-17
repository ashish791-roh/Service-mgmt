import React from 'react';
import { Building2, CreditCard } from 'lucide-react';
import { SectionCard, FieldRow, Input, Select, Divider, type SystemSettings } from './shared';

interface BusinessProfileTabProps {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const BusinessProfileTab: React.FC<BusinessProfileTabProps> = ({ settings, set }) => {
  return (
    <SectionCard animateKey="business" icon={Building2} title="Business Profile" description="Manage your public facing operational details.">
      <FieldRow label="Registered Name" hint="This name appears on invoices, reports, and customer emails.">
        <Input
          icon={Building2}
          value={settings.shopName}
          onChange={(v: string) => set('shopName', v)}
          placeholder="e.g. FixHub Service Center"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Primary Phone" hint="The main contact line for customer inquiries.">
        <Input
          value={settings.shopPhone}
          onChange={(v: string) => set('shopPhone', v)}
          placeholder="e.g. +91 98765 43210"
          type="tel"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Support Email" hint="Monitored email address for support requests.">
        <Input
          value={settings.shopEmail}
          onChange={(v: string) => set('shopEmail', v)}
          placeholder="e.g. support@fixhub.in"
          type="email"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Physical Address" hint="Where devices are dropped off and serviced.">
        <textarea
          value={settings.shopAddress}
          onChange={e => set('shopAddress', e.target.value)}
          placeholder="e.g. 12, MG Road, Bengaluru, Karnataka 560001"
          rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10 transition-all duration-200 resize-none"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Registered GSTIN" hint="Your business 15-digit GSTIN used for Tally matching and invoicing.">
        <Input
          value={settings.gstin || ''}
          onChange={(v: string) => set('gstin', v)}
          placeholder="e.g. 29ABCDE1234F1Z5"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Default Tax Rate (%)" hint="Default GST rate in percentage applied to service charges.">
        <Input
          value={settings.taxRate !== undefined ? settings.taxRate : 18}
          onChange={(v: string) => set('taxRate', parseFloat(v) || 0)}
          type="number"
          placeholder="18"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Tax Label" hint="The label printed on invoices next to the tax rate (e.g. GST).">
        <Input
          value={settings.taxLabel || ''}
          onChange={(v: string) => set('taxLabel', v)}
          placeholder="GST"
        />
      </FieldRow>
      <Divider />
      <FieldRow label="Billing Currency" hint="Set the base currency for all estimates and sales.">
        <Select
          icon={CreditCard}
          value={settings.currency}
          onChange={(v: string) => set('currency', v)}
          options={[
            { value: 'INR', label: '₹ (INR) — Indian Rupee' },
            { value: 'USD', label: '$ (USD) — US Dollar' },
            { value: 'EUR', label: '€ (EUR) — Euro' },
            { value: 'GBP', label: '£ (GBP) — British Pound' },
            { value: 'AED', label: 'د.إ (AED) — UAE Dirham' },
          ]}
        />
      </FieldRow>
    </SectionCard>
  );
};
