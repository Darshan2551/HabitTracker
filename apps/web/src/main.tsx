import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import { App } from '@/app/App';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/store/auth-store';
import '@/styles/index.css';

registerSW({ immediate: true });

useAuthStore.getState().setHydrated();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
