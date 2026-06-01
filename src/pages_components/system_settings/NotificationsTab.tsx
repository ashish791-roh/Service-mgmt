import React from 'react';
import { Bell } from 'lucide-react';
import { SectionCard, ToggleRow, Divider, type SystemSettings } from './shared';

interface NotificationsTabProps {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ settings, set }) => {
  return (
    <SectionCard animateKey="notifs" icon={Bell} title="Admin Alert Preferences" description="Configure the in-app events that will push notifications to your admin account.">
      <ToggleRow
        label="New Job Registration"
        hint="Receive an alert instantly when reception logs a new device for repair."
        checked={settings.notifyOnNewJob}
        onChange={(v: boolean) => set('notifyOnNewJob', v)}
      />
      <Divider />
      <ToggleRow
        label="Job Resolution"
        hint="Be notified when an engineer marks a job as 'Completed' or 'Delivered'."
        checked={settings.notifyOnJobComplete}
        onChange={(v: boolean) => set('notifyOnJobComplete', v)}
      />
      <Divider />
      <ToggleRow
        label="Inventory & Parts Requests"
        hint="Alerts when an engineer requests a part that needs administrative approval."
        checked={settings.notifyOnPartsRequest}
        onChange={(v: boolean) => set('notifyOnPartsRequest', v)}
      />
    </SectionCard>
  );
};
