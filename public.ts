import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../db.ts';

export const publicRouter = Router();

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateOrderCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomInt(1000, 9999);
  return `LRK-${y}${m}${d}-${rand}`;
}

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'loraku-dry-fruits' });
});

publicRouter.get('/store', (_req, res) => {
  const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get() as Record<string, unknown>;
  const categories = db
    .prepare('SELECT id, name, slug, description, sort_order FROM categories ORDER BY sort_order ASC, id ASC')
    .all();

  const products = db
    .prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1
      ORDER BY p.is_featured DESC, p.id ASC
    `)
    .all() as Array<Record<string, unknown>>;

  const variants = db
    .prepare(`
      SELECT id, product_id, weight_label, sort_order, enabled, selling_price, mrp, stock_qty, low_stock_threshold
      FROM product_variants
      WHERE enabled = 1
      ORDER BY sort_order ASC, id ASC
    `)
    .all() as Array<Record<string, unknown>>;

  const variantsByProduct = new Map<number, Array<Record<string, unknown>>>();
  for (const v of variants) {
    const pid = Number(v.product_id);
    if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
    variantsByProduct.get(pid)!.push(v);
  }

  const enrichedProducts = products.map((p) => ({
    ...p,
    variants: variantsByProduct.get(Number(p.id)) || [],
  }));

  res.json({
    settings,
    categories,
    products: enrichedProducts,
  });
});

publicRouter.post('/orders', (req, res) => {
  const body = req.body || {};

  const customer_name = String(body.customer_name || '').trim();
  const mobile_number = String(body.mobile_number || '').replace(/\s+/g, '').trim();
  const whatsapp_number = String(body.whatsapp_number || '').replace(/\s+/g, '').trim();
  const delivery_address = String(body.delivery_address || '').trim();
  const village_town = String(body.village_town || '').trim();
  const post_office = String(body.post_office || '').trim();
  const police_station = String(body.police_station || '').trim();
  const district = String(body.district || '').trim();
  const state = String(body.state || '').trim();
  const pin_code = String(body.pin_code || '').trim();
  const payment_method = String(body.payment_method || 'COD').trim().toUpperCase();
  const upi_reference = String(body.upi_reference || '').trim();
  const notes = String(body.notes || '').trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customer_name || customer_name.length < 2) {
    res.status(400).json({ error: 'Please enter customer full name.' });
    return;
  }
  if (!/^[+\d]{10,15}$/.test(mobile_number)) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }
  if (!/^[+\d]{10,15}$/.test(whatsapp_number)) {
    res.status(400).json({ error: 'Please enter a valid WhatsApp number.' });
    return;
  }
  if (!delivery_address || !village_town || !post_office || !police_station || !district || !state) {
    res.status(400).json({ error: 'Please fill in all required Indian delivery address fields.' });
    return;
  }
  if (!/^\d{6}$/.test(pin_code)) {
    res.status(400).json({ error: 'Please enter a valid 6-digit Indian PIN code.' });
    return;
  }
  if (items.length === 0) {
    res.status(400).json({ error: 'Your shopping cart is empty.' });
    return;
  }
  if (payment_method !== 'COD' && payment_method !== 'UPI') {
    res.status(400).json({ error: 'Unsupported payment method.' });
    return;
  }

  const settings = db.prepare('SELECT * FROM store_settings WHERE id = 1').get() as {
    delivery_charge: number;
    free_delivery_threshold: number;
    cod_enabled: number;
    upi_enabled: number;
    upi_id: string;
    upi_qr_url: string;
  };

  if (payment_method === 'COD' && !settings.cod_enabled) {
    res.status(400).json({ error: 'Cash on Delivery is currently disabled.' });
    return;
  }
  if (payment_method === 'UPI' && (!settings.upi_enabled || (!settings.upi_id && !settings.upi_qr_url))) {
    res.status(400).json({ error: 'Online UPI payment is currently unavailable because UPI is not configured.' });
    return;
  }

  try {
    const createOrderTx = db.transaction(() => {
      let subtotal = 0;
      let discount_total = 0;
      let total_cost = 0;

      const resolvedItems: Array<{
        product_id: number;
        variant_id: number;
        product_name: string;
        weight_label: string;
        quantity: number;
        unit_price: number;
        unit_mrp: number;
        unit_cost: number;
        line_total: number;
        line_cost: number;
        line_profit: number;
      }> = [];

      for (const rawItem of items) {
        const variantId = Number(rawItem.variant_id);
        const quantity = Math.floor(Number(rawItem.quantity));
        if (!Number.isFinite(variantId) || !Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
          throw new Error('Invalid cart item quantity.');
        }

        const row = db
          .prepare(`
            SELECT v.*, p.name as product_name, p.is_active
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
            WHERE v.id = ?
          `)
          .get(variantId) as
          | {
              id: number;
              product_id: number;
              weight_label: string;
              enabled: number;
              selling_price: number;
              mrp: number;
              stock_qty: number;
              purchase_cost: number;
              packaging_cost: number;
              sticker_cost: number;
              other_expenses: number;
              product_name: string;
              is_active: number;
            }
          | undefined;

        if (!row || !row.is_active || !row.enabled) {
          throw new Error('One of the selected items is no longer available.');
        }
        if (row.selling_price <= 0) {
          throw new Error(`${row.product_name} (${row.weight_label}) does not have a price configured yet.`);
        }
        if (row.stock_qty < quantity) {
          throw new Error(
            `Insufficient stock for ${row.product_name} (${row.weight_label}). Available: ${row.stock_qty}.`
          );
        }

        const unitCost =
          Number(row.purchase_cost || 0) +
          Number(row.packaging_cost || 0) +
          Number(row.sticker_cost || 0) +
          Number(row.other_expenses || 0);
        const unitPrice = Number(row.selling_price);
        const unitMrp = Number(row.mrp || 0);
        const lineTotal = Number((unitPrice * quantity).toFixed(2));
        const lineCost = Number((unitCost * quantity).toFixed(2));
        const lineProfit = Number((lineTotal - lineCost).toFixed(2));

        if (unitMrp > unitPrice) {
          discount_total += Number(((unitMrp - unitPrice) * quantity).toFixed(2));
        }

        subtotal += lineTotal;
        total_cost += lineCost;

        resolvedItems.push({
          product_id: row.product_id,
          variant_id: row.id,
          product_name: row.product_name,
          weight_label: row.weight_label,
          quantity,
          unit_price: unitPrice,
          unit_mrp: unitMrp,
          unit_cost: Number(unitCost.toFixed(2)),
          line_total: lineTotal,
          line_cost: lineCost,
          line_profit: lineProfit,
        });

        db.prepare('UPDATE product_variants SET stock_qty = stock_qty - ?, updated_at = ? WHERE id = ?').run(
          quantity,
          new Date().toISOString(),
          row.id
        );
      }

      subtotal = Number(subtotal.toFixed(2));
      total_cost = Number(total_cost.toFixed(2));
      const freeThreshold = Number(settings.free_delivery_threshold || 0);
      const delivery_charge =
        freeThreshold > 0 && subtotal >= freeThreshold ? 0 : Number(settings.delivery_charge || 0);
      const total_amount = Number((subtotal + delivery_charge).toFixed(2));
      const gross_profit = Number((subtotal - total_cost).toFixed(2));

      let order_code = generateOrderCode();
      while (db.prepare('SELECT 1 FROM orders WHERE order_code = ?').get(order_code)) {
        order_code = generateOrderCode();
      }

      const now = new Date().toISOString();
      // Never mark unpaid orders as paid automatically
      const payment_status = payment_method === 'UPI' && upi_reference ? 'Pending Verification' : 'Unpaid';

      const orderRes = db
        .prepare(`
          INSERT INTO orders (
            order_code, customer_name, mobile_number, whatsapp_number,
            delivery_address, village_town, post_office, police_station, district, state, pin_code,
            payment_method, payment_status, upi_reference, order_status,
            subtotal, discount_total, delivery_charge, order_packaging_expense,
            total_amount, total_cost, gross_profit, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          order_code,
          customer_name,
          mobile_number,
          whatsapp_number,
          delivery_address,
          village_town,
          post_office,
          police_station,
          district,
          state,
          pin_code,
          payment_method,
          payment_status,
          upi_reference,
          subtotal,
          discount_total,
          delivery_charge,
          total_amount,
          total_cost,
          gross_profit,
          notes,
          now,
          now
        );

      const orderId = orderRes.lastInsertRowid as number;
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, weight_label,
          quantity, unit_price, unit_mrp, unit_cost, line_total, line_cost, line_profit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of resolvedItems) {
        insertItem.run(
          orderId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.weight_label,
          item.quantity,
          item.unit_price,
          item.unit_mrp,
          item.unit_cost,
          item.line_total,
          item.line_cost,
          item.line_profit
        );
      }

      db.prepare(
        'INSERT INTO order_status_history (order_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(orderId, 'Pending', 'Order placed by customer.', 'Customer', now);

      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as Record<string, unknown>;
      const savedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      const history = db
        .prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id ASC')
        .all(orderId);

      return { ...order, items: savedItems, history };
    });

    const created = createOrderTx();
    res.status(201).json({ order: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to place order.';
    res.status(400).json({ error: message });
  }
});

