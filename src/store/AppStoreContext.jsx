import { createContext, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { createAppStore } from './appStore';

const AppStoreContext = createContext(null);

export function AppStoreProvider({ cloudData, children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createAppStore(cloudData);
  }
  return (
    <AppStoreContext.Provider value={storeRef.current}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(selector) {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error('useAppStore must be used within AppStoreProvider');
  return useStore(store, selector);
}
