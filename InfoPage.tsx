import React from 'react';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { AppView } from '../types';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/whatsapp';

interface InfoPageProps {
  page: Extract<AppView, 'about' | 'contact' | 'privacy' | 'terms' | 'shipping' | 'refund'>;
}

export const InfoPage: React.FC<InfoPageProps> = ({ page }) => {
  const { settings, navigate } = useStore();

  const contentMap: Record<
    InfoPageProps['page'],
    { title: string; body: string }
  > = {
    about: {
      title: `About ${settings.business_name}`,
      body: settings.about_us,
    },
    contact: {
      title: 'Contact Us',
      body: settings.contact_info,
    },
    privacy: {
      title: 'Privacy Policy',
      body: settings.privacy_policy,
    },
    terms: {
      title: 'Terms & Conditions',
      body: settings.terms_conditions,
    },
    shipping: {
      title: 'Shipping & Delivery Policy',
      body: settings.shipping_policy,
    },
    refund: {
      title: 'Return & Refund Policy',
      body: settings.return_refund_policy,
    },
  };

  const current = contentMap[page];
  const waUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    `Hello ${settings.business_name}, I have a question regarding your store.`
  );

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 pb-24">
      <div className="rounded-2xl border border-[#E6DFD1] bg-white p-6 sm:p-10 space-y-6">
        <div className="border-b border-[#EFE9DC] pb-4">
          <p className="text-xs font-semibold text-[#2D6A4F]">{settings.business_name}</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-[#1C241E]">
            {current.title}
          </h1>
        </div>

        <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[#354038] whitespace-pre-line">
          {current.body}
        </div>

        {(page === 'contact' || page === 'about' || page === 'shipping' || page === 'refund') && (
          <div className="rounded-xl bg-[#FAF8F5] border border-[#E6DFD1] p-5 space-y-3 text-sm">
            <p className="font-semibold text-[#1C241E]">Official Store Contact</p>
            <div className="space-y-2 text-[#4A554D]">
              <p className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#1B4332]" />
                <span>WhatsApp: {formatWhatsAppDisplay(settings.whatsapp_number)}</span>
              </p>
              {settings.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#1B4332]" />
                  <span>Email: {settings.contact_email}</span>
                </p>
              )}
              {settings.dispatch_address && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#1B4332]" />
                  <span>Dispatch Address: {settings.dispatch_address}</span>
                </p>
              )}
            </div>
            <div className="pt-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143325]"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on Official WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-sm font-semibold text-[#1B4332] hover:underline cursor-pointer"
          >
            ← Back to Store
          </button>
        </div>
      </div>
    </main>
  );
};
