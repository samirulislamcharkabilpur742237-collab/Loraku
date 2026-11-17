export interface StoreSettings {
  id: number;
  business_name: string;
  tagline: string;
  logo_url: string;
  whatsapp_number: string;
  contact_email: string;
  dispatch_address: string;
  delivery_charge: number;
  free_delivery_threshold: number;
  estimated_delivery_time: string;
  delivery_service_info: string;
  cod_enabled: number;
  upi_enabled: number;
  upi_id: string;
  upi_payee_name: string;
  upi_qr_url: string;
  about_us: string;
  contact_info: string;
  privacy_policy: string;
  terms_conditions: string;
  shipping_policy: string;
  return_refund_policy: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  weight_label: string;
  sort_order: number;
  enabled: number;
  selling_price: number;
  mrp: number;
  stock_qty: number;
  low_stock_threshold: number;
  purchase_cost?: number;
  packaging_cost?: number;
  sticker_cost?: number;
  other_expenses?: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  short_description: string;
  detailed_description: string;
  image_url: string;
  is_featured: number;
  is_new_arrival: number;
  is_best_seller: number;
  is_active: number;
  variants: ProductVariant[];
}

export interface CartItem {
  product_id: number;
  variant_id: number;
  product_name: string;
  weight_label: string;
  unit_price: number;
  unit_mrp: number;
  image_url: string;
  quantity: number;
  stock_qty: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  weight_label: string;
  quantity: number;
  unit_price: number;
  unit_mrp: number;
  unit_cost?: number;
  line_total: number;
  line_cost?: number;
  line_profit?: number;
}

export interface OrderHistoryEntry {
  id?: number;
  status: string;
  note: string;
  changed_by?: string;
  created_at: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  mobile_number: string;
  whatsapp_number: string;
  delivery_address: string;
  village_town: string;
  post_office: string;
  police_station: string;
  district: string;
  state: string;
  pin_code: string;
  payment_method: 'COD' | 'UPI';
  payment_status: 'Unpaid' | 'Pending Verification' | 'Paid' | 'Refunded';
  upi_reference: string;
  order_status: OrderStatus;
  subtotal: number;
  discount_total: number;
  delivery_charge: number;
  order_packaging_expense?: number;
  total_amount: number;
  total_cost?: number;
  gross_profit?: number;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  history: OrderHistoryEntry[];
}

export interface DashboardKPIs {
  total_revenue: number;
  total_product_sales: number;
  total_product_cost: number;
  gross_profit: number;
  extra_expenses: number;
  net_profit: number;
  gross_margin_pct: number;
  total_orders: number;
  today_orders: number;
  today_sales: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_products: number;
  low_stock_count: number;
}

export interface Expense {
  id: number;
  title: string;
  category: string;
  amount: number;
  order_id: number | null;
  notes: string;
  incurred_at: string;
}

export type AppView =
  | 'home'
  | 'checkout'
  | 'track'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'shipping'
  | 'refund'
  | 'admin';
