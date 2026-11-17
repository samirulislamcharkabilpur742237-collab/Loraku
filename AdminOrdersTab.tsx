import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import type { Order, OrderStatus } from '../../types';
import { formatDateTime, formatINR } from '../../utils/format';
import { buildWhatsAppUrl } from '../../utils/whatsapp';

const STATUS_OPTIONS: Array<'All' | OrderStatus> = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUSES: Array<Order['payment_status']> = [
  'Unpaid',
  'Pending Verification',
  'Paid',
  'Refunded',
];

export const AdminOrdersTab: React.FC<{ onDataChanged: () => void }> = ({ onDataChanged }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load orders.');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch orders.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrder = async (
    orderId: number,
    patch: {
      order_status?: OrderStatus;
      payment_status?: Order['payment_status'];
      order_packaging_expense?: number;
      note?: string;
    }
  ) => {
    setSavingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Filters */}
      <div className="rounded-2xl border border-[#E6DFD1] bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B756D]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order ID, mobile, or name"
              className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] pl-9 pr-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by order status"
            className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                Status: {s}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by order date"
            className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] bg-white px-3 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-8 text-center text-sm text-[#5A655D]">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-10 text-center text-sm text-[#5A655D]">
          No orders match your current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const customerWaUrl = buildWhatsAppUrl(
              order.whatsapp_number,
              `Hello ${order.customer_name}, update regarding your LORAKU DRY FRUITS order ${order.order_code}: Status is currently ${order.order_status}.`
            );

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-[#E6DFD1] bg-white p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-sm font-bold text-[#1B4332]">
                        {order.order_code}
                      </span>
                      <span className="text-xs text-[#5A655D]">
                        · {formatDateTime(order.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#1C241E]">
                      {order.customer_name} · <span className="tabular-nums">{order.mobile_number}</span>
                    </p>
                    <p className="text-xs text-[#5A655D]">
                      {order.village_town}, {order.district}, {order.state} ({order.pin_code})
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-1.5">
                    <span className="text-base font-bold text-[#1C241E] tabular-nums">
                      {formatINR(order.total_amount)}
                    </span>
                    <span className="text-xs font-medium text-[#2D6A4F] tabular-nums">
                      Gross Profit: {formatINR(order.gross_profit || 0)}
                    </span>
                    <span className="text-xs text-[#5A655D]">
                      {order.order_status} · {order.payment_method} ({order.payment_status})
                    </span>
                  </div>
                </div>

                {/* Quick Status Buttons for Android phone workflow */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EFE9DC]">
                  {(['Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={savingId === order.id || order.order_status === st}
                        onClick={() => updateOrder(order.id, { order_status: st })}
                        className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          order.order_status === st
                            ? 'bg-[#1B4332] text-white'
                            : st === 'Cancelled'
                            ? 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                            : 'border border-[#D8D0C0] bg-[#FAF8F5] text-[#1C241E] hover:bg-[#EFE9DC]'
                        } disabled:opacity-50`}
                      >
                        {st}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="ml-auto min-h-[36px] rounded-lg border border-[#D8D0C0] px-3 py-1.5 text-xs font-semibold text-[#1B4332] hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    {isExpanded ? 'Hide Details' : 'Details & Payment'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-[#EFE9DC] grid grid-cols-1 lg:grid-cols-2 gap-5 text-sm">
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-[#1C241E] mb-1">Full Delivery Address</h4>
                        <p className="text-xs text-[#4A554D] leading-relaxed">
                          {order.delivery_address}
                          <br />
                          Village/Town: {order.village_town}, PO: {order.post_office}, PS: {order.police_station}
                          <br />
                          Dist: {order.district}, {order.state} — PIN {order.pin_code}
                          <br />
                          Mobile: {order.mobile_number} · WhatsApp: {order.whatsapp_number}
                        </p>
                        {order.notes && (
                          <p className="mt-1 text-xs text-[#5A655D]">Note: {order.notes}</p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-[#1C241E] mb-1.5">Order Items &amp; Cost</h4>
                        <ul className="divide-y divide-[#EFE9DC] rounded-xl border border-[#E6DFD1]">
                          {order.items.map((item) => (
                            <li key={item.id} className="flex justify-between px-3 py-2 text-xs">
                              <span>
                                {item.product_name} ({item.weight_label}) × {item.quantity}
                              </span>
                              <span className="tabular-nums font-medium">
                                Sale {formatINR(item.line_total)} · Cost {formatINR(item.line_cost || 0)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <a
                        href={customerWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B4332] px-3.5 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#F3EFE6]"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Message Customer on WhatsApp
                      </a>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                            Payment Status
                          </label>
                          <select
                            value={order.payment_status}
                            disabled={savingId === order.id}
                            onChange={(e) =>
                              updateOrder(order.id, {
                                payment_status: e.target.value as Order['payment_status'],
                              })
                            }
                            className="w-full min-h-[40px] rounded-lg border border-[#D8D0C0] bg-white px-3 py-1.5 text-xs"
                          >
                            {PAYMENT_STATUSES.map((ps) => (
                              <option key={ps} value={ps}>
                                {ps}
                              </option>
                            ))}
                          </select>
                          {order.upi_reference && (
                            <p className="mt-1 text-[11px] font-mono-tabular text-[#5A655D]">
                              UPI Ref: {order.upi_reference}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#1C241E] mb-1">
                            Extra Order Packing Expense (₹)
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step="1"
                              defaultValue={order.order_packaging_expense || 0}
                              id={`pkg-exp-${order.id}`}
                              className="w-full min-h-[40px] rounded-lg border border-[#D8D0C0] px-2.5 py-1 text-xs tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById(
                                  `pkg-exp-${order.id}`
                                ) as HTMLInputElement | null;
                                updateOrder(order.id, {
                                  order_packaging_expense: Number(input?.value || 0),
                                });
                              }}
                              className="rounded-lg bg-[#1B4332] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-[#1C241E] mb-1.5">Status History</h4>
                        <ul className="space-y-1.5 border-l border-[#DFD7C5] pl-3 text-xs">
                          {order.history.map((h, i) => (
                            <li key={i}>
                              <span className="font-semibold text-[#1C241E]">{h.status}</span>
                              <span className="text-[#5A655D]"> — {h.note}</span>
                              <span className="block text-[11px] text-[#7A847C]">
                                {formatDateTime(h.created_at)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
