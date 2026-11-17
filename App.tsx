import React from 'react';
import { WifiOff } from 'lucide-react';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { StoreProvider, useStore } from './context/StoreContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { InfoPage } from './pages/InfoPage';
import { TrackOrderPage } from './pages/TrackOrderPage';

const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline Mode — Cached store content shown</span>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { view } = useStore();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C241E]">
      <Header />

      <div className="flex-1">
        {view === 'home' && <HomePage />}
        {view === 'checkout' && <CheckoutPage />}
        {view === 'track' && <TrackOrderPage />}
        {view === 'about' && <InfoPage page="about" />}
        {view === 'contact' && <InfoPage page="contact" />}
        {view === 'privacy' && <InfoPage page="privacy" />}
        {view === 'terms' && <InfoPage page="terms" />}
        {view === 'shipping' && <InfoPage page="shipping" />}
        {view === 'refund' && <InfoPage page="refund" />}
        {view === 'admin' && <AdminPage />}
      </div>

      <Footer />
      <CartDrawer />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
