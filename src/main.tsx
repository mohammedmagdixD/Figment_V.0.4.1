import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SWRConfig } from 'swr';
import { swrLocalStorageProvider } from './utils/swrCache.ts';

// Unregister any lingering service workers from the old PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="shelve-theme">
        <SWRConfig 
          value={{
            provider: swrLocalStorageProvider,
            revalidateOnFocus: false, // Stop network jitter on tab switch
            dedupingInterval: 60000, // 1 minute deduplication cache
            fetcher: (resource, init) => fetch(resource, init).then(res => res.json())
          }}
        >
          <App />
        </SWRConfig>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
