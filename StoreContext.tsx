import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AppView, CartItem, Category, Product, ProductVariant, StoreSettings } from '../types';
import { DEFAULT_OFFICIAL_WHATSAPP } from '../utils/whatsapp';

interface StoreContextValue {
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshStore: () => Promise<void>;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  deliveryCharge: number;
  cartTotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, qty?: number) => { ok: boolean; error?: string };
  updateCartQty: (variantId: number, qty: number) => void;
  removeFromCart: (variantId: number) => void;
  clearCart: () => void;
  view: AppView;
  navigate: (nextView: AppView) => void;
  recentOrderCodes: string[];
  saveRecentOrderCode: (code: string) => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  business_name: 'LORAKU DRY FRUITS',
  tagline: 'Pure Dry Fruits & Healthy Seeds',
  logo_url: '/icon.svg',
  whatsapp_number: DEFAULT_OFFICIAL_WHATSAPP,
  contact_email: '',
  dispatch_address: '',
  delivery_charge: 50,
  free_delivery_threshold: 999,
  estimated_delivery_time: '3-6 business days',
  delivery_service_info: 'Freshly packed upon order and dispatched across India.',
  cod_enabled: 1,
  upi_enabled: 0,
  upi_id: '',
  upi_payee_name: 'LORAKU DRY FRUITS',
  upi_qr_url: '',
  about_us: '',
  contact_info: '',
  privacy_policy: '',
  terms_conditions: '',
  shipping_policy: '',
  return_refund_policy: '',
  updated_at: '',
};

const CART_STORAGE_KEY = 'loraku_cart_v1';
const ORDERS_STORAGE_KEY = 'loraku_recent_orders_v1';

const VIEW_TO_PATH: Record<AppView, string> = {
  home: '/',
  checkout: '/checkout',
  track: '/track-order',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy-policy',
  terms: '/terms',
  shipping: '/shipping-policy',
  refund: '/return-refund-policy',
  admin: '/admin',
};

function pathToView(pathname: string): AppView {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const entry = Object.entries(VIEW_TO_PATH).find(([, p]) => p === clean);
  return (entry?.[0] as AppView) || 'home';
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<AppView>(() => pathToView(window.location.pathname));

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [recentOrderCodes, setRecentOrderCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    const onPopState = () => {
      setView(pathToView(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextView: AppView) => {
    const nextPath = VIEW_TO_PATH[nextView] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const refreshStore = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/store');
      if (!res.ok) throw new Error('Unable to load store catalog.');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (Array.isArray(data.categories)) setCategories(data.categories);
      if (Array.isArray(data.products)) setProducts(data.products);

      // Sync cart prices & stock with latest server catalog
      if (Array.isArray(data.products)) {
        const variantMap = new Map<number, { product: Product; variant: ProductVariant }>();
        for (const p of data.products as Product[]) {
          for (const v of p.variants) {
            variantMap.set(v.id, { product: p, variant: v });
          }
        }
        setCart((prev) =>
          prev
            .map((item) => {
              const latest = variantMap.get(item.variant_id);
              if (!latest || latest.variant.selling_price <= 0 || latest.variant.stock_qty <= 0) {
                return null;
              }
              return {
                ...item,
                product_name: latest.product.name,
                image_url: latest.product.image_url,
                weight_label: latest.variant.weight_label,
                unit_price: latest.variant.selling_price,
                unit_mrp: latest.variant.mrp,
                stock_qty: latest.variant.stock_qty,
                quantity: Math.min(item.quantity, latest.variant.stock_qty),
              };
            })
            .filter((x): x is CartItem => x !== null)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading store.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStore();
  }, [refreshStore]);

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, qty = 1): { ok: boolean; error?: string } => {
      if (variant.selling_price <= 0) {
        return { ok: false, error: 'Price is not configured yet for this pack.' };
      }
      if (variant.stock_qty <= 0) {
        return { ok: false, error: 'This pack size is currently out of stock.' };
      }

      let result: { ok: boolean; error?: string } = { ok: true };
      setCart((prev) => {
        const existing = prev.find((i) => i.variant_id === variant.id);
        const currentQty = existing ? existing.quantity : 0;
        const targetQty = currentQty + qty;
        if (targetQty > variant.stock_qty) {
          result = { ok: false, error: `Only ${variant.stock_qty} pack(s) available in stock.` };
          return prev;
        }
        if (existing) {
          return prev.map((i) =>
            i.variant_id === variant.id
              ? { ...i, quantity: targetQty, unit_price: variant.selling_price, stock_qty: variant.stock_qty }
              : i
          );
        }
        return [
          ...prev,
          {
            product_id: product.id,
            variant_id: variant.id,
            product_name: product.name,
            weight_label: variant.weight_label,
            unit_price: variant.selling_price,
            unit_mrp: variant.mrp,
            image_url: product.image_url,
            quantity: qty,
            stock_qty: variant.stock_qty,
          },
        ];
      });
      return result;
    },
    []
  );

  const updateCartQty = useCallback((variantId: number, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((i) => i.variant_id !== variantId);
      return prev.map((i) =>
        i.variant_id === variantId ? { ...i, quantity: Math.min(qty, i.stock_qty) } : i
      );
    });
  }, []);

  const removeFromCart = useCallback((variantId: number) => {
    setCart((prev) => prev.filter((i) => i.variant_id !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const saveRecentOrderCode = useCallback((code: string) => {
    setRecentOrderCodes((prev) => {
      const next = [code, ...prev.filter((c) => c !== code)].slice(0, 10);
      try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => Number(cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0).toFixed(2)),
    [cart]
  );

  const deliveryCharge = useMemo(() => {
    if (cartSubtotal <= 0) return 0;
    const threshold = Number(settings.free_delivery_threshold || 0);
    if (threshold > 0 && cartSubtotal >= threshold) return 0;
    return Number(settings.delivery_charge || 0);
  }, [cartSubtotal, settings.delivery_charge, settings.free_delivery_threshold]);

  const cartTotal = useMemo(
    () => Number((cartSubtotal + deliveryCharge).toFixed(2)),
    [cartSubtotal, deliveryCharge]
  );

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        products,
        loading,
        error,
        refreshStore,
        cart,
        cartCount,
        cartSubtotal,
        deliveryCharge,
        cartTotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        view,
        navigate,
        recentOrderCodes,
        saveRecentOrderCode,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
