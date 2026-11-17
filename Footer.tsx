import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/whatsapp';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

export const Footer: React.FC = () => {
  const { settings, navigate } = useStore();
  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    `Hello ${settings.business_name}, I have an enquiry.`
  );

  return (
    <footer className="border-t border-[#E6DFD1] bg-[#F3EFE6] pt-12 pb-24 md:pb-12 text-sm text-[#4A554D]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2 space-y-3">
            <BrandLogo name={settings.business_name} logoUrl={settings.logo_url} size="sm" />
            <p className="max-w-md text-sm leading-relaxed text-[#5A655D]">
              {settings.tagline || 'Pure Dry Fruits & Healthy Seeds'} — packed fresh on order with transparent pricing.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-medium text-white hover:bg-[#143325] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp {formatWhatsAppDisplay(settings.whatsapp_number)}
              </a>
              <PWAInstallButton />
            </div>
            {settings.dispatch_address && (
              <p className="text-xs text-[#5A655D] pt-1">
                Dispatch Location: {settings.dispatch_address}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#1C241E] mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button type="button" onClick={() => navigate('home')} className="hover:text-[#1B4332] cursor-pointer">
                  Shop All Products
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('track')} className="hover:text-[#1B4332] cursor-pointer">
                  Track / My Orders
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('about')} className="hover:text-[#1B4332] cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('contact')} className="hover:text-[#1B4332] cursor-pointer">
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('admin')} className="hover:text-[#1B4332] cursor-pointer">
                  Owner Admin Login
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#1C241E] mb-3">Store Policies</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button type="button" onClick={() => navigate('shipping')} className="hover:text-[#1B4332] cursor-pointer">
                  Shipping Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('refund')} className="hover:text-[#1B4332] cursor-pointer">
                  Return &amp; Refund Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('privacy')} className="hover:text-[#1B4332] cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('terms')} className="hover:text-[#1B4332] cursor-pointer">
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#DFD7C5] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#6B756D]">
          <p>© {new Date().getFullYear()} {settings.business_name}. All rights reserved.</p>
          <p>Official WhatsApp: {formatWhatsAppDisplay(settings.whatsapp_number)}</p>
        </div>
      </div>
    </footer>
  );
};
