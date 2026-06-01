'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserProvider, useUsers } from './UserContext';
import { CustomerProvider, useCustomers } from './CustomerContext';
import { DeviceProvider, useDevices } from './DeviceContext';
import { JobProvider, useJobs } from './JobContext';
import { PartRequestProvider, usePartRequests } from './PartRequestContext';
import { InventoryProvider, useInventory } from './InventoryContext';
import { SaleProvider, useSales } from './SaleContext';
import { NotificationProvider, useNotifications } from './NotificationContext';
import { SLAProvider, useSLA } from './SLAContext';
import { fetchSLATiersFromAPI } from '../lib/sla';
import type { DashboardStats } from '../types';

interface GlobalStateContextType {
  isLoading: boolean;
  error: string | null;
  retryLoad: () => Promise<void>;
  stats: DashboardStats | null;
}

const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

const AppLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ isLoading: boolean; error: string | null }>({
    isLoading: true,
    error: null,
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const auth = useAuth();
  const users = useUsers();
  const customers = useCustomers();
  const devices = useDevices();
  const jobs = useJobs();
  const partRequests = usePartRequests();
  const inventory = useInventory();
  const sales = useSales();
  const notification = useNotifications();
  const sla = useSLA();

  const loadData = async () => {
    setState({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/data', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        
        // Hydrate all contexts
        if (data.users) users.setUsers(data.users);
        if (data.customers) customers.setCustomers(data.customers);
        if (data.devices) devices.setDevices(data.devices);
        if (data.jobs) jobs.setJobs(data.jobs);
        if (data.partRequests) partRequests.setPartRequests(data.partRequests);
        if (data.inventory) inventory.setInventory(data.inventory);
        if (data.notifications) notification.setNotifications(data.notifications);
        if (data.sales) sales.setSales(data.sales);
        if (data.stats) setStats(data.stats);

        try {
          const fetchedSla = await fetchSLATiersFromAPI();
          sla.setSlaTiers(fetchedSla);
        } catch (_) { /* ignore SLA load failure */ }

        setDataLoaded(true);
        setState({ isLoading: false, error: null });
      } else {
        if (res.status === 401 || res.status === 403) {
          try {
            localStorage.removeItem('fixhub_session_user');
          } catch (_) {
            // ignore
          }
          auth.setAuth({ currentUser: null, hydrated: true });
          setState({ isLoading: false, error: 'Session expired. Please log in again.' });
        } else {
          setState({ isLoading: false, error: 'Server returned error while loading configuration.' });
        }
      }
    } catch (err) {
      console.error('[AppLoader] Initial data load failed:', err);
      setState({ isLoading: false, error: 'Failed to synchronize data with the server. Please check your connection.' });
    }
  };

  // Restore session AFTER hydration (client only)
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem('fixhub_session_user');
        if (stored) {
          const user = JSON.parse(stored);
          // Set user profile (hydrated = true)
          auth.setAuth({ currentUser: user, hydrated: true });
        } else {
          auth.setAuth({ currentUser: null, hydrated: true });
          setState({ isLoading: false, error: null });
        }
      } catch {
        auth.setAuth({ currentUser: null, hydrated: true });
        setState({ isLoading: false, error: null });
      }
    };
    restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch initial data when user becomes authenticated
  useEffect(() => {
    if (auth.currentUser && !dataLoaded) {
      loadData();
    } else if (!auth.currentUser) {
      setDataLoaded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.currentUser]);

  return (
    <GlobalStateContext.Provider value={{ isLoading: state.isLoading, error: state.error, retryLoad: loadData, stats }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <JobProvider>
          <PartRequestProvider>
            <InventoryProvider>
              <SaleProvider>
                <UserProvider>
                  <CustomerProvider>
                    <DeviceProvider>
                      <SLAProvider>
                        <AppLoader>{children}</AppLoader>
                      </SLAProvider>
                    </DeviceProvider>
                  </CustomerProvider>
                </UserProvider>
              </SaleProvider>
            </InventoryProvider>
          </PartRequestProvider>
        </JobProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export const useApp = () => {
  const globalState = useContext(GlobalStateContext);
  if (!globalState) {
    throw new Error('useApp must be used within AppProvider');
  }

  const auth = useAuth();
  const users = useUsers();
  const customers = useCustomers();
  const devices = useDevices();
  const jobs = useJobs();
  const partRequests = usePartRequests();
  const inventory = useInventory();
  const sales = useSales();
  const notification = useNotifications();
  const sla = useSLA();

  return {
    ...globalState,
    ...auth,
    ...users,
    ...customers,
    ...devices,
    ...jobs,
    ...partRequests,
    ...inventory,
    ...sales,
    ...notification,
    ...sla,
  };
};