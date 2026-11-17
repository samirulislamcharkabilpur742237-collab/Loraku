import React, { useState } from 'react';
import { Leaf, MessageCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { calcDiscountPercent, formatINR } from '../utils/format';
import { buildProductEnquiryMessage, buildWhatsAppUrl } from '../utils/whatsapp';

interface ProductModalProps {
  product: Product;
  initialVariantId?: number;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, initialVariantId, onClose }) => {
  const { settings, addToCart, setCartOpen, navigate } = useStore();
  const variants = product.variants || [];
  const defaultVariant =
    variants.find((v) => v.id === initialVariantId) ||
    variants.find((v) => v.selling_price > 0 && v.stock_qty > 0) ||
    variants[0];

  const [selectedVariantId, setSelectedVariantId] = useState<number>(defaultVariant?.id || 0);
  const [qty, setQty] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || defaultVariant;
  const price = selectedVariant ? Number(selectedVariant.selling_price) : 0;
  const mrp = selectedVariant ? Number(selectedVariant.mrp) : 0;
  const stock = selectedVariant ? Number(selectedVariant.stock_qty) : 0;
  const discountPct = calcDiscountPercent(mrp, price);
  const isConfigured = price > 0;
  const isAvailable = isConfigured && stock > 0;

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    buildProductEnquiryMessage(settings.business_name, product.name, selectedVariant?.weight_label)
  );

  const handleAdd = () => {
    if (!selectedVariant) return;
    const res = addToCart(product, selectedVariant, qty);
    if (!res.ok) {
      setFeedback(res.error || 'Unable to add');
      return;
    }
    setFeedback('Added to cart');
    setTimeout(() => {
      onClose();
      setCartOpen(true);
    }, 300);
  };

  const handleBuyNow = () => {
    if (!selectedVariant) return;
    const res = addToCart(product, selectedVariant, qty);
    if (!res.ok) {
      setFeedback(res.error || 'Unable to proceed');
      return;
    }
    onClose();
    navigate('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-[#E6DFD1]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-white/90 text-[#1C241E] shadow-sm border border-[#E6DFD1] hover:bg-[#F3EFE6] cursor-pointer"
          aria-label="Close product details"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-[4/3] md:aspect-auto md:h-full bg-[#F3EFE6]">
            {!imgError && product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[240px] w-full flex-col items-center justify-center gap-2 text-[#5A655D]">
                <Leaf className="h-10 w-10 text-[#2D6A4F]" />
                <span className="text-sm font-medium">{product.name}</span>
              </div>
            )}
          </div>

          <div className="p-6 flex flex-col justify-between space-y-5">
            <div>
              <div className="text-xs text-[#5A655D]">
                <span>{product.category_name}</span>
                {isAvailable && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="text-[#2D6A4F] font-medium">Available: {stock} packs</span>
                  </>
                )}
                {isConfigured && stock <= 0 && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="text-amber-800 font-medium">Out of Stock</span>
                  </>
                )}
              </div>

              <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#1C241E]">
                {product.name}
              </h2>
              <p className="mt-2 text-sm text-[#4A554D] leading-relaxed">
                {product.detailed_description || product.short_description}
              </p>

              {/* Pack Weight Options */}
              {variants.length > 0 && (
                <div className="mt-5">
                  <label className="block text-xs font-semibold text-[#1C241E] mb-2">
                    Select Weight
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v) => {
                      const active = v.id === selectedVariant?.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            setQty(1);
                            setFeedback(null);
                          }}
                          className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#1B4332] text-white'
                              : 'bg-[#F3EFE6] text-[#1C241E] hover:bg-[#E7E0D0]'
                          }`}
                        >
                          {v.weight_label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Display */}
              <div className="mt-5">
                {isConfigured ? (
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold text-[#1C241E] tabular-nums">
                      {formatINR(price)}
                    </span>
                    {mrp > price && (
                      <>
                        <span className="text-sm text-[#7A847C] line-through tabular-nums">
                          MRP {formatINR(mrp)}
                        </span>
                        <span className="text-xs font-semibold text-[#2D6A4F] tabular-nums">
                          Save {discountPct}%
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#5A655D]">
                    Price &amp; stock not configured yet by owner. Contact us on WhatsApp for today&apos;s rate.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#EFE9DC]">
              {feedback && <p className="text-xs font-medium text-[#1B4332]">{feedback}</p>}

              {isAvailable ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#1C241E]">Quantity:</span>
                    <div className="inline-flex items-center rounded-lg border border-[#D8D0C0] bg-white">
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-[#F3EFE6] rounded-l-lg cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 text-sm font-semibold tabular-nums">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty((q) => Math.min(stock, q + 1))}
                        disabled={qty >= stock}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-[#F3EFE6] disabled:opacity-40 rounded-r-lg cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#1B4332] bg-white px-4 py-2.5 text-sm font-semibold text-[#1B4332] hover:bg-[#F3EFE6] cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="min-h-[46px] inline-flex items-center justify-center rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#143325] cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </div>
                </>
              ) : (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[46px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#143325]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask Rate &amp; Order on WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
