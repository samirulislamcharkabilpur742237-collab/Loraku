import React, { useMemo, useState } from 'react';
import { ArrowDown, MessageCircle, Search, Truck, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatINR } from '../utils/format';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/whatsapp';

type CollectionFilter = 'all' | 'featured' | 'new' | 'bestseller';

export const HomePage: React.FC = () => {
  const { settings, categories, products, loading, error, refreshStore, navigate } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all');
  const [activeModal, setActiveModal] = useState<{ product: Product; variantId?: number } | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) {
        return false;
      }
      if (collectionFilter === 'featured' && !p.is_featured) return false;
      if (collectionFilter === 'new' && !p.is_new_arrival) return false;
      if (collectionFilter === 'bestseller' && !p.is_best_seller) return false;
      if (q) {
        const hay = `${p.name} ${p.short_description} ${p.category_name || ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [products, selectedCategoryId, collectionFilter, searchQuery]);

  const anyProductPriced = useMemo(
    () => products.some((p) => p.variants?.some((v) => v.selling_price > 0)),
    [products]
  );

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    `Hello ${settings.business_name}, I would like to know more about your dry fruits and healthy seeds.`
  );

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="pb-16">
      {/* 1. Storefront Hero (Balanced 2-column split on desktop) */}
      <section className="border-b border-[#E6DFD1] bg-[#F3EFE6]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <p className="text-xs font-semibold tracking-wider text-[#2D6A4F]">
                {settings.business_name} · Home-Packed Freshness
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-[1.12] tracking-tight text-[#1C241E] [text-wrap:balance]">
                Pure Indian Dry Fruits &amp; Daily Healthy Seeds
              </h1>
              <p className="text-base text-[#4A554D] leading-relaxed max-w-xl">
                {settings.tagline || 'Pure Dry Fruits & Healthy Seeds'}. Carefully cleaned, weighed, and sealed in small batches for everyday family nutrition.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="min-h-[46px] inline-flex items-center gap-2 rounded-xl bg-[#1B4332] px-6 py-3 text-sm font-semibold text-white hover:bg-[#143325] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Browse Products</span>
                  <ArrowDown className="h-4 w-4" />
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] inline-flex items-center gap-2 rounded-xl border border-[#1B4332] bg-white px-5 py-3 text-sm font-semibold text-[#1B4332] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat on WhatsApp</span>
                </a>
                <PWAInstallButton />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-[#5A655D]">
                <span>Pack sizes: 100g, 250g, 500g, 1kg</span>
                <span aria-hidden="true">·</span>
                <span>
                  {settings.free_delivery_threshold > 0
                    ? `Free delivery above ${formatINR(settings.free_delivery_threshold)}`
                    : `Delivery ${formatINR(settings.delivery_charge)}`}
                </span>
                <span aria-hidden="true">·</span>
                <span>WhatsApp {formatWhatsAppDisplay(settings.whatsapp_number)}</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-64 sm:h-80 lg:h-full min-h-[280px] overflow-hidden rounded-2xl border border-[#DFD7C5] bg-[#E8E1D3]">
                <img
                  src="/src/assets/images/hero_loraku_banner_1794845323058.jpg"
                  alt="Assorted cashews, almonds, raisins, dates, figs, pumpkin seeds, and chia seeds from LORAKU DRY FRUITS"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Product Catalog */}
      <section id="catalog-section" className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E6DFD1]">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C241E]">
              Our Products
            </h2>
            <p className="mt-1 text-sm text-[#5A655D]">
              Select a category, filter by collection, or choose your preferred pack weight.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B756D]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kaju, badam, chia seeds..."
              aria-label="Search products"
              className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] bg-white pl-10 pr-9 py-2 text-sm text-[#1C241E] placeholder:text-[#7A847C] focus:border-[#1B4332] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B756D] hover:text-[#1C241E] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category & Collection Filter Bar */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Product categories">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#F3EFE6] text-[#354038] hover:bg-[#E7E0D0]'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[#F3EFE6] text-[#354038] hover:bg-[#E7E0D0]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 rounded-lg bg-[#EFE9DC] p-1 self-start">
            {(
              [
                ['all', 'All'],
                ['featured', 'Featured'],
                ['bestseller', 'Best Sellers'],
                ['new', 'New Arrivals'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCollectionFilter(key)}
                className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  collectionFilter === key
                    ? 'bg-white text-[#1C241E] shadow-xs'
                    : 'text-[#5A655D] hover:text-[#1C241E]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Helpful owner notice when no product prices are configured yet */}
        {!loading && products.length > 0 && !anyProductPriced && (
          <div className="mt-6 rounded-xl border border-[#DFD7C5] bg-[#F3EFE6] px-4 py-3.5 text-sm text-[#2E3A31] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              Catalog items are awaiting owner pricing &amp; stock setup. Customers can enquire on WhatsApp, or the store owner can enter prices in Owner Admin.
            </span>
            <button
              type="button"
              onClick={() => navigate('admin')}
              className="shrink-0 rounded-lg bg-[#1B4332] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#143325] cursor-pointer whitespace-nowrap"
            >
              Open Owner Admin
            </button>
          </div>
        )}

        {/* States & Product Grid */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="rounded-2xl border border-[#E6DFD1] bg-white p-4 space-y-3">
                <div className="aspect-[4/3] rounded-xl bg-[#EFE9DC]" />
                <div className="h-4 w-2/3 rounded bg-[#EFE9DC]" />
                <div className="h-3 w-full rounded bg-[#F3EFE6]" />
                <div className="h-9 w-full rounded bg-[#EFE9DC]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-900">{error}</p>
            <button
              type="button"
              onClick={() => refreshStore()}
              className="mt-3 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#E6DFD1] bg-white p-10 text-center">
            <p className="font-medium text-[#1C241E]">No matching products found</p>
            <p className="mt-1 text-sm text-[#5A655D]">
              Try clearing your search or switching to All Categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
                setCollectionFilter('all');
              }}
              className="mt-4 rounded-lg border border-[#D8D0C0] px-4 py-2 text-xs font-semibold text-[#1C241E] hover:bg-[#F3EFE6] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetail={(p, variantId) => setActiveModal({ product: p, variantId })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Delivery & Store Information */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-14">
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#1B4332]">
              <Truck className="h-5 w-5" />
              <h2 className="font-display text-xl font-semibold text-[#1C241E]">
                Delivery &amp; Packing
              </h2>
            </div>
            <p className="text-sm text-[#5A655D] leading-relaxed">
              {settings.delivery_service_info}
            </p>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-[#1C241E]">Shipping Rates &amp; Time</p>
            <p className="text-[#5A655D]">
              Standard delivery: <strong className="text-[#1C241E] tabular-nums">{formatINR(settings.delivery_charge)}</strong>
            </p>
            {settings.free_delivery_threshold > 0 && (
              <p className="text-[#5A655D]">
                Free delivery on orders of <strong className="text-[#1C241E] tabular-nums">{formatINR(settings.free_delivery_threshold)}</strong> or more
              </p>
            )}
            <p className="text-[#5A655D]">Estimated delivery: {settings.estimated_delivery_time}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1C241E]">Need help or bulk pricing?</p>
            <div className="flex flex-wrap gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] inline-flex items-center gap-2 rounded-lg bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143325]"
              >
                <MessageCircle className="h-4 w-4" />
                Message on WhatsApp
              </a>
              <button
                type="button"
                onClick={() => navigate('shipping')}
                className="min-h-[42px] rounded-lg border border-[#D8D0C0] px-4 py-2 text-xs font-semibold text-[#1C241E] hover:bg-[#F3EFE6] cursor-pointer"
              >
                Shipping Policy
              </button>
            </div>
          </div>
        </div>
      </section>

      {activeModal && (
        <ProductModal
          product={activeModal.product}
          initialVariantId={activeModal.variantId}
          onClose={() => setActiveModal(null)}
        />
      )}
    </main>
  );
};
