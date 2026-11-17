import React, { useEffect, useState } from 'react';
import { MessageCircle, PackageSearch, Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { formatDateTime, formatINR } from '../utils/format';
import { buildOrderWhatsAppMessage, buildWhatsAppUrl } from '../utils/whatsapp';

export const TrackOrderPage: React.FC = () => {
  const { settings, recentOrderCodes } = useStore();
  const [orderCode, setOrderCode] = useState(recentOrderCodes[0] || '');
  const [mobile, setMobile] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const performLookup = async (code: string, mob: string) => {
    if (!code.trim() && !mob.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (code.trim()) params.set('order_code', code.trim());
      if (mob.trim()) params.set('mobile', mob.trim());
      const res = await fetch(`/api/orders/lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not look up order.');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (recentOrderCodes[0]) {
      performLookup(recentOrderCodes[0], '');
    }
  }, [recentOrderCodes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(orderCode, mobile);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-24 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C241E]">
          Track &amp; View Orders
        </h1>
        <p className="mt-1 text-sm text-[#5A655D]">
          Enter your Order ID or registered mobile number to check live order progress.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">Order ID</label>
            <input
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="e.g. LRK-20261116-1234"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm tabular-nums focus:border-[#1B4332] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143325] cursor-pointer"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Check Order Status'}
          </button>

          {recentOrderCodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#5A655D]">Recent on this device:</span>
              {recentOrderCodes.slice(0, 3).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setOrderCode(code);
                    performLookup(code, '');
                  }}
                  className="font-mono-tabular rounded-lg border border-[#D8D0C0] bg-[#FAF8F5] px-2.5 py-1 font-medium text-[#1B4332] hover:bg-[#F3EFE6] cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {searched && !loading && orders.length === 0 && !error && (
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-10 text-center space-y-2">
          <PackageSearch className="h-8 w-8 text-[#6B756D] mx-auto" />
          <p className="font-medium text-[#1C241E]">No matching orders found</p>
          <p className="text-sm text-[#5A655D]">
            Check your Order ID or mobile number, or message us on WhatsApp for help.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {orders.map((order) => {
          const waUrl = buildWhatsAppUrl(
            settings.whatsapp_number,
            buildOrderWhatsAppMessage(settings.business_name, order)
          );
          return (
            <article
              key={order.id}
              className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE9DC] pb-4">
                <div>
                  <p className="font-mono-tabular text-base font-semibold text-[#1B4332]">
                    {order.order_code}
                  </p>
                  <p className="text-xs text-[#5A655D] mt-0.5">
                    Placed {formatDateTime(order.created_at)} · {order.payment_method} ({order.payment_status})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-sm font-semibold text-[#1C241E]">
                    Status: {order.order_status}
                  </span>
                  <p className="text-sm font-bold text-[#1C241E] tabular-nums">
                    {formatINR(order.total_amount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold text-[#1C241E] mb-2">Items</h3>
                  <ul className="space-y-1.5 text-[#4A554D]">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span>
                          {item.product_name} ({item.weight_label}) × {item.quantity}
                        </span>
                        <span className="tabular-nums font-medium text-[#1C241E]">
                          {formatINR(item.line_total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-2 border-t border-[#EFE9DC] flex justify-between text-xs text-[#5A655D]">
                    <span>Delivery Charge</span>
                    <span className="tabular-nums">
                      {order.delivery_charge === 0 ? 'Free' : formatINR(order.delivery_charge)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-[#1C241E] mb-2">Status Timeline</h3>
                  <ul className="space-y-2 border-l border-[#DFD7C5] pl-4">
                    {order.history.map((h, i) => (
                      <li key={i} className="text-xs">
                        <p className="font-semibold text-[#1C241E]">{h.status}</p>
                        <p className="text-[#5A655D]">{h.note}</p>
                        <p className="text-[#7A847C] mt-0.5">{formatDateTime(h.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EFE9DC] flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#5A655D]">
                  Deliver to: {order.customer_name}, {order.village_town}, {order.district} — {order.pin_code}
                </p>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143325]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Share / Ask on WhatsApp
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
};