publicRouter.get('/orders/lookup', (req, res) => {
  const orderCode = String(req.query.order_code || '').trim().toUpperCase();
  const mobile = String(req.query.mobile || '').replace(/\s+/g, '').trim();

  if (!orderCode && !mobile) {
    res.status(400).json({ error: 'Provide an Order ID and Mobile Number to look up your order.' });
    return;
  }

  let orders: Array<Record<string, unknown>> = [];
  if (orderCode && mobile) {
    orders = db
      .prepare(
        `SELECT id, order_code, customer_name, mobile_number, whatsapp_number,
                delivery_address, village_town, post_office, police_station, district, state, pin_code,
                payment_method, payment_status, upi_reference, order_status,
                subtotal, discount_total, delivery_charge, total_amount, created_at, updated_at
         FROM orders
         WHERE UPPER(order_code) = ? AND mobile_number LIKE ?
         ORDER BY id DESC`
      )
      .all(orderCode, `%${mobile.slice(-10)}`) as Array<Record<string, unknown>>;
  } else if (orderCode) {
    orders = db
      .prepare(
        `SELECT id, order_code, customer_name, mobile_number, whatsapp_number,
                delivery_address, village_town, post_office, police_station, district, state, pin_code,
                payment_method, payment_status, upi_reference, order_status,
                subtotal, discount_total, delivery_charge, total_amount, created_at, updated_at
         FROM orders
         WHERE UPPER(order_code) = ?
         ORDER BY id DESC`
      )
      .all(orderCode) as Array<Record<string, unknown>>;
  } else {
    orders = db
      .prepare(
        `SELECT id, order_code, customer_name, mobile_number, whatsapp_number,
                delivery_address, village_town, post_office, police_station, district, state, pin_code,
                payment_method, payment_status, upi_reference, order_status,
                subtotal, discount_total, delivery_charge, total_amount, created_at, updated_at
         FROM orders
         WHERE mobile_number LIKE ?
         ORDER BY id DESC
         LIMIT 10`
      )
      .all(`%${mobile.slice(-10)}`) as Array<Record<string, unknown>>;
  }

  const enriched = orders.map((o) => {
    const items = db
      .prepare(
        'SELECT id, product_name, weight_label, quantity, unit_price, line_total FROM order_items WHERE order_id = ?'
      )
      .all(Number(o.id));
    const history = db
      .prepare('SELECT status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY id ASC')
      .all(Number(o.id));
    return { ...o, items, history };
  });

  res.json({ orders: enriched });
});
