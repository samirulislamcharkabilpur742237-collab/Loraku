import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data/loraku.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const UPLOADS_DIR = path.resolve(path.dirname(DB_PATH), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  const migrationPath = path.resolve(process.cwd(), 'server/migrations/001_init.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(migrationSql);

  const now = new Date().toISOString();
  const applied = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get('001_init');
  if (!applied) {
    db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run('001_init', now);
  }

  // Optional env-based initial admin creation
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (adminCount.count === 0 && process.env.ADMIN_INITIAL_USERNAME && process.env.ADMIN_INITIAL_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_INITIAL_PASSWORD, 12);
    db.prepare(
      'INSERT INTO admins (username, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(process.env.ADMIN_INITIAL_USERNAME.trim(), 'Store Owner', hash, now, now);
  }

  // Seed default store_settings if not present
  const existingSettings = db.prepare('SELECT id FROM store_settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO store_settings (
        id, business_name, tagline, logo_url, whatsapp_number, contact_email, dispatch_address,
        delivery_charge, free_delivery_threshold, estimated_delivery_time, delivery_service_info,
        cod_enabled, upi_enabled, upi_id, upi_payee_name, upi_qr_url,
        about_us, contact_info, privacy_policy, terms_conditions, shipping_policy, return_refund_policy,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'LORAKU DRY FRUITS',
      'Pure Dry Fruits & Healthy Seeds',
      '/icon.svg',
      '+917029017716',
      '',
      '',
      50,
      999,
      '3-6 business days',
      'Freshly packed upon order and dispatched via trusted parcel services.',
      1,
      0,
      '',
      'LORAKU DRY FRUITS',
      '',
      'LORAKU DRY FRUITS is an Indian home-based dry fruits and healthy seeds business focused on honest quality, clean hygienic packing, and fair everyday pricing. Every pack is weighed and sealed fresh when you order.',
      'For order enquiries, bulk rates, or support, reach us directly on our official WhatsApp number +91 7029017716.',
      'We collect only the customer name, mobile/WhatsApp numbers, and delivery address needed to process and deliver your order. We never sell or share customer contact information with third-party marketers.',
      'All orders placed on LORAKU DRY FRUITS are subject to stock availability and owner confirmation. Prices and delivery charges shown at checkout apply at the time of order placement.',
      'Orders are packed after confirmation and dispatched from our home facility. Estimated delivery timelines depend on your PIN code and local parcel service availability.',
      'If a package arrives damaged or incorrect, please contact us on WhatsApp (+91 7029017716) within 48 hours of delivery with clear photos so we can arrange a fair replacement or refund.',
      now
    );
  }

  // Seed initial categories & products only if categories table is empty
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (catCount.count === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    const catDryFruitsId = insertCat.run(
      'Dry Fruits',
      'dry-fruits',
      'Handpicked whole cashews, almonds, raisins, dates, and figs.',
      1,
      now
    ).lastInsertRowid as number;
    const catSeedsId = insertCat.run(
      'Healthy Seeds',
      'healthy-seeds',
      'Nutrient-dense raw seeds for daily nutrition, cooking, and snacking.',
      2,
      now
    ).lastInsertRowid as number;
    const catSpecialId = insertCat.run(
      'Special Products',
      'special-products',
      'House-crafted blends of dry fruits and superfood seeds.',
      3,
      now
    ).lastInsertRowid as number;

    const initialProducts: Array<{
      categoryId: number;
      name: string;
      slug: string;
      shortDesc: string;
      detailedDesc: string;
      imageUrl: string;
      featured: number;
      newArrival: number;
      bestSeller: number;
    }> = [
      // CATEGORY A: DRY FRUITS
      {
        categoryId: catDryFruitsId,
        name: 'Premium Cashew Nuts (Kaju)',
        slug: 'premium-cashew-nuts-kaju',
        shortDesc: 'Whole ivory W240 cashews with a naturally creamy crunch.',
        detailedDesc:
          'Carefully graded whole cashew kernels (Kaju) packed in food-grade pouches to preserve crispness and natural sweetness. Ideal for daily snacking, sweets, and festive cooking.',
        imageUrl: '/src/assets/images/prod_cashews_1794845324162.jpg',
        featured: 1,
        newArrival: 0,
        bestSeller: 1,
      },
      {
        categoryId: catDryFruitsId,
        name: 'Almonds (Badam)',
        slug: 'almonds-badam',
        shortDesc: 'Whole raw brown almonds rich in natural crunch and nutrition.',
        detailedDesc:
          'Clean, whole almonds (Badam) selected for uniform size and fresh aroma. Suitable for overnight soaking, morning snacking, smoothies, and traditional Indian desserts.',
        imageUrl: '/src/assets/images/prod_almonds_1794845325045.jpg',
        featured: 1,
        newArrival: 0,
        bestSeller: 1,
      },
      {
        categoryId: catDryFruitsId,
        name: 'Raisins (Kishmish)',
        slug: 'raisins-kishmish',
        shortDesc: 'Plump, naturally sweet golden-green Indian raisins.',
        detailedDesc:
          'Soft, juicy raisins (Kishmish) cleaned and sorted by hand. Enjoy as an everyday energy snack or in kheer, pulao, and baking.',
        imageUrl: '/src/assets/images/prod_raisins_1794845325313.jpg',
        featured: 0,
        newArrival: 0,
        bestSeller: 1,
      },
      {
        categoryId: catDryFruitsId,
        name: 'Dates (Khajur)',
        slug: 'dates-khajur',
        shortDesc: 'Soft, naturally caramel-sweet whole dates.',
        detailedDesc:
          'Moist and flavourful dates (Khajur) packed hygienically without added sugar or glaze. A wholesome natural sweetener and quick energy snack.',
        imageUrl: '/src/assets/images/prod_dates_1794845325261.jpg',
        featured: 1,
        newArrival: 1,
        bestSeller: 0,
      },
      {
        categoryId: catDryFruitsId,
        name: 'Figs (Anjeer)',
        slug: 'figs-anjeer',
        shortDesc: 'Sun-dried tender figs with rich natural fibre.',
        detailedDesc:
          'Sun-dried whole figs (Anjeer) with subtle honeyed notes and soft texture. Traditionally enjoyed soaked overnight or sliced into warm milk and bowls.',
        imageUrl: '/src/assets/images/prod_figs_1794845325718.jpg',
        featured: 0,
        newArrival: 1,
        bestSeller: 0,
      },
      // CATEGORY B: HEALTHY SEEDS
      {
        categoryId: catSeedsId,
        name: 'Pumpkin Seeds',
        slug: 'pumpkin-seeds',
        shortDesc: 'Raw hulled green pepitas ready for snacking or roasting.',
        detailedDesc:
          'Clean, shell-free green pumpkin seeds packed with plant protein and minerals. Sprinkle over salads, oats, or lightly roast with a pinch of rock salt.',
        imageUrl: '/src/assets/images/prod_pumpkin_seeds_1794845326327.jpg',
        featured: 1,
        newArrival: 0,
        bestSeller: 1,
      },
      {
        categoryId: catSeedsId,
        name: 'Sunflower Seeds',
        slug: 'sunflower-seeds',
        shortDesc: 'Mild, nutty raw hulled sunflower kernels.',
        detailedDesc:
          'Freshly packed raw sunflower seed kernels with a delicate crunch. Versatile for trail mixes, breakfast bowls, homemade granola, and baking.',
        imageUrl: '/src/assets/images/prod_sunflower_seeds_1794845325978.jpg',
        featured: 0,
        newArrival: 0,
        bestSeller: 0,
      },
      {
        categoryId: catSeedsId,
        name: 'Chia Seeds',
        slug: 'chia-seeds',
        shortDesc: 'Clean raw chia seeds for hydration drinks, puddings, and smoothies.',
        detailedDesc:
          'Sorted black-and-grey chia seeds free from dust and husk. Easy to soak in water, milk, or lemon water for daily fibre and omega-3 intake.',
        imageUrl: '/src/assets/images/prod_chia_seeds_1794845326520.jpg',
        featured: 1,
        newArrival: 1,
        bestSeller: 1,
      },
      {
        categoryId: catSeedsId,
        name: 'Flax Seeds',
        slug: 'flax-seeds',
        shortDesc: 'Whole golden-brown alsi seeds for roasting or grinding.',
        detailedDesc:
          'Crisp whole flax seeds (Alsi) cleaned for daily kitchen use. Dry-roast lightly or grind fresh to mix into rotis, curd, and smoothies.',
        imageUrl: '/src/assets/images/prod_flax_seeds_1794845327782.jpg',
        featured: 0,
        newArrival: 0,
        bestSeller: 0,
      },
      {
        categoryId: catSeedsId,
        name: 'Watermelon Seeds',
        slug: 'watermelon-seeds',
        shortDesc: 'Hulled ivory magaj seeds ideal for sweets, curries, and snacks.',
        detailedDesc:
          'Finely hulled watermelon seed kernels (Magaj) widely used in Indian gravies, ladoos, thandai, and roasted seed snacks.',
        imageUrl: '/src/assets/images/prod_watermelon_seeds_1794845327640.jpg',
        featured: 0,
        newArrival: 0,
        bestSeller: 0,
      },
      {
        categoryId: catSeedsId,
        name: 'Melon Seeds',
        slug: 'melon-seeds',
        shortDesc: 'Clean char magaz muskmelon kernels for rich traditional recipes.',
        detailedDesc:
          'Carefully cleaned muskmelon kernels (Char Magaz) valued in Indian kitchens for korma pastes, mithai, and nutritious daily mixes.',
        imageUrl: '/src/assets/images/prod_melon_seeds_1794845328149.jpg',
        featured: 0,
        newArrival: 1,
        bestSeller: 0,
      },
      {
        categoryId: catSeedsId,
        name: 'White Sesame Seeds',
        slug: 'white-sesame-seeds',
        shortDesc: 'Pure hulled safed til for cooking, chikki, and tempering.',
        detailedDesc:
          'Bright, clean white sesame seeds (Safed Til) ready for til ladoos, tahini, stir-fries, and traditional winter sweets.',
        imageUrl: '/src/assets/images/prod_white_sesame_1794845328560.jpg',
        featured: 0,
        newArrival: 0,
        bestSeller: 0,
      },
      {
        categoryId: catSeedsId,
        name: 'Black Sesame Seeds',
        slug: 'black-sesame-seeds',
        shortDesc: 'Aromatic whole kala til with rich earthy flavour.',
        detailedDesc:
          'Unbleached black sesame seeds (Kala Til) sorted for purity. Ideal for traditional chutneys, festive sweets, and daily mineral-rich garnishing.',
        imageUrl: '/src/assets/images/prod_black_sesame_1794845328736.jpg',
        featured: 0,
        newArrival: 1,
        bestSeller: 0,
      },
      // CATEGORY C: SPECIAL PRODUCTS
      {
        categoryId: catSpecialId,
        name: 'Loraku Special Dry Fruit Mix',
        slug: 'loraku-special-dry-fruit-mix',
        shortDesc: 'Balanced house blend of cashews, almonds, raisins, dates, and figs.',
        detailedDesc:
          'Our signature dry fruit mix crafted in small batches with whole cashews, almonds, golden raisins, chopped figs, and dates for convenient daily snacking and gifting.',
        imageUrl: '/src/assets/images/prod_dry_fruit_mix_1794845329180.jpg',
        featured: 1,
        newArrival: 1,
        bestSeller: 1,
      },
      {
        categoryId: catSpecialId,
        name: 'Loraku Special Healthy Seeds Mix',
        slug: 'loraku-special-healthy-seeds-mix',
        shortDesc: 'Daily superfood blend of pumpkin, sunflower, chia, flax, melon, and sesame seeds.',
        detailedDesc:
          'Thoughtfully proportioned seed blend combining pumpkin, sunflower, chia, flax, watermelon, melon, and sesame seeds for effortless daily nutrition.',
        imageUrl: '/src/assets/images/prod_healthy_seeds_mix_1794845329168.jpg',
        featured: 1,
        newArrival: 1,
        bestSeller: 1,
      },
    ];

    const insertProduct = db.prepare(`
      INSERT INTO products (
        category_id, name, slug, short_description, detailed_description, image_url,
        is_featured, is_new_arrival, is_best_seller, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (
        product_id, weight_label, sort_order, enabled, selling_price, mrp, stock_qty,
        low_stock_threshold, purchase_cost, packaging_cost, sticker_cost, other_expenses, updated_at
      ) VALUES (?, ?, ?, 1, 0, 0, 0, 5, 0, 0, 0, 0, ?)
    `);

    const weights = ['100g', '250g', '500g', '1kg'];

    const seedAll = db.transaction(() => {
      for (const p of initialProducts) {
        const res = insertProduct.run(
          p.categoryId,
          p.name,
          p.slug,
          p.shortDesc,
          p.detailedDesc,
          p.imageUrl,
          p.featured,
          p.newArrival,
          p.bestSeller,
          now,
          now
        );
        const productId = res.lastInsertRowid as number;
        weights.forEach((w, idx) => {
          insertVariant.run(productId, w, idx + 1, now);
        });
      }
    });

    seedAll();
  }
}
