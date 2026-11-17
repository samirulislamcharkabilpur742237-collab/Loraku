import React from 'react';
import { Home, MessageCircle, PackageSearch, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../utils/whatsapp';
import { BrandLogo } from './BrandLogo';

export const Header: React.FC = () => {
  const { settings, cartCount, setCartOpen, view, navigate } = useStore();
  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    `Hello ${settings.business_name}, I would like to enquire about dry fruits and healthy seeds.`
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E6DFD1] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-left focus-visible:outline-2 focus-visible:outline-[#1B4332] rounded-lg cursor-pointer shrink-0"
          >
            <BrandLogo name={settings.business_name} logoUrl={settings.logo_url} size="sm" />
          </button>

          {/* Zone 2: 5 concise single-line nav links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4A554D]" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => navigate('home')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                view === 'home' ? 'text-[#1B4332] font-semibold underline underline-offset-4' : 'hover:text-[#1C241E]'
              }`}
            >
              Shop
            </button>
            <button
              type="button"
              onClick={() => navigate('track')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                view === 'track' ? 'text-[#1B4332] font-semibold underline underline-offset-4' : 'hover:text-[#1C241E]'
              }`}
            >
              My Orders
            </button>
            <button
              type="button"
              onClick={() => navigate('about')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                view === 'about' ? 'text-[#1B4332] font-semibold underline underline-offset-4' : 'hover:text-[#1C241E]'
              }`}
            >
              About Us
            </button>
            <button
              type="button"
              onClick={() => navigate('contact')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                view === 'contact' ? 'text-[#1B4332] font-semibold underline underline-offset-4' : 'hover:text-[#1C241E]'
              }`}
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => navigate('admin')}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer ${
                view === 'admin' ? 'text-[#1B4332] font-semibold underline underline-offset-4' : 'hover:text-[#1C241E]'
              }`}
            >
              Owner Admin
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#143325] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={`Open shopping cart with ${cartCount} items`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cart ({cartCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Thumb Tab Bar (Height 56px — keeps total sticky well under 15% of mobile viewport) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6DFD1] bg-white/95 backdrop-blur-md pb-safe"
        aria-label="Mobile quick navigation"
      >
        <div className="grid grid-cols-5 h-14 items-center">
          <button
            type="button"
            onClick={() => navigate('home')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              view === 'home' ? 'text-[#1B4332] font-semibold' : 'text-[#5A655D]'
            }`}
          >
            <Home className="h-5 w-5 mb-0.5" />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex flex-col items-center justify-center h-full text-[11px] font-medium text-[#5A655D] cursor-pointer relative"
          >
            <ShoppingBag className="h-5 w-5 mb-0.5" />
            <span>Cart ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('track')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              view === 'track' ? 'text-[#1B4332] font-semibold' : 'text-[#5A655D]'
            }`}
          >
            <PackageSearch className="h-5 w-5 mb-0.5" />
            <span>Orders</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center h-full text-[11px] font-medium text-[#1B4332]"
          >
            <MessageCircle className="h-5 w-5 mb-0.5" />
            <span>WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => navigate('admin')}
            className={`flex flex-col items-center justify-center h-full text-[11px] font-medium cursor-pointer ${
              view === 'admin' ? 'text-[#1B4332] font-semibold' : 'text-[#5A655D]'
            }`}
          >
            <ShieldCheck className="h-5 w-5 mb-0.5" />
            <span>Admin</span>
          </button>
        </div>
      </nav>
    </>
  );
};
