import React, { useState } from 'react';
import { Leaf, MessageCircle, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product, ProductVariant } from '../types';
import { calcDiscountPercent, formatINR } from '../utils/format';
import { buildProductEnquiryMessage, buildWhatsAppUrl } from '../utils/whatsapp';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product, selectedVariantId?: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetail }) => {
  const { settings, addToCart, setCartOpen, navigate } = useStore();
  const variants = product.variants || [];
  const defaultVariant =
    variants.find((v) => v.selling_price > 0 && v.stock_qty > 0) || variants[0] || null;

  const [selectedVariantId, setSelectedVariantId] = useState<number>(defaultVariant?.id || 0);
  const [imgError, setImgError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedVariant: ProductVariant | undefined =
    variants.find((v) => v.id === selectedVariantId) || defaultVariant || undefined;

  const price = selectedVariant ? Number(selectedVariant.selling_price) : 0;
  const mrp = selectedVariant ? Number(selectedVariant.mrp) : 0;
  const stock = selectedVariant ? Number(selectedVariant.stock_qty) : 0;
  const discountPct = calcDiscountPercent(mrp, price);

  const isConfigured = price > 0;
  const isAvailable = isConfigured && stock > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant) return;
    const res = addToCart(product, selectedVariant, 1);
    if (!res.ok) {
      setFeedback(res.error || 'Unable to add');
      setTimeout(() => setFeedback(null), 2500);
    } else {
      setFeedback('Added to cart');
      setTimeout(() => setFeedback(null), 1600);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedVariant) return;
    const res = addToCart(product, selectedVariant, 1);
    if (!res.ok) {
      setFeedback(res.error || 'Unable to proceed');
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    setCartOpen(false);
    navigate('checkout');
  };

  const whatsappInquiryUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    buildProductEnquiryMessage(settings.business_name, product.name, selectedVariant?.weight_label)
  );

  return (
    <article
      className="group flex flex-col rounded-2xl border border-[#E6DFD1] bg-white overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Product Image */}
      <button
        type="button"
        onClick={() => onOpenDetail(product, selectedVariant?.id)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3EFE6] text-left cursor-pointer"
      >
        {!imgError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#F3EFE6] to-[#E6DFD1] p-6 text-center text-[#5A655D]">
            <Leaf className="h-8 w-8 text-[#2D6A4F]" />
            <span className="text-xs font-medium">{product.name}</span>
          </div>
        )}
      </button>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs text-[#5A655D]">
          <span>{product.category_name || 'Dry Fruits'}</span>
          {isAvailable && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#2D6A4F] font-medium">In Stock ({stock})</span>
            </>
          )}
          {isConfigured && stock <= 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-800 font-medium">Out of Stock</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpenDetail(product, selectedVariant?.id)}
          className="mt-1.5 text-left cursor-pointer"
        >
          <h3 className="text-base font-semibold text-[#1C241E] leading-snug group-hover:text-[#1B4332]">
            {product.name}
          </h3>
        </button>

        <p className="mt-1 text-sm text-[#5A655D] line-clamp-2 flex-1">
          {product.short_description}
        </p>

        {/* Weight Selector */}
        {variants.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5" role="group" aria-label={`Select pack weight for ${product.name}`}>
            {variants.map((v) => {
              const active = v.id === selectedVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariantId(v.id)}
                  className={`min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#1B4332] text-white'
                      : 'bg-[#F3EFE6] text-[#354038] hover:bg-[#E7E0D0]'
                  }`}
                >
                  {v.weight_label}
                </button>
              );
            })}
          </div>
        )}

        {/* Pricing */}
        <div className="mt-4 pt-3 border-t border-[#EFE9DC]">
          {isConfigured ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#1C241E] tabular-nums">
                {formatINR(price)}
              </span>
              {mrp > price && (
                <>
                  <span className="text-xs text-[#7A847C] line-through tabular-nums">
                    {formatINR(mrp)}
                  </span>
                  <span className="text-xs font-semibold text-[#2D6A4F] tabular-nums">
                    {discountPct}% off
                  </span>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs font-medium text-[#5A655D]">
              Price not set yet — ask today&apos;s rate on WhatsApp
            </p>
          )}

          {feedback && (
            <p className="mt-1.5 text-xs font-medium text-[#1B4332]">{feedback}</p>
          )}

          {/* Action Buttons */}
          {isAvailable ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1B4332] bg-white px-3 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#F3EFE6] transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Add to Cart
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                className="min-h-[42px] inline-flex items-center justify-center rounded-lg bg-[#1B4332] px-3 py-2 text-xs font-semibold text-white hover:bg-[#143325] transition-colors whitespace-nowrap cursor-pointer"
              >
                Buy Now
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1B4332] bg-[#F3EFE6] px-3 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#E7E0D0] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Enquire on WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
