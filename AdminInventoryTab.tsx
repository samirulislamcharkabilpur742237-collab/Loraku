import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category, Product, ProductVariant } from '../../types';
import { formatINR } from '../../utils/format';

interface EditableVariant {
  id?: number;
  weight_label: string;
  enabled: boolean;
  selling_price: number;
  mrp: number;
  stock_qty: number;
  low_stock_threshold: number;
  purchase_cost: number;
  packaging_cost: number;
  sticker_cost: number;
  other_expenses: number;
}

export const AdminInventoryTab: React.FC<{ onDataChanged: () => void }> = ({ onDataChanged }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  // Modal Form state
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [shortDesc, setShortDesc] = useState('');
  const [detailedDesc, setDetailedDesc] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [savingModal, setSavingModal] = useState(false);

  // Inline quick edits keyed by variant.id
  const [inlineDrafts, setInlineDrafts] = useState<Record<number, ProductVariant>>({});
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      if (!prodRes.ok) throw new Error(prodData.error || 'Failed to load products');
      setProducts(prodData.products || []);
      setCategories(catData.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setCreatingNew(true);
    setName('');
    setCategoryId(categories[0]?.id || 1);
    setShortDesc('');
    setDetailedDesc('');
    setImageUrl('/src/assets/images/prod_dry_fruit_mix_1794845329180.jpg');
    setIsFeatured(false);
    setIsNewArrival(true);
    setIsBestSeller(false);
    setIsActive(true);
    setVariants(
      ['100g', '250g', '500g', '1kg'].map((w) => ({
        weight_label: w,
        enabled: true,
        selling_price: 0,
        mrp: 0,
        stock_qty: 0,
        low_stock_threshold: 5,
        purchase_cost: 0,
        packaging_cost: 0,
        sticker_cost: 0,
        other_expenses: 0,
      }))
    );
  };

  const openEditModal = (product: Product) => {
    setCreatingNew(false);
    setEditingProduct(product);
    setName(product.name);
    setCategoryId(product.category_id);
    setShortDesc(product.short_description);
    setDetailedDesc(product.detailed_description);
    setImageUrl(product.image_url);
    setIsFeatured(Boolean(product.is_featured));
    setIsNewArrival(Boolean(product.is_new_arrival));
    setIsBestSeller(Boolean(product.is_best_seller));
    setIsActive(Boolean(product.is_active));
    setVariants(
      (product.variants || []).map((v) => ({
        id: v.id,
        weight_label: v.weight_label,
        enabled: Boolean(v.enabled),
        selling_price: Number(v.selling_price || 0),
        mrp: Number(v.mrp || 0),
        stock_qty: Number(v.stock_qty || 0),
        low_stock_threshold: Number(v.low_stock_threshold ?? 5),
        purchase_cost: Number(v.purchase_cost || 0),
        packaging_cost: Number(v.packaging_cost || 0),
        sticker_cost: Number(v.sticker_cost || 0),
        other_expenses: Number(v.other_expenses || 0),
      }))
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result, prefix: 'product' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setImageUrl(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Image upload failed');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingModal(true);
    setError(null);
    try {
      const payload = {
        name,
        category_id: categoryId,
        short_description: shortDesc,
        detailed_description: detailedDesc,
        image_url: imageUrl,
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_best_seller: isBestSeller,
        is_active: isActive,
        variants,
      };
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product.');
      setEditingProduct(null);
      setCreatingNew(false);
      setMessage('Product saved successfully.');
      setTimeout(() => setMessage(null), 2500);
      await loadData();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    } finally {
      setSavingModal(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete product.');
      setMessage(`Deleted ${product.name}`);
      setTimeout(() => setMessage(null), 2500);
      await loadData();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const getDraft = (v: ProductVariant): ProductVariant => inlineDrafts[v.id] || v;

  const setDraftField = (v: ProductVariant, field: keyof ProductVariant, value: number | boolean) => {
    const current = getDraft(v);
    setInlineDrafts((prev) => ({
      ...prev,
      [v.id]: { ...current, [field]: value },
    }));
  };

  const saveInlineVariant = async (v: ProductVariant) => {
    const draft = getDraft(v);
    setSavingVariantId(v.id);
    try {
      const res = await fetch(`/api/admin/variants/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update pack.');
      setInlineDrafts((prev) => {
        const next = { ...prev };
        delete next[v.id];
        return next;
      });
      setMessage(`Updated ${v.weight_label} pricing & stock.`);
      setTimeout(() => setMessage(null), 2000);
      await loadData();
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSavingVariantId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#E6DFD1] bg-white p-4 sm:p-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Products, Inventory &amp; Profit Calculator
          </h2>
          <p className="text-xs text-[#5A655D]">
            Product Cost = Purchase + Packaging + Sticker + Other Expenses. Gross Profit = Selling Price − Product Cost.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143325] cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-[#1B4332]/25 bg-[#EDF5F0] px-4 py-3 text-xs font-semibold text-[#1B4332]">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E6DFD1] bg-white p-8 text-center text-sm text-[#5A655D]">
          Loading inventory...
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="rounded-2xl border border-[#E6DFD1] bg-white p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-xl object-cover bg-[#F3EFE6] border border-[#E6DFD1] shrink-0"
                  />
                  <div>
                    <p className="text-xs text-[#5A655D]">
                      {product.category_name} · {product.is_active ? 'Visible in Shop' : 'Hidden'}
                    </p>
                    <h3 className="text-base font-semibold text-[#1C241E]">{product.name}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(product)}
                    className="min-h-[38px] rounded-lg border border-[#D8D0C0] px-3.5 py-1.5 text-xs font-semibold text-[#1C241E] hover:bg-[#F3EFE6] cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product)}
                    className="min-h-[38px] rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Variants Cost & Price Table / Mobile Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {(product.variants || []).map((v) => {
                  const d = getDraft(v);
                  const unitCost =
                    Number(d.purchase_cost || 0) +
                    Number(d.packaging_cost || 0) +
                    Number(d.sticker_cost || 0) +
                    Number(d.other_expenses || 0);
                  const grossProfit = Number(d.selling_price || 0) - unitCost;
                  const marginPct =
                    Number(d.selling_price || 0) > 0
                      ? ((grossProfit / Number(d.selling_price)) * 100).toFixed(1)
                      : '0.0';
                  const hasChanges = Boolean(inlineDrafts[v.id]);

                  return (
                    <div
                      key={v.id}
                      className="rounded-xl border border-[#E6DFD1] bg-[#FAF8F5] p-3.5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1C241E]">{v.weight_label}</span>
                          <label className="inline-flex items-center gap-1 text-xs text-[#5A655D] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(d.enabled)}
                              onChange={(e) => setDraftField(v, 'enabled', e.target.checked ? 1 : 0)}
                              className="accent-[#1B4332]"
                            />
                            Enabled
                          </label>
                        </div>
                        <button
                          type="button"
                          disabled={savingVariantId === v.id}
                          onClick={() => saveInlineVariant(v)}
                          className={`min-h-[34px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                            hasChanges
                              ? 'bg-[#1B4332] text-white'
                              : 'border border-[#D8D0C0] bg-white text-[#1C241E] hover:bg-[#F3EFE6]'
                          }`}
                        >
                          {savingVariantId === v.id ? 'Saving...' : hasChanges ? 'Save Changes' : 'Save'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] text-[#5A655D] mb-0.5">Purchase ₹</label>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={d.purchase_cost ?? 0}
                            onChange={(e) => setDraftField(v, 'purchase_cost', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#D8D0C0] bg-white px-2 py-1.5 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#5A655D] mb-0.5">Packing ₹</label>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={d.packaging_cost ?? 0}
                            onChange={(e) => setDraftField(v, 'packaging_cost', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#D8D0C0] bg-white px-2 py-1.5 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#5A655D] mb-0.5">Sticker ₹</label>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={d.sticker_cost ?? 0}
                            onChange={(e) => setDraftField(v, 'sticker_cost', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#D8D0C0] bg-white px-2 py-1.5 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#5A655D] mb-0.5">Other ₹</label>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={d.other_expenses ?? 0}
                            onChange={(e) => setDraftField(v, 'other_expenses', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#D8D0C0] bg-white px-2 py-1.5 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#1C241E] mb-0.5">
                            Price ₹
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={d.selling_price ?? 0}
                            onChange={(e) => setDraftField(v, 'selling_price', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#1B4332]/40 bg-white px-2 py-1.5 font-semibold tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#5A655D] mb-0.5">MRP ₹</label>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={d.mrp ?? 0}
                            onChange={(e) => setDraftField(v, 'mrp', Number(e.target.value))}
                            className="w-full rounded-lg border border-[#D8D0C0] bg-white px-2 py-1.5 tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <label className="text-[#5A655D]">Stock:</label>
                          <input
                            type="number"
                            min={0}
                            value={d.stock_qty ?? 0}
                            onChange={(e) => setDraftField(v, 'stock_qty', Number(e.target.value))}
                            className="w-20 rounded-lg border border-[#D8D0C0] bg-white px-2 py-1 text-xs font-semibold tabular-nums"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 tabular-nums text-xs">
                          <span className="text-[#5A655D]">Cost: {formatINR(unitCost)}</span>
                          <span className={grossProfit >= 0 ? 'font-semibold text-[#1B4332]' : 'font-semibold text-red-700'}>
                            Profit: {formatINR(grossProfit)} ({marginPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Product Modal */}
      {(creatingNew || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProduct}
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#EFE9DC] pb-3">
              <h3 className="font-display text-xl font-semibold text-[#1C241E]">
                {editingProduct ? `Edit: ${editingProduct.name}` : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(false);
                  setEditingProduct(null);
                }}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg hover:bg-[#F3EFE6] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] bg-white px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Product Image URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 text-xs"
                  />
                  <label className="min-h-[42px] shrink-0 inline-flex items-center gap-1 rounded-xl border border-[#D8D0C0] bg-[#FAF8F5] px-3 text-xs font-semibold cursor-pointer hover:bg-[#EFE9DC]">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Short Description</label>
                <input
                  type="text"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  value={detailedDesc}
                  onChange={(e) => setDetailedDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#D8D0C0] px-3 py-2"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  Active in Shop
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                  Featured
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
                  Best Seller
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
                  New Arrival
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#EFE9DC]">
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(false);
                  setEditingProduct(null);
                }}
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingModal}
                className="min-h-[42px] rounded-xl bg-[#1B4332] px-5 py-2 text-xs font-semibold text-white hover:bg-[#143325] cursor-pointer"
              >
                {savingModal ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
