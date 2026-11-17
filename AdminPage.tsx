import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { AdminInventoryTab } from '../components/admin/AdminInventoryTab';
import { AdminOrdersTab } from '../components/admin/AdminOrdersTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { useStore } from '../context/StoreContext';
import type { Category, DashboardKPIs, Expense, Order } from '../types';
import { formatDateTime, formatINR } from '../utils/format';

type AdminTab = 'dashboard' | 'orders' | 'inventory' | 'categories' | 'expenses' | 'settings';

export const AdminPage: React.FC = () => {
  const { refreshStore } = useStore();
  const [authState, setAuthState] = useState<{
    loading: boolean;
    needsSetup: boolean;
    authenticated: boolean;
    admin: { id: number; username: string; display_name: string } | null;
  }>({ loading: true, needsSetup: false, authenticated: false, admin: null });

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('Store Owner');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [lowStock, setLowStock] = useState<
    Array<{ id: number; product_name: string; weight_label: string; stock_qty: number; low_stock_threshold: number }>
  >([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Categories & Expenses
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('Packaging');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [miscError, setMiscError] = useState<string | null>(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth/status');
      const data = await res.json();
      setAuthState({
        loading: false,
        needsSetup: Boolean(data.needsSetup),
        authenticated: Boolean(data.authenticated),
        admin: data.admin || null,
      });
    } catch {
      setAuthState({ loading: false, needsSetup: false, authenticated: false, admin: null });
    }
  }, []);

  const loadDashboardAndAux = useCallback(async () => {
    try {
      const [dashRes, catRes, expRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/expenses'),
      ]);
      if (dashRes.ok) {
        const d = await dashRes.json();
        setKpis(d.kpis);
        setLowStock(d.lowStockVariants || []);
        setRecentOrders(d.recentOrders || []);
      }
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(c.categories || []);
      }
      if (expRes.ok) {
        const e = await expRes.json();
        setExpenses(e.expenses || []);
      }
    } catch {
      // handled per tab
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (authState.authenticated) {
      loadDashboardAndAux();
    }
  }, [authState.authenticated, loadDashboardAndAux]);

  const handleDataChanged = () => {
    loadDashboardAndAux();
    refreshStore();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authState.needsSetup && password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const endpoint = authState.needsSetup ? '/api/admin/auth/setup' : '/api/admin/auth/login';
      const body = authState.needsSetup
        ? { username, display_name: displayName, password }
        : { username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');
      setPassword('');
      setConfirmPassword('');
      setAuthState({
        loading: false,
        needsSetup: false,
        authenticated: true,
        admin: data.admin,
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    setAuthState((prev) => ({ ...prev, authenticated: false, admin: null }));
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setMiscError(null);
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName, description: newCatDesc, sort_order: categories.length + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMiscError(data.error || 'Could not create category');
      return;
    }
    setNewCatName('');
    setNewCatDesc('');
    handleDataChanged();
  };

  const handleDeleteCategory = async (id: number) => {
    setMiscError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setMiscError(data.error || 'Could not delete category');
      return;
    }
    handleDataChanged();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setMiscError(null);
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: expTitle,
        category: expCategory,
        amount: Number(expAmount),
        incurred_at: expDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMiscError(data.error || 'Could not add expense');
      return;
    }
    setExpTitle('');
    setExpAmount('');
    handleDataChanged();
  };

  const handleDeleteExpense = async (id: number) => {
    await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
    handleDataChanged();
  };

  if (authState.loading) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[#5A655D]">
        Checking Owner Admin session...
      </main>
    );
  }

  if (!authState.authenticated) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 pb-24">
        <form
          onSubmit={handleAuthSubmit}
          className="rounded-2xl border border-[#E6DFD1] bg-white p-6 sm:p-8 shadow-xs space-y-5"
        >
          <div className="flex items-center gap-2.5 text-[#1B4332]">
            <ShieldCheck className="h-6 w-6" />
            <h1 className="font-display text-2xl font-semibold text-[#1C241E]">
              {authState.needsSetup ? 'Create Owner Admin Account' : 'Owner Admin Login'}
            </h1>
          </div>

          <p className="text-sm text-[#5A655D]">
            {authState.needsSetup
              ? 'First-time setup: create your private Owner Admin username and strong password to manage products, orders, and store settings.'
              : 'Sign in with your Owner Admin credentials to manage LORAKU DRY FRUITS.'}
          </p>

          {authError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
              {authError}
            </div>
          )}

          <div className="space-y-3.5 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2"
              />
            </div>

            {authState.needsSetup && (
              <div>
                <label className="block text-xs font-semibold mb-1">Owner Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">
                Password {authState.needsSetup ? '(min 8 characters)' : ''}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2"
              />
            </div>

            {authState.needsSetup && (
              <div>
                <label className="block text-xs font-semibold mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full min-h-[44px] rounded-xl border border-[#D8D0C0] px-3.5 py-2"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={authSubmitting}
            className="w-full min-h-[46px] rounded-xl bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#143325] cursor-pointer"
          >
            {authSubmitting
              ? 'Please wait...'
              : authState.needsSetup
              ? 'Create Owner Account & Enter'
              : 'Log In'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DFD1] pb-4">
        <div>
          <p className="text-xs font-semibold text-[#2D6A4F]">
            Signed in as {authState.admin?.display_name} ({authState.admin?.username})
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C241E]">
            Owner Business Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[40px] self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-[#D8D0C0] bg-white px-4 py-2 text-xs font-semibold text-[#1C241E] hover:bg-[#F3EFE6] cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>

      {/* Scrollable Mobile-Friendly Admin Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['dashboard', 'Dashboard'],
            ['orders', 'Orders'],
            ['inventory', 'Products & Profit'],
            ['categories', 'Categories'],
            ['expenses', 'Expenses'],
            ['settings', 'Settings & Export'],
          ] as Array<[AdminTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              tab === key
                ? 'bg-[#1B4332] text-white'
                : 'bg-[#F3EFE6] text-[#354038] hover:bg-[#E7E0D0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'dashboard' && kpis && (
        <div className="space-y-6">
          {/* Primary Financial KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatINR(kpis.total_revenue), sub: `Product Sales: ${formatINR(kpis.total_product_sales)}` },
              { label: 'Net Profit', value: formatINR(kpis.net_profit), sub: `Gross Profit: ${formatINR(kpis.gross_profit)}` },
              { label: 'Gross Margin', value: `${kpis.gross_margin_pct}%`, sub: `Product Costs: ${formatINR(kpis.total_product_cost)}` },
              { label: "Today's Sales", value: formatINR(kpis.today_sales), sub: `Today's Orders: ${kpis.today_orders}` },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#E6DFD1] bg-white p-4 sm:p-5">
                <p className="text-xs text-[#5A655D]">{card.label}</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[#1C241E] tabular-nums">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-[#6B756D] tabular-nums">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Operational Order & Inventory KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ['Total Orders', kpis.total_orders],
              ['Pending Orders', kpis.pending_orders],
              ['Completed Orders', kpis.completed_orders],
              ['Cancelled Orders', kpis.cancelled_orders],
              ['Total Products', kpis.total_products],
              ['Low Stock Packs', kpis.low_stock_count],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-xl border border-[#E6DFD1] bg-white p-3.5">
                <p className="text-xs text-[#5A655D]">{label}</p>
                <p className="mt-1 text-lg font-bold text-[#1C241E] tabular-nums">{val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#1C241E]">
                  Low Stock Products ({lowStock.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setTab('inventory')}
                  className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                >
                  Manage Stock →
                </button>
              </div>
              {lowStock.length === 0 ? (
                <p className="text-sm text-[#5A655D]">All active pack sizes are sufficiently stocked.</p>
              ) : (
                <ul className="divide-y divide-[#EFE9DC] max-h-72 overflow-y-auto text-sm">
                  {lowStock.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-2.5">
                      <span>
                        {item.product_name}{' '}
                        <span className="text-xs text-[#5A655D]">({item.weight_label})</span>
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          item.stock_qty === 0 ? 'text-red-700' : 'text-amber-800'
                        }`}
                      >
                        {item.stock_qty} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Orders */}
            <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#1C241E]">Recent Orders</h2>
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                >
                  View All Orders →
                </button>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-[#5A655D]">
                  No orders received yet. Real customer orders will appear here automatically.
                </p>
              ) : (
                <ul className="divide-y divide-[#EFE9DC] text-sm">
                  {recentOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-mono-tabular text-xs font-semibold text-[#1B4332]">
                          {o.order_code} · {o.customer_name}
                        </p>
                        <p className="text-xs text-[#5A655D]">
                          {o.order_status} · {formatDateTime(o.created_at)}
                        </p>
                      </div>
                      <span className="font-semibold text-[#1C241E] tabular-nums">
                        {formatINR(o.total_amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'orders' && <AdminOrdersTab onDataChanged={handleDataChanged} />}
      {tab === 'inventory' && <AdminInventoryTab onDataChanged={handleDataChanged} />}

      {tab === 'categories' && (
        <div className="space-y-5">
          {miscError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900">
              {miscError}
            </div>
          )}
          <form
            onSubmit={handleAddCategory}
            className="rounded-2xl border border-[#E6DFD1] bg-white p-5 space-y-3"
          >
            <h2 className="font-display text-lg font-semibold text-[#1C241E]">Add Category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Short description"
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
              <button
                type="submit"
                className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[#E6DFD1] bg-white divide-y divide-[#EFE9DC]">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-semibold text-[#1C241E]">{cat.name}</p>
                  <p className="text-xs text-[#5A655D]">{cat.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="min-h-[36px] rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-5">
          {miscError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900">
              {miscError}
            </div>
          )}
          <form
            onSubmit={handleAddExpense}
            className="rounded-2xl border border-[#E6DFD1] bg-white p-5 space-y-3"
          >
            <h2 className="font-display text-lg font-semibold text-[#1C241E]">
              Record Business Expense
            </h2>
            <p className="text-xs text-[#5A655D]">
              Logged expenses are deducted from Gross Profit to calculate true Net Profit.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
              <input
                type="text"
                required
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="Expense title (e.g. Pouches)"
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
              <input
                type="text"
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                placeholder="Category"
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
              <input
                type="number"
                required
                min={1}
                step="1"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="Amount ₹"
                className="min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 tabular-nums"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-2.5 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[42px] shrink-0 rounded-xl bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-[#E6DFD1] bg-white divide-y divide-[#EFE9DC]">
            {expenses.length === 0 ? (
              <p className="p-6 text-sm text-[#5A655D] text-center">No extra expenses recorded yet.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#1C241E]">{exp.title}</p>
                    <p className="text-xs text-[#5A655D]">
                      {exp.category} · {exp.incurred_at}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums text-[#1C241E]">
                      {formatINR(exp.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="min-h-[36px] rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'settings' && <AdminSettingsTab onDataChanged={handleDataChanged} />}
    </main>
  );
};
