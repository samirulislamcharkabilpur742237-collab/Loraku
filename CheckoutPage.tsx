import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, MessageCircle, QrCode, ShoppingBag } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useStore } from '../context/StoreContext';
import type { Order } from '../types';
import { formatINR } from '../utils/format';
import { buildOrderWhatsAppMessage, buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/whatsapp';

export const CheckoutPage: React.FC = () => {
  const {
    settings,
    cart,
    cartSubtotal,
    deliveryCharge,
    cartTotal,
    clearCart,
    refreshStore,
    navigate,
    saveRecentOrderCode,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [policeStation, setPoliceStation] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [notes, setNotes] = useState('');

  const codAvailable = Boolean(settings.cod_enabled);
  const upiConfigured = Boolean(settings.upi_enabled && (settings.upi_id || settings.upi_qr_url));
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>(codAvailable ? 'COD' : 'UPI');
  const [upiReference, setUpiReference] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const effectiveWhatsapp = sameAsMobile ? mobileNumber : whatsappNumber;

  const handleCopyUpi = () => {
    if (!settings.upi_id) return;
    navigator.clipboard?.writeText(settings.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 1800);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          mobile_number: mobileNumber,
          whatsapp_number: effectiveWhatsapp,
          delivery_address: deliveryAddress,
          village_town: villageTown,
          post_office: postOffice,
          police_station: policeStation,
          district,
          state: stateName,
          pin_code: pinCode,
          payment_method: paymentMethod,
          upi_reference: paymentMethod === 'UPI' ? upiReference : '',
          notes,
          items: cart.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not place your order.');
      }

      const order = data.order as Order;
      setConfirmedOrder(order);
      saveRecentOrderCode(order.order_code);
      clearCart();
      await refreshStore();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Order Confirmation State
  if (confirmedOrder) {
    const orderWaMessage = buildOrderWhatsAppMessage(settings.business_name, confirmedOrder);
    const orderWaUrl = buildWhatsAppUrl(settings.whatsapp_number, orderWaMessage);

    return (
      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 pb-20">
        <div className="rounded-2xl border border-[#DFD7C5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE9DC] pb-5">
            <BrandLogo name={settings.business_name} logoUrl={settings.logo_url} size="md" />
            <div className="text-left sm:text-right">
              <p className="text-xs text-[#5A655D]">Order ID</p>
              <p className="font-mono-tabular text-base font-semibold text-[#1B4332]">
                {confirmedOrder.order_code}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-xl bg-[#F3EFE6] p-4">
            <CheckCircle2 className="h-6 w-6 text-[#1B4332] shrink-0 mt-0.5" />
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#1C241E]">
                Order Placed Successfully
              </h1>
              <p className="mt-1 text-sm text-[#4A554D]">
                Thank you, <strong>{confirmedOrder.customer_name}</strong>. Your order with{' '}
                <strong>{settings.business_name}</strong> has been saved under Order ID{' '}
                <strong className="font-mono-tabular">{confirmedOrder.order_code}</strong>.
              </p>
            </div>
          </div>

          {/* Official WhatsApp Confirmation Callout */}
          <div className="rounded-xl border border-[#1B4332]/25 bg-[#EDF5F0] p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#1C241E]">
              Send Your Order Summary on WhatsApp
            </h2>
            <p className="text-sm text-[#354038]">
              Tap the button below to open our official business WhatsApp chat (
              <strong className="tabular-nums">{formatWhatsAppDisplay(settings.whatsapp_number)}</strong>) with your complete order details pre-filled. Please tap <strong>Send</strong> inside WhatsApp to confirm your order with us.
            </p>
            <a
              href={orderWaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#143325] transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Confirm Order on WhatsApp ({formatWhatsAppDisplay(settings.whatsapp_number)})
            </a>
          </div>

          {/* Itemized Summary */}
          <div>
            <h3 className="text-sm font-semibold text-[#1C241E] mb-3">Items Ordered</h3>
            <div className="divide-y divide-[#EFE9DC] rounded-xl border border-[#E6DFD1]">
              {confirmedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-[#1C241E]">{item.product_name}</p>
                    <p className="text-xs text-[#5A655D] tabular-nums">
                      {item.weight_label} × {item.quantity} ({formatINR(item.unit_price)} each)
                    </p>
                  </div>
                  <span className="font-semibold text-[#1C241E] tabular-nums">
                    {formatINR(item.line_total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-sm">
            <div className="space-y-1.5">
              <h3 className="font-semibold text-[#1C241E]">Delivery Address</h3>
              <p className="text-[#4A554D]">{confirmedOrder.delivery_address}</p>
              <p className="text-[#4A554D]">
                Village/Town: {confirmedOrder.village_town}, PO: {confirmedOrder.post_office}
              </p>
              <p className="text-[#4A554D]">
                PS: {confirmedOrder.police_station}, Dist: {confirmedOrder.district}
              </p>
              <p className="text-[#4A554D]">
                {confirmedOrder.state} — PIN {confirmedOrder.pin_code}
              </p>
              <p className="text-[#4A554D] tabular-nums">
                Mobile: {confirmedOrder.mobile_number} · WhatsApp: {confirmedOrder.whatsapp_number}
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-[#FAF8F5] border border-[#E6DFD1] p-4">
              <div className="flex justify-between text-[#5A655D]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#1C241E]">
                  {formatINR(confirmedOrder.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#5A655D]">
                <span>Delivery Charges</span>
                <span className="tabular-nums font-medium text-[#1C241E]">
                  {confirmedOrder.delivery_charge === 0 ? 'Free' : formatINR(confirmedOrder.delivery_charge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E6DFD1] pt-2 text-base font-semibold text-[#1C241E]">
                <span>Total Amount</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.total_amount)}</span>
              </div>
              <div className="pt-1 text-xs text-[#5A655D]">
                Payment: {confirmedOrder.payment_method} ({confirmedOrder.payment_status})
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('track')}
              className="min-h-[44px] rounded-xl border border-[#1B4332] px-5 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#F3EFE6] cursor-pointer"
            >
              Track Order Status
            </button>
            <button
              type="button"
              onClick={() => navigate('home')}
              className="min-h-[44px] rounded-xl bg-[#F3EFE6] px-5 py-2.5 text-sm font-semibold text-[#1C241E] hover:bg-[#E7E0D0] cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Empty cart guard
  if (cart.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-10 space-y-4">
          <ShoppingBag className="h-10 w-10 text-[#1B4332] mx-auto" />
          <h1 className="font-display text-2xl font-semibold text-[#1C241E]">Your Cart is Empty</h1>
          <p className="text-sm text-[#5A655D]">
            Add dry fruits or healthy seeds to your cart before proceeding to checkout.
          </p>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="min-h-[44px] rounded-xl bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#143325] cursor-pointer"
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 pb-24">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A655D] hover:text-[#1C241E] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </button>

      <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C241E] mb-6">
        Checkout — {settings.business_name}
      </h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Delivery & Payment Details */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#1C241E]">
              1. Customer &amp; Delivery Address
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm tabular-nums focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#1C241E]">
                    WhatsApp Number *
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#5A655D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsMobile}
                      onChange={(e) => setSameAsMobile(e.target.checked)}
                      className="accent-[#1B4332]"
                    />
                    Same as mobile
                  </label>
                </div>
                <input
                  type="tel"
                  required
                  disabled={sameAsMobile}
                  value={sameAsMobile ? mobileNumber : whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="WhatsApp number"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm tabular-nums disabled:bg-[#F3EFE6] focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Full Delivery Address (House No., Street, Para / Landmark) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House / Flat / Para / Landmark"
                  className="w-full rounded-xl border border-[#D8D0C0] px-3.5 py-2.5 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Village / Town *
                </label>
                <input
                  type="text"
                  required
                  value={villageTown}
                  onChange={(e) => setVillageTown(e.target.value)}
                  placeholder="Village or Town name"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Post Office (PO) *
                </label>
                <input
                  type="text"
                  required
                  value={postOffice}
                  onChange={(e) => setPostOffice(e.target.value)}
                  placeholder="Post Office"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Police Station (PS) *
                </label>
                <input
                  type="text"
                  required
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  placeholder="Police Station"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  District *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="State (e.g. West Bengal)"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  pattern="\d{6}"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit PIN code"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any landmark or preferred call timing"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2 text-sm focus:border-[#1B4332] focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* 2. Payment Method */}
          <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#1C241E]">
              2. Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {codAvailable && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`min-h-[56px] rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    paymentMethod === 'COD'
                      ? 'border-[#1B4332] bg-[#EDF5F0]'
                      : 'border-[#D8D0C0] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#1C241E]">Cash on Delivery (COD)</p>
                  <p className="text-xs text-[#5A655D] mt-0.5">Pay in cash when your parcel arrives.</p>
                </button>
              )}

              {upiConfigured ? (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`min-h-[56px] rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'border-[#1B4332] bg-[#EDF5F0]'
                      : 'border-[#D8D0C0] bg-white hover:bg-[#FAF8F5]'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#1C241E]">UPI Payment</p>
                  <p className="text-xs text-[#5A655D] mt-0.5">Pay directly via UPI ID or QR scan.</p>
                </button>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8D0C0] bg-[#FAF8F5] p-4 text-left">
                  <p className="text-sm font-medium text-[#5A655D]">Online UPI Payment Unavailable</p>
                  <p className="text-xs text-[#7A847C] mt-0.5">
                    Online payment gateway / UPI is not configured by the store owner yet.
                  </p>
                </div>
              )}
            </div>

            {paymentMethod === 'UPI' && upiConfigured && (
              <div className="rounded-xl border border-[#DFD7C5] bg-[#FAF8F5] p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {settings.upi_qr_url ? (
                    <img
                      src={settings.upi_qr_url}
                      alt="Official UPI Payment QR Code"
                      referrerPolicy="no-referrer"
                      className="h-36 w-36 rounded-xl border border-[#DFD7C5] bg-white object-contain p-1.5"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-xl border border-[#DFD7C5] bg-white flex items-center justify-center text-[#5A655D]">
                      <QrCode className="h-8 w-8" />
                    </div>
                  )}
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-[#1C241E]">
                      Pay {formatINR(cartTotal)} to {settings.upi_payee_name || settings.business_name}
                    </p>
                    {settings.upi_id && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular rounded-lg bg-white border border-[#D8D0C0] px-3 py-1.5 text-xs">
                          {settings.upi_id}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D8D0C0] bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-[#F3EFE6] cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedUpi ? 'Copied' : 'Copy UPI ID'}
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-[#5A655D]">
                      After paying, enter your UPI Transaction ID / UTR below. The store owner will verify payment before dispatch.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1C241E] mb-1.5">
                    UPI Transaction ID / UTR Number (Optional if paying later)
                  </label>
                  <input
                    type="text"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    placeholder="e.g. 432198765432"
                    className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] bg-white px-3.5 py-2 text-sm font-mono-tabular focus:border-[#1B4332] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Order Summary
          </h2>

          <ul className="divide-y divide-[#EFE9DC]">
            {cart.map((item) => (
              <li key={item.variant_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-lg object-cover bg-[#F3EFE6] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C241E] truncate">{item.product_name}</p>
                    <p className="text-xs text-[#5A655D] tabular-nums">
                      {item.weight_label} × {item.quantity} ({formatINR(item.unit_price)})
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-[#1C241E] tabular-nums shrink-0">
                  {formatINR(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t border-[#E6DFD1] pt-4 text-sm">
            <div className="flex justify-between text-[#5A655D]">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-[#1C241E]">{formatINR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-[#5A655D]">
              <span>Delivery Charges</span>
              <span className="tabular-nums font-medium text-[#1C241E]">
                {deliveryCharge === 0 ? 'Free' : formatINR(deliveryCharge)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E6DFD1] pt-3 text-base font-bold text-[#1C241E]">
              <span>Payable Total</span>
              <span className="tabular-nums">{formatINR(cartTotal)}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (!codAvailable && !upiConfigured)}
            className="w-full min-h-[48px] rounded-xl bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#143325] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {submitting ? 'Confirming Order...' : `Confirm Order (${formatINR(cartTotal)})`}
          </button>

          <p className="text-xs text-[#6B756D] text-center">
            Estimated delivery: {settings.estimated_delivery_time}
          </p>
        </aside>
      </form>
    </main>
  );
};
