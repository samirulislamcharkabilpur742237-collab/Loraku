import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatINR } from '../utils/format';

export const CartDrawer: React.FC = () => {
  const {
    settings,
    cart,
    cartOpen,
    setCartOpen,
    cartSubtotal,
    deliveryCharge,
    cartTotal,
    updateCartQty,
    removeFromCart,
    navigate,
  } = useStore();

  if (!cartOpen) return null;

  const threshold = Number(settings.free_delivery_threshold || 0);
  const amountForFree = threshold > 0 && cartSubtotal < threshold ? threshold - cartSubtotal : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={() => setCartOpen(false)}
        aria-hidden="true"
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FAF8F5] shadow-2xl border-l border-[#E6DFD1]"
        aria-label="Shopping Cart"
      >
        <div className="flex items-center justify-between border-b border-[#E6DFD1] bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#1B4332]" />
            <h2 className="font-display text-lg font-semibold text-[#1C241E]">Your Shopping Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#5A655D] hover:bg-[#F3EFE6] cursor-pointer"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EFE6] text-[#1B4332] mb-3">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="font-medium text-[#1C241E]">Your cart is currently empty</p>
              <p className="mt-1 text-sm text-[#5A655D] max-w-xs">
                Browse our fresh dry fruits, healthy seeds, and house mixes to add items.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('home');
                }}
                className="mt-5 rounded-lg bg-[#1B4332] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#143325] cursor-pointer"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {threshold > 0 && (
                <div className="rounded-xl border border-[#DFD7C5] bg-[#F3EFE6] px-4 py-3 text-xs text-[#2E3A31]">
                  {amountForFree > 0 ? (
                    <>
                      Add <strong className="tabular-nums">{formatINR(amountForFree)}</strong> more for{' '}
                      <strong>Free Delivery</strong> (orders above {formatINR(threshold)}).
                    </>
                  ) : (
                    <span>Your order qualifies for <strong>Free Delivery</strong>.</span>
                  )}
                </div>
              )}

              <ul className="divide-y divide-[#E6DFD1]">
                {cart.map((item) => (
                  <li key={item.variant_id} className="flex gap-3.5 py-4">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      referrerPolicy="no-referrer"
                      className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#EFE9DC] border border-[#E6DFD1]"
                    />
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#1C241E] truncate">
                            {item.product_name}
                          </h3>
                          <p className="text-xs text-[#5A655D] mt-0.5 tabular-nums">
                            Pack: {item.weight_label} · {formatINR(item.unit_price)} each
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variant_id)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#7A847C] hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          aria-label={`Remove ${item.product_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-[#D8D0C0] bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variant_id, item.quantity - 1)}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#1C241E] hover:bg-[#F3EFE6] rounded-l-lg cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-3 text-sm font-medium tabular-nums text-[#1C241E]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variant_id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock_qty}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#1C241E] hover:bg-[#F3EFE6] disabled:opacity-40 rounded-r-lg cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-[#1C241E] tabular-nums">
                          {formatINR(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[#E6DFD1] bg-white px-5 py-4 space-y-3 pb-safe">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#5A655D]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#1C241E]">{formatINR(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#5A655D]">
                <span>Delivery Charges</span>
                <span className="tabular-nums font-medium text-[#1C241E]">
                  {deliveryCharge === 0 ? 'Free' : formatINR(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E6DFD1] pt-2 text-base font-semibold text-[#1C241E]">
                <span>Payable Total</span>
                <span className="tabular-nums">{formatINR(cartTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(false);
                navigate('checkout');
              }}
              className="w-full min-h-[48px] rounded-xl bg-[#1B4332] px-5 py-3 text-sm font-semibold text-white hover:bg-[#143325] transition-colors cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
