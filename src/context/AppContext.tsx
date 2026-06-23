'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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

const REFRESH_INTERVAL_MS = 90_000;

interface GlobalStateContextType {
  isLoading: boolean;
  error: string | null;
  retryLoad: () => Promise<void>;
  stats: DashboardStats | null;
  isHQ: boolean;
  branches: any[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  isPhase2Loading?: boolean;
  retryCount?: number;
}

const GlobalStateContext = createContext<GlobalStateContextType | null>(null);

const AppLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{ isLoading: boolean; error: string | null }>({
    isLoading: true,
    error: null,
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isHQ, setIsHQ] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isPhase2Loading, setIsPhase2Loading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showStaleBanner, setShowStaleBanner] = useState(false);

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
    setState((prev) => ({ ...prev, isLoading: !dataLoaded, error: null }));
    
    const fetchWithRetry = async (url: string, retriesLeft = 3, delay = 500): Promise<any> => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            const err = new Error('Session expired') as any;
            err.status = res.status;
            throw err;
          }
          throw new Error(`Server returned error ${res.status}`);
        }
        return await res.json();
      } catch (err: any) {
        if (err.status === 401 || err.status === 403) {
          throw err;
        }
        if (retriesLeft > 0) {
          setRetryCount((prev) => prev + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchWithRetry(url, retriesLeft - 1, delay * 2);
        }
        throw err;
      }
    };

    try {
      const data = await fetchWithRetry('/api/data?phase=1', 3, 500);
      setRetryCount(0);

      // Hydrate Phase 1
      if (data.jobs) jobs.setJobs(data.jobs);
      if (data.customers) customers.setCustomers(data.customers);
      if (data.devices) devices.setDevices(data.devices);
      if (data.notifications) notification.setNotifications(data.notifications);
      if (data.stats) setStats(data.stats);
      if (data.isHQ !== undefined) setIsHQ(data.isHQ);
      if (data.branches) setBranches(data.branches);

      setDataLoaded(true);
      setState({ isLoading: false, error: null });
      setShowStaleBanner(false);

      // Deferred Phase 2
      setIsPhase2Loading(true);
      (async () => {
        try {
          const p2Data = await fetchWithRetry('/api/data?phase=2', 3, 500);
          if (p2Data.users) users.setUsers(p2Data.users);
          if (p2Data.partRequests) partRequests.setPartRequests(p2Data.partRequests);
          if (p2Data.inventory) inventory.setInventory(p2Data.inventory);
          if (p2Data.sales) sales.setSales(p2Data.sales);

          try {
            const fetchedSla = await fetchSLATiersFromAPI();
            sla.setSlaTiers(fetchedSla);
          } catch (_) { /* ignore SLA load failure */ }
        } catch (err) {
          console.error('[AppLoader] Phase 2 loading failed:', err);
        } finally {
          setIsPhase2Loading(false);
        }
      })();
    } catch (err: any) {
      console.error('[AppLoader] Critical data load failed:', err);
      if (err.status === 401 || err.status === 403) {
        try {
          localStorage.removeItem('fixhub_session_user');
        } catch (_) {}
        auth.setAuth({ currentUser: null, hydrated: true });
        setState({ isLoading: false, error: 'Session expired. Please log in again.' });
      } else {
        if (dataLoaded) {
          setShowStaleBanner(true);
          setState({ isLoading: false, error: null });
        } else {
          setState({
            isLoading: false,
            error: 'Failed to synchronize data with the server. Please check your connection.',
          });
        }
      }
    }
  };

  // Restore session AFTER hydration (client only)
  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem('fixhub_session_user');
        if (stored) {
          const user = JSON.parse(stored);
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

  // Background refresh every 90 seconds when tab is visible
  useEffect(() => {
    if (!auth.currentUser || !dataLoaded) return;

    let intervalId: any = null;

    const startRefreshTimer = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(async () => {
        if (document.visibilityState === 'visible') {
          try {
            const res = await fetch('/api/data?phase=1', { credentials: 'same-origin' });
            if (res.ok) {
              const data = await res.json();
              if (data.jobs) jobs.setJobs(data.jobs);
              if (data.customers) customers.setCustomers(data.customers);
              if (data.devices) devices.setDevices(data.devices);
              if (data.notifications) notification.setNotifications(data.notifications);
              if (data.stats) setStats(data.stats);
              if (data.isHQ !== undefined) setIsHQ(data.isHQ);
              if (data.branches) setBranches(data.branches);
              setShowStaleBanner(false);
            } else {
              setShowStaleBanner(true);
            }
          } catch (e) {
            setShowStaleBanner(true);
          }
        }
      }, REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startRefreshTimer();
      } else {
        if (intervalId) clearInterval(intervalId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startRefreshTimer();

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.currentUser, dataLoaded]);

  return (
    <GlobalStateContext.Provider
      value={{
        isLoading: state.isLoading,
        error: state.error,
        retryLoad: loadData,
        stats,
        isHQ,
        branches,
        selectedBranchId,
        setSelectedBranchId,
        isPhase2Loading,
        retryCount,
      }}
    >
      {showStaleBanner && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-600/20 z-50 relative">
          <span>⚠️ Connection lost. Showing offline/stale cached data.</span>
          <button onClick={() => loadData()} className="underline hover:text-amber-900 ml-2">
            Retry
          </button>
        </div>
      )}
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

  return useMemo(
    () => ({
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
    }),
    [globalState, auth, users, customers, devices, jobs, partRequests, inventory, sales, notification, sla]
  );
};