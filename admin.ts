import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver') as {
  ZipArchive: new (options?: { zlib?: { level?: number } }) => {
    on: (event: string, listener: (err: Error) => void) => void;
    pipe: (destination: NodeJS.WritableStream) => void;
    glob: (pattern: string, options: Record<string, unknown>, data?: Record<string, unknown>) => void;
    finalize: () => Promise<void>;
  };
};
import { Router } from 'express';
import {
  ADMIN_COOKIE_NAME,
  clearAdminCookie,
  requireAdmin,
  setAdminCookie,
  signAdminToken,
  verifyAdminToken,
  type AuthenticatedRequest,
} from '../auth.ts';
import { db, UPLOADS_DIR } from '../db.ts';
import { sanitizeSlug } from './public.ts';

export const adminRouter = Router();

const VALID_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const VALID_PAYMENT_STATUSES = ['Unpaid', 'Pending Verification', 'Paid', 'Refunded'];

// Auth Status
adminRouter.get('/auth/status', (req, res) => {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  const needsSetup = countRow.count === 0;

  let authenticated = false;
  let admin: { id: number; username: string; display_name: string } | null = null;

  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!needsSetup && token) {
    const decoded = verifyAdminToken(token);
    if (decoded) {
      const found = db
        .prepare('SELECT id, username, display_name FROM admins WHERE id = ?')
        .get(decoded.adminId) as { id: number; username: string; display_name: string } | undefined;
      if (found) {
        authenticated = true;
        admin = found;
      }
    }
  }

  res.json({ needsSetup, authenticated, admin });
});

// Check active session cleanly
adminRouter.get('/auth/me', requireAdmin, (req: AuthenticatedRequest, res) => {
  res.json({ authenticated: true, admin: req.admin });
});

// First-time owner account creation (only allowed when 0 admins exist)
adminRouter.post('/auth/setup', (req, res) => {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (countRow.count > 0) {
    res.status(403).json({ error: 'Owner account already exists. Please log in.' });
    return;
  }

  const username = String(req.body?.username || '').trim();
  const display_name = String(req.body?.display_name || 'Store Owner').trim() || 'Store Owner';
  const password = String(req.body?.password || '');

  if (username.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters for security.' });
    return;
  }

  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 12);
  const result = db
    .prepare('INSERT INTO admins (username, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, display_name, hash, now, now);

  const adminId = result.lastInsertRowid as number;
  const token = signAdminToken({ adminId, username });
  setAdminCookie(res, token, req);

  res.status(201).json({
    admin: { id: adminId, username, display_name },
  });
});

adminRouter.post('/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const admin = db
    .prepare('SELECT id, username, display_name, password_hash FROM admins WHERE username = ?')
    .get(username) as { id: number; username: string; display_name: string; password_hash: string } | undefined;

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = signAdminToken({ adminId: admin.id, username: admin.username });
  setAdminCookie(res, token, req);
  res.json({
    admin: { id: admin.id, username: admin.username, display_name: admin.display_name },
  });
});

adminRouter.post('/auth/logout', (req, res) => {
  clearAdminCookie(res, req);
  res.json({ ok: true });
});

// Protect all routes below
adminRouter.use(requireAdmin);

// Update admin credentials
adminRouter.put('/auth/credentials', (req: AuthenticatedRequest, res) => {
  const currentPassword = String(req.body?.current_password || '');
  const newUsername = String(req.body?.username || '').trim();
  const newDisplayName = String(req.body?.display_name || '').trim();
  const newPassword = String(req.body?.new_password || '');

  const admin = db
    .prepare('SELECT * FROM admins WHERE id = ?')
    .get(req.admin!.id) as { id: number; username: string; display_name: string; password_hash: string };

  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const finalUsername = newUsername.length >= 3 ? newUsername : admin.username;
  const finalDisplayName = newDisplayName || admin.display_name;
  let finalHash = admin.password_hash;

  if (newPassword) {
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    finalHash = bcrypt.hashSync(newPassword, 12);
  }

  db.prepare('UPDATE admins SET username = ?, display_name = ?, password_hash = ?, updated_at = ? WHERE id = ?').run(
    finalUsername,
    finalDisplayName,
    finalHash,
    new Date().toISOString(),
    admin.id
  );

  const token = signAdminToken({ adminId: admin.id, username: finalUsername });
  setAdminCookie(res, token, req);

  res.json({ admin: { id: admin.id, username: finalUsername, display_name: finalDisplayName } });
});

// Dashboard KPIs calculated strictly from saved orders, costs, and expenses
adminRouter.get('/dashboard', (_req, res) => {
  const todayPrefix = new Date().toISOString().slice(0, 10);

  const orderAgg = db
    .prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN order_status != 'Cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN order_status != 'Cancelled' THEN subtotal ELSE 0 END), 0) as total_product_sales,
        COALESCE(SUM(CASE WHEN order_status != 'Cancelled' THEN (total_cost + order_packaging_expense) ELSE 0 END), 0) as total_product_cost,
        COALESCE(SUM(CASE WHEN order_status != 'Cancelled' THEN gross_profit ELSE 0 END), 0) as gross_profit,
        COALESCE(SUM(CASE WHEN created_at LIKE ? THEN 1 ELSE 0 END), 0) as today_orders,
        COALESCE(SUM(CASE WHEN created_at LIKE ? AND order_status != 'Cancelled' THEN total_amount ELSE 0 END), 0) as today_sales,
        COALESCE(SUM(CASE WHEN order_status IN ('Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped') THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN order_status = 'Delivered' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN order_status = 'Cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders
      FROM orders
    `)
    .get(`${todayPrefix}%`, `${todayPrefix}%`) as Record<string, number>;

  const extraExpensesRow = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total_extra_expenses FROM expenses')
    .get() as { total_extra_expenses: number };

  const productCountRow = db
    .prepare('SELECT COUNT(*) as total_products FROM products WHERE is_active = 1')
    .get() as { total_products: number };

  const lowStockVariants = db
    .prepare(`
      SELECT v.id, v.product_id, p.name as product_name, v.weight_label, v.stock_qty, v.low_stock_threshold
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE p.is_active = 1 AND v.enabled = 1 AND v.stock_qty <= v.low_stock_threshold
      ORDER BY v.stock_qty ASC, p.name ASC
    `)
    .all();

  const totalProductSales = Number(orderAgg.total_product_sales || 0);
  const grossProfit = Number(orderAgg.gross_profit || 0);
  const extraExpenses = Number(extraExpensesRow.total_extra_expenses || 0);
  const netProfit = Number((grossProfit - extraExpenses).toFixed(2));
  const grossMarginPct = totalProductSales > 0 ? Number(((grossProfit / totalProductSales) * 100).toFixed(1)) : 0;

  const recentOrders = db
    .prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 6')
    .all();

  res.json({
    kpis: {
      total_revenue: Number((orderAgg.total_revenue || 0).toFixed(2)),
      total_product_sales: Number(totalProductSales.toFixed(2)),
      total_product_cost: Number((orderAgg.total_product_cost || 0).toFixed(2)),
      gross_profit: Number(grossProfit.toFixed(2)),
      extra_expenses: Number(extraExpenses.toFixed(2)),
      net_profit: netProfit,
      gross_margin_pct: grossMarginPct,
      total_orders: Number(orderAgg.total_orders || 0),
      today_orders: Number(orderAgg.today_orders || 0),
      today_sales: Number((orderAgg.today_sales || 0).toFixed(2)),
      pending_orders: Number(orderAgg.pending_orders || 0),
      completed_orders: Number(orderAgg.completed_orders || 0),
      cancelled_orders: Number(orderAgg.cancelled_orders || 0),
      total_products: Number(productCountRow.total_products || 0),
      low_stock_count: lowStockVariants.length,
    },
    lowStockVariants,
    recentOrders,
  });
});

// Orders list with search & filters
adminRouter.get('/orders', (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const date = String(req.query.date || '').trim();

  const conditions: string[] = [];
  const params: Array<string> = [];

  if (search) {
    conditions.push('(UPPER(order_code) LIKE ? OR mobile_number LIKE ? OR LOWER(customer_name) LIKE ?)');
    params.push(`%${search.toUpperCase()}%`, `%${search}%`, `%${search.toLowerCase()}%`);
  }
  if (status && status !== 'All') {
    conditions.push('order_status = ?');
    params.push(status);
  }
  if (date) {
    conditions.push('created_at LIKE ?');
    params.push(`${date}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orders = db
    .prepare(`SELECT * FROM orders ${whereClause} ORDER BY id DESC`)
    .all(...params) as Array<Record<string, unknown>>;

  const enriched = orders.map((o) => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(o.id));
    const history = db
      .prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC')
      .all(Number(o.id));
    return { ...o, items, history };
  });

  res.json({ orders: enriched });
});

// Update order status, payment status, or order packaging expense
adminRouter.patch('/orders/:id', (req: AuthenticatedRequest, res) => {
  const orderId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | {
        id: number;
        order_status: string;
        payment_status: string;
        subtotal: number;
        discount_total: number;
        total_cost: number;
        order_packaging_expense: number;
      }
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }

  const nextStatus = req.body?.order_status ? String(req.body.order_status) : existing.order_status;
  const nextPaymentStatus = req.body?.payment_status ? String(req.body.payment_status) : existing.payment_status;
  const nextPkgExpense =
    req.body?.order_packaging_expense !== undefined
      ? Math.max(0, Number(req.body.order_packaging_expense) || 0)
      : existing.order_packaging_expense;
  const note = String(req.body?.note || '').trim();

  if (!VALID_STATUSES.includes(nextStatus)) {
    res.status(400).json({ error: 'Invalid order status.' });
    return;
  }
  if (!VALID_PAYMENT_STATUSES.includes(nextPaymentStatus)) {
    res.status(400).json({ error: 'Invalid payment status.' });
    return;
  }

  const now = new Date().toISOString();
  const updateTx = db.transaction(() => {
    // Handle stock restore if transitioning INTO Cancelled, or stock deduct if un-cancelling
    if (existing.order_status !== 'Cancelled' && nextStatus === 'Cancelled') {
      const items = db
        .prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?')
        .all(orderId) as Array<{ variant_id: number; quantity: number }>;
      for (const item of items) {
        db.prepare('UPDATE product_variants SET stock_qty = stock_qty + ?, updated_at = ? WHERE id = ?').run(
          item.quantity,
          now,
          item.variant_id
        );
      }
    } else if (existing.order_status === 'Cancelled' && nextStatus !== 'Cancelled') {
      const items = db
        .prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?')
        .all(orderId) as Array<{ variant_id: number; quantity: number }>;
      for (const item of items) {
        db.prepare('UPDATE product_variants SET stock_qty = MAX(0, stock_qty - ?), updated_at = ? WHERE id = ?').run(
          item.quantity,
          now,
          item.variant_id
        );
      }
    }

    const recalculatedGrossProfit = Number(
      (existing.subtotal - existing.discount_total - existing.total_cost - nextPkgExpense).toFixed(2)
    );

    db.prepare(`
      UPDATE orders
      SET order_status = ?, payment_status = ?, order_packaging_expense = ?, gross_profit = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, nextPaymentStatus, nextPkgExpense, recalculatedGrossProfit, now, orderId);

    if (nextStatus !== existing.order_status || note) {
      db.prepare(
        'INSERT INTO order_status_history (order_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(
        orderId,
        nextStatus,
        note || `Status updated to ${nextStatus}`,
        req.admin?.display_name || 'Owner',
        now
      );
    }
  });

  updateTx();

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const history = db
    .prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC')
    .all(orderId);

  res.json({ order: { ...updated, items, history } });
});

// Categories CRUD
adminRouter.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json({ categories });
});

adminRouter.post('/categories', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const sort_order = Number(req.body?.sort_order) || 10;

  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  let slug = sanitizeSlug(name) || `cat-${Date.now()}`;
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const resInsert = db
    .prepare('INSERT INTO categories (name, slug, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, slug, description, sort_order, new Date().toISOString());

  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(resInsert.lastInsertRowid);
  res.status(201).json({ category });
});

adminRouter.put('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const sort_order = Number(req.body?.sort_order) || 1;

  if (!name) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  db.prepare('UPDATE categories SET name = ?, description = ?, sort_order = ? WHERE id = ?').run(
    name,
    description,
    sort_order,
    id
  );
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.json({ category });
});

adminRouter.delete('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const prodCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as {
    count: number;
  };
  if (prodCount.count > 0) {
    res.status(400).json({ error: 'Move or delete products in this category before deleting it.' });
    return;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ ok: true });
});

// Products & Variants (Full Inventory + Cost Accounting)
adminRouter.get('/products', (_req, res) => {
  const products = db
    .prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.category_id ASC, p.id ASC
    `)
    .all() as Array<Record<string, unknown>>;

  const variants = db
    .prepare('SELECT * FROM product_variants ORDER BY sort_order ASC, id ASC')
    .all() as Array<Record<string, unknown>>;

  const byProd = new Map<number, Array<Record<string, unknown>>>();
  for (const v of variants) {
    const pid = Number(v.product_id);
    if (!byProd.has(pid)) byProd.set(pid, []);
    byProd.get(pid)!.push(v);
  }

  res.json({
    products: products.map((p) => ({
      ...p,
      variants: byProd.get(Number(p.id)) || [],
    })),
  });
});

adminRouter.post('/products', (req, res) => {
  const b = req.body || {};
  const category_id = Number(b.category_id);
  const name = String(b.name || '').trim();
  const short_description = String(b.short_description || '').trim();
  const detailed_description = String(b.detailed_description || '').trim();
  const image_url = String(b.image_url || '').trim() || '/src/assets/images/prod_dry_fruit_mix_1794845329180.jpg';
  const is_featured = b.is_featured ? 1 : 0;
  const is_new_arrival = b.is_new_arrival ? 1 : 0;
  const is_best_seller = b.is_best_seller ? 1 : 0;
  const is_active = b.is_active === false ? 0 : 1;
  const variants = Array.isArray(b.variants) ? b.variants : [];

  if (!name || !category_id) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  let slug = sanitizeSlug(name) || `product-${Date.now()}`;
  if (db.prepare('SELECT 1 FROM products WHERE slug = ?').get(slug)) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const now = new Date().toISOString();
  const createTx = db.transaction(() => {
    const prodRes = db
      .prepare(`
        INSERT INTO products (
          category_id, name, slug, short_description, detailed_description, image_url,
          is_featured, is_new_arrival, is_best_seller, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        category_id,
        name,
        slug,
        short_description || name,
        detailed_description || short_description || name,
        image_url,
        is_featured,
        is_new_arrival,
        is_best_seller,
        is_active,
        now,
        now
      );

    const productId = prodRes.lastInsertRowid as number;
    const defaultWeights = ['100g', '250g', '500g', '1kg'];
    const insertVar = db.prepare(`
      INSERT INTO product_variants (
        product_id, weight_label, sort_order, enabled, selling_price, mrp, stock_qty,
        low_stock_threshold, purchase_cost, packaging_cost, sticker_cost, other_expenses, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (variants.length > 0) {
      variants.forEach((v: Record<string, unknown>, idx: number) => {
        insertVar.run(
          productId,
          String(v.weight_label || defaultWeights[idx] || `Pack ${idx + 1}`).trim(),
          idx + 1,
          v.enabled === false || v.enabled === 0 ? 0 : 1,
          Math.max(0, Number(v.selling_price) || 0),
          Math.max(0, Number(v.mrp) || 0),
          Math.max(0, Math.floor(Number(v.stock_qty) || 0)),
          Math.max(0, Math.floor(Number(v.low_stock_threshold ?? 5))),
          Math.max(0, Number(v.purchase_cost) || 0),
          Math.max(0, Number(v.packaging_cost) || 0),
          Math.max(0, Number(v.sticker_cost) || 0),
          Math.max(0, Number(v.other_expenses) || 0),
          now
        );
      });
    } else {
      defaultWeights.forEach((w, idx) => {
        insertVar.run(productId, w, idx + 1, 1, 0, 0, 0, 5, 0, 0, 0, 0, now);
      });
    }

    return productId;
  });

  const productId = createTx();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown>;
  const savedVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC').all(productId);
  res.status(201).json({ product: { ...product, variants: savedVariants } });
});

adminRouter.put('/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const b = req.body || {};
  const category_id = Number(b.category_id);
  const name = String(b.name || '').trim();
  const short_description = String(b.short_description || '').trim();
  const detailed_description = String(b.detailed_description || '').trim();
  const image_url = String(b.image_url || '').trim();
  const is_featured = b.is_featured ? 1 : 0;
  const is_new_arrival = b.is_new_arrival ? 1 : 0;
  const is_best_seller = b.is_best_seller ? 1 : 0;
  const is_active = b.is_active === false || b.is_active === 0 ? 0 : 1;
  const variants = Array.isArray(b.variants) ? b.variants : [];

  if (!name || !category_id) {
    res.status(400).json({ error: 'Product name and category are required.' });
    return;
  }

  const now = new Date().toISOString();
  const updateTx = db.transaction(() => {
    db.prepare(`
      UPDATE products
      SET category_id = ?, name = ?, short_description = ?, detailed_description = ?,
          image_url = COALESCE(NULLIF(?, ''), image_url),
          is_featured = ?, is_new_arrival = ?, is_best_seller = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      category_id,
      name,
      short_description,
      detailed_description,
      image_url,
      is_featured,
      is_new_arrival,
      is_best_seller,
      is_active,
      now,
      productId
    );

    if (variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i] as Record<string, unknown>;
        const weightLabel = String(v.weight_label || '').trim();
        if (!weightLabel) continue;

        if (v.id) {
          db.prepare(`
            UPDATE product_variants
            SET weight_label = ?, sort_order = ?, enabled = ?, selling_price = ?, mrp = ?,
                stock_qty = ?, low_stock_threshold = ?, purchase_cost = ?, packaging_cost = ?,
                sticker_cost = ?, other_expenses = ?, updated_at = ?
            WHERE id = ? AND product_id = ?
          `).run(
            weightLabel,
            i + 1,
            v.enabled === false || v.enabled === 0 ? 0 : 1,
            Math.max(0, Number(v.selling_price) || 0),
            Math.max(0, Number(v.mrp) || 0),
            Math.max(0, Math.floor(Number(v.stock_qty) || 0)),
            Math.max(0, Math.floor(Number(v.low_stock_threshold ?? 5))),
            Math.max(0, Number(v.purchase_cost) || 0),
            Math.max(0, Number(v.packaging_cost) || 0),
            Math.max(0, Number(v.sticker_cost) || 0),
            Math.max(0, Number(v.other_expenses) || 0),
            now,
            Number(v.id),
            productId
          );
        } else {
          db.prepare(`
            INSERT INTO product_variants (
              product_id, weight_label, sort_order, enabled, selling_price, mrp, stock_qty,
              low_stock_threshold, purchase_cost, packaging_cost, sticker_cost, other_expenses, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            productId,
            weightLabel,
            i + 1,
            v.enabled === false || v.enabled === 0 ? 0 : 1,
            Math.max(0, Number(v.selling_price) || 0),
            Math.max(0, Number(v.mrp) || 0),
            Math.max(0, Math.floor(Number(v.stock_qty) || 0)),
            Math.max(0, Math.floor(Number(v.low_stock_threshold ?? 5))),
            Math.max(0, Number(v.purchase_cost) || 0),
            Math.max(0, Number(v.packaging_cost) || 0),
            Math.max(0, Number(v.sticker_cost) || 0),
            Math.max(0, Number(v.other_expenses) || 0),
            now
          );
        }
      }
    }
  });

  updateTx();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Record<string, unknown>;
  const savedVariants = db.prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC').all(productId);
  res.json({ product: { ...product, variants: savedVariants } });
});

// Quick variant inventory/cost update endpoint
adminRouter.patch('/variants/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Variant not found.' });
    return;
  }

  const b = req.body || {};
  db.prepare(`
    UPDATE product_variants
    SET enabled = ?, selling_price = ?, mrp = ?, stock_qty = ?, low_stock_threshold = ?,
        purchase_cost = ?, packaging_cost = ?, sticker_cost = ?, other_expenses = ?, updated_at = ?
    WHERE id = ?
  `).run(
    b.enabled === false || b.enabled === 0 ? 0 : 1,
    Math.max(0, Number(b.selling_price) || 0),
    Math.max(0, Number(b.mrp) || 0),
    Math.max(0, Math.floor(Number(b.stock_qty) || 0)),
    Math.max(0, Math.floor(Number(b.low_stock_threshold ?? 5))),
    Math.max(0, Number(b.purchase_cost) || 0),
    Math.max(0, Number(b.packaging_cost) || 0),
    Math.max(0, Number(b.sticker_cost) || 0),
    Math.max(0, Number(b.other_expenses) || 0),
    new Date().toISOString(),
    id
  );

  const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(id);
  res.json({ variant });
});

adminRouter.delete('/products/:id', (req, res) => {
  const productId = Number(req.params.id);
  db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  res.json({ ok: true });
});

// Expenses CRUD
adminRouter.get('/expenses', (_req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY incurred_at DESC, id DESC').all();
  res.json({ expenses });
});

adminRouter.post('/expenses', (req, res) => {
  const title = String(req.body?.title || '').trim();
  const category = String(req.body?.category || 'Packaging & Misc').trim();
  const amount = Math.max(0, Number(req.body?.amount) || 0);
  const notes = String(req.body?.notes || '').trim();
  const incurred_at = String(req.body?.incurred_at || new Date().toISOString().slice(0, 10));

  if (!title || amount <= 0) {
    res.status(400).json({ error: 'Expense title and positive amount are required.' });
    return;
  }

  const result = db
    .prepare('INSERT INTO expenses (title, category, amount, notes, incurred_at) VALUES (?, ?, ?, ?, ?)')
    .run(title, category, amount, notes, incurred_at);

  const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ expense });
});

adminRouter.delete('/expenses/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Store Settings
adminRouter.get('/settings', (_req, res) => {
  const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
  res.json({ settings });
});

adminRouter.put('/settings', (req, res) => {
  const b = req.body || {};
  const current = db.prepare('SELECT * FROM store_settings WHERE id = 1').get() as Record<string, unknown>;

  const business_name = String(b.business_name ?? current.business_name).trim() || 'LORAKU DRY FRUITS';
  const whatsapp_number = String(b.whatsapp_number ?? current.whatsapp_number).trim() || '+917029017716';

  db.prepare(`
    UPDATE store_settings
    SET business_name = ?, tagline = ?, logo_url = ?, whatsapp_number = ?, contact_email = ?,
        dispatch_address = ?, delivery_charge = ?, free_delivery_threshold = ?,
        estimated_delivery_time = ?, delivery_service_info = ?,
        cod_enabled = ?, upi_enabled = ?, upi_id = ?, upi_payee_name = ?, upi_qr_url = ?,
        about_us = ?, contact_info = ?, privacy_policy = ?, terms_conditions = ?,
        shipping_policy = ?, return_refund_policy = ?, updated_at = ?
    WHERE id = 1
  `).run(
    business_name,
    String(b.tagline ?? current.tagline).trim(),
    String(b.logo_url ?? current.logo_url).trim() || '/icon.svg',
    whatsapp_number,
    String(b.contact_email ?? current.contact_email).trim(),
    String(b.dispatch_address ?? current.dispatch_address).trim(),
    Math.max(0, Number(b.delivery_charge ?? current.delivery_charge) || 0),
    Math.max(0, Number(b.free_delivery_threshold ?? current.free_delivery_threshold) || 0),
    String(b.estimated_delivery_time ?? current.estimated_delivery_time).trim(),
    String(b.delivery_service_info ?? current.delivery_service_info).trim(),
    b.cod_enabled === false || b.cod_enabled === 0 ? 0 : 1,
    b.upi_enabled === true || b.upi_enabled === 1 ? 1 : 0,
    String(b.upi_id ?? current.upi_id).trim(),
    String(b.upi_payee_name ?? current.upi_payee_name).trim(),
    String(b.upi_qr_url ?? current.upi_qr_url).trim(),
    String(b.about_us ?? current.about_us),
    String(b.contact_info ?? current.contact_info),
    String(b.privacy_policy ?? current.privacy_policy),
    String(b.terms_conditions ?? current.terms_conditions),
    String(b.shipping_policy ?? current.shipping_policy),
    String(b.return_refund_policy ?? current.return_refund_policy),
    new Date().toISOString()
  );

  const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get();
  res.json({ settings });
});

// Upload base64 image (for product image, logo, or UPI QR code from Android smartphone gallery)
adminRouter.post('/upload', (req, res) => {
  const dataUrl = String(req.body?.dataUrl || '');
  const prefix = String(req.body?.prefix || 'asset').replace(/[^a-z0-9_-]/gi, '');
  const match = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

  if (!match) {
    res.status(400).json({ error: 'Please upload a valid PNG, JPG, WebP, or SVG image.' });
    return;
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1] === 'svg+xml' ? 'svg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 3 * 1024 * 1024) {
    res.status(400).json({ error: 'Image file size must be under 3 MB.' });
    return;
  }

  const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const outPath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(outPath, buffer);
  res.json({ url: `/uploads/${filename}` });
});

// Export complete clean project source code as downloadable ZIP (excluding secrets, node_modules, dist, runtime DB)
adminRouter.get('/export-project', (_req, res) => {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="loraku-dry-fruits-project.zip"');

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.on('error', (err: Error) => {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  });

  archive.pipe(res);

  const rootDir = process.cwd();
  archive.glob(
    '**/*',
    {
      cwd: rootDir,
      dot: true,
      ignore: [
        'node_modules/**',
        'dist/**',
        'data/**',
        '.env',
        '.env.local',
        '.git/**',
        'loraku-dry-fruits-project.zip',
        '*.log',
      ],
    },
    { prefix: 'loraku-dry-fruits' }
  );

  archive.finalize();
});
