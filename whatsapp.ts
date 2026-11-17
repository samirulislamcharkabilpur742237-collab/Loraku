import type { Order } from '../types';

export const DEFAULT_OFFICIAL_WHATSAPP = '+917029017716';

/**
 * Converts a stored WhatsApp number (e.g. "+91 7029017716") into international wa.me digits ("917029017716").
 * Always reads from the central Store Settings value passed in, falling back only to the official store number.
 */
export function normalizeWhatsAppDigits(rawNumber?: string | null): string {
  const digits = String(rawNumber || DEFAULT_OFFICIAL_WHATSAPP).replace(/\D/g, '');
  if (!digits) return '917029017716';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function formatWhatsAppDisplay(rawNumber?: string | null): string {
  const digits = normalizeWhatsAppDigits(rawNumber);
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2)}`;
  }
  return `+${digits}`;
}

export function buildWhatsAppUrl(rawNumber: string | undefined | null, message?: string): string {
  const digits = normalizeWhatsAppDigits(rawNumber);
  const base = `https://wa.me/${digits}`;
  if (!message || !message.trim()) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function buildProductEnquiryMessage(
  businessName: string,
  productName: string,
  weightLabel?: string
): string {
  return [
    `Hello ${businessName || 'LORAKU DRY FRUITS'},`,
    `I would like to know the current price and availability for:`,
    `- Product: ${productName}`,
    weightLabel ? `- Pack Weight: ${weightLabel}` : null,
    `Please share the details.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildOrderWhatsAppMessage(businessName: string, order: Order): string {
  const itemLines = order.items.map(
    (item, idx) =>
      `${idx + 1}. ${item.product_name} (${item.weight_label}) x ${item.quantity} = Rs. ${item.line_total.toFixed(2)}`
  );

  const addressParts = [
    order.delivery_address,
    `Village/Town: ${order.village_town}`,
    `Post Office: ${order.post_office}`,
    `Police Station: ${order.police_station}`,
    `District: ${order.district}`,
    `State: ${order.state}`,
    `PIN Code: ${order.pin_code}`,
  ];

  return [
    `NEW ORDER — ${businessName || 'LORAKU DRY FRUITS'}`,
    `Order ID: ${order.order_code}`,
    `Customer Name: ${order.customer_name}`,
    `Mobile: ${order.mobile_number}`,
    `WhatsApp: ${order.whatsapp_number}`,
    ``,
    `Order Items:`,
    ...itemLines,
    ``,
    `Subtotal: Rs. ${order.subtotal.toFixed(2)}`,
    `Delivery Charges: Rs. ${order.delivery_charge.toFixed(2)}`,
    `Total Amount: Rs. ${order.total_amount.toFixed(2)}`,
    `Payment Method: ${order.payment_method}${order.upi_reference ? ` (Ref: ${order.upi_reference})` : ''}`,
    ``,
    `Delivery Address:`,
    ...addressParts,
  ].join('\n');
}
