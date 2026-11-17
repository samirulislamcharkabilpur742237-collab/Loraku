-- LORAKU DRY FRUITS - Initial SQLite Schema Migration (001_init)

CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'LORAKU DRY FRUITS',
  tagline TEXT NOT NULL DEFAULT 'Pure Dry Fruits & Healthy Seeds',
  logo_url TEXT NOT NULL DEFAULT '/icon.svg',
  whatsapp_number TEXT NOT NULL DEFAULT '+917029017716',
  contact_email TEXT NOT NULL DEFAULT '',
  dispatch_address TEXT NOT NULL DEFAULT '',
  delivery_charge REAL NOT NULL DEFAULT 50,
  free_delivery_threshold REAL NOT NULL DEFAULT 999,
  estimated_delivery_time TEXT NOT NULL DEFAULT '3-6 business days',
  delivery_service_info TEXT NOT NULL DEFAULT 'Freshly packed upon order and dispatched across India.',
  cod_enabled INTEGER NOT NULL DEFAULT 1,
  upi_enabled INTEGER NOT NULL DEFAULT 0,
  upi_id TEXT NOT NULL DEFAULT '',
  upi_payee_name TEXT NOT NULL DEFAULT 'LORAKU DRY FRUITS',
  upi_qr_url TEXT NOT NULL DEFAULT '',
  about_us TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  privacy_policy TEXT NOT NULL,
  terms_conditions TEXT NOT NULL,
  shipping_policy TEXT NOT NULL,
  return_refund_policy TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_new_arrival INTEGER NOT NULL DEFAULT 0,
  is_best_seller INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  weight_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  selling_price REAL NOT NULL DEFAULT 0,
  mrp REAL NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  purchase_cost REAL NOT NULL DEFAULT 0,
  packaging_cost REAL NOT NULL DEFAULT 0,
  sticker_cost REAL NOT NULL DEFAULT 0,
  other_expenses REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(product_id, weight_label)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  village_town TEXT NOT NULL,
  post_office TEXT NOT NULL,
  police_station TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  upi_reference TEXT NOT NULL DEFAULT '',
  order_status TEXT NOT NULL DEFAULT 'Pending',
  subtotal REAL NOT NULL,
  discount_total REAL NOT NULL DEFAULT 0,
  delivery_charge REAL NOT NULL DEFAULT 0,
  order_packaging_expense REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  total_cost REAL NOT NULL DEFAULT 0,
  gross_profit REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  weight_label TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  unit_mrp REAL NOT NULL,
  unit_cost REAL NOT NULL,
  line_total REAL NOT NULL,
  line_cost REAL NOT NULL,
  line_profit REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  changed_by TEXT NOT NULL DEFAULT 'System',
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  order_id INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  incurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
