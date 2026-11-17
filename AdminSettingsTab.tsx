import React, { useEffect, useState } from 'react';
import { Download, KeyRound, Upload } from 'lucide-react';
import type { StoreSettings } from '../../types';

export const AdminSettingsTab: React.FC<{ onDataChanged: () => void }> = ({ onDataChanged }) => {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [credMessage, setCredMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setForm(data.settings);
      })
      .catch(() => setError('Failed to load store settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (field: 'logo_url' | 'upi_qr_url', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result, prefix: field === 'logo_url' ? 'logo' : 'upi-qr' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setForm({ ...form, [field]: data.url });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings.');
      setForm(data.settings);
      setMessage('Store settings saved permanently.');
      onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/auth/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          username: newUsername,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to update credentials.');
      setCurrentPassword('');
      setNewPassword('');
      setNewUsername('');
      setCredMessage(`Credentials updated for ${data.admin.username}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credential update failed.');
    }
  };

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-[#E6DFD1] bg-white p-8 text-center text-sm text-[#5A655D]">
        Loading store settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Identity & Contact */}
        <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Business Identity &amp; Official WhatsApp
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Business Name</label>
              <input
                type="text"
                required
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Official WhatsApp Number (Central Setting)
              </label>
              <input
                type="text"
                required
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 font-mono-tabular"
              />
              <p className="mt-1 text-[11px] text-[#5A655D]">
                All Shop, Product, and Order WhatsApp buttons read from this single number.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Contact Email (Optional)</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Business Logo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 text-xs"
                />
                <label className="min-h-[42px] shrink-0 inline-flex items-center gap-1 rounded-xl border border-[#D8D0C0] bg-[#FAF8F5] px-3 text-xs font-semibold cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleUpload('logo_url', e)} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Dispatch Address</label>
              <input
                type="text"
                value={form.dispatch_address}
                onChange={(e) => setForm({ ...form, dispatch_address: e.target.value })}
                placeholder="Your dispatch village/town & district"
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
          </div>
        </section>

        {/* Delivery & Shipping */}
        <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Delivery &amp; Shipping Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold mb-1">Standard Delivery Charge (₹)</label>
              <input
                type="number"
                min={0}
                value={form.delivery_charge}
                onChange={(e) => setForm({ ...form, delivery_charge: Number(e.target.value) })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Free Delivery Minimum (₹, 0 = off)</label>
              <input
                type="number"
                min={0}
                value={form.free_delivery_threshold}
                onChange={(e) => setForm({ ...form, free_delivery_threshold: Number(e.target.value) })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Estimated Delivery Time</label>
              <input
                type="text"
                value={form.estimated_delivery_time}
                onChange={(e) => setForm({ ...form, estimated_delivery_time: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold mb-1">Delivery Service Information</label>
              <input
                type="text"
                value={form.delivery_service_info}
                onChange={(e) => setForm({ ...form, delivery_service_info: e.target.value })}
                className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
              />
            </div>
          </div>
        </section>

        {/* Payment Options */}
        <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Payment Configuration
          </h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.cod_enabled)}
                onChange={(e) => setForm({ ...form, cod_enabled: e.target.checked ? 1 : 0 })}
                className="accent-[#1B4332]"
              />
              Enable Cash on Delivery (COD)
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.upi_enabled)}
                onChange={(e) => setForm({ ...form, upi_enabled: e.target.checked ? 1 : 0 })}
                className="accent-[#1B4332]"
              />
              Enable UPI Payment
            </label>
          </div>

          {Boolean(form.upi_enabled) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Your Real UPI ID</label>
                <input
                  type="text"
                  value={form.upi_id}
                  onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
                  placeholder="yourname@upi"
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">UPI Payee Name</label>
                <input
                  type="text"
                  value={form.upi_payee_name}
                  onChange={(e) => setForm({ ...form, upi_payee_name: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">UPI QR Image URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.upi_qr_url}
                    onChange={(e) => setForm({ ...form, upi_qr_url: e.target.value })}
                    className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2 text-xs"
                  />
                  <label className="min-h-[42px] shrink-0 inline-flex items-center gap-1 rounded-xl border border-[#D8D0C0] bg-[#FAF8F5] px-3 text-xs font-semibold cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    QR
                    <input type="file" accept="image/*" onChange={(e) => handleUpload('upi_qr_url', e)} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Editable Store Policies */}
        <section className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Editable Pages &amp; Store Policies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {(
              [
                ['about_us', 'About Us'],
                ['contact_info', 'Contact Us Details'],
                ['shipping_policy', 'Shipping Policy'],
                ['return_refund_policy', 'Return & Refund Policy'],
                ['privacy_policy', 'Privacy Policy'],
                ['terms_conditions', 'Terms & Conditions'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-semibold mb-1">{label}</label>
                <textarea
                  rows={3}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full rounded-xl border border-[#D8D0C0] px-3 py-2 text-xs leading-relaxed"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[46px] rounded-xl bg-[#1B4332] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#143325] cursor-pointer"
          >
            {saving ? 'Saving Settings...' : 'Save All Store Settings'}
          </button>
        </div>
      </form>

      {/* Admin Security Credentials */}
      <form
        onSubmit={handleChangeCredentials}
        className="rounded-2xl border border-[#E6DFD1] bg-white p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#1B4332]" />
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Owner Admin Login Credentials
          </h2>
        </div>
        {credMessage && (
          <p className="text-xs font-semibold text-[#1B4332]">{credMessage}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">New Username (Optional)</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">New Password (Min 8 chars)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full min-h-[42px] rounded-xl border border-[#D8D0C0] px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="min-h-[42px] rounded-xl border border-[#1B4332] px-5 py-2 text-xs font-semibold text-[#1B4332] hover:bg-[#F3EFE6] cursor-pointer"
        >
          Update Admin Credentials
        </button>
      </form>

      {/* Project Source Export ZIP */}
      <section className="rounded-2xl border border-[#E6DFD1] bg-[#F3EFE6] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-[#1C241E]">
            Complete Project Source Export (.zip)
          </h2>
          <p className="text-xs text-[#4A554D] max-w-xl">
            Download the complete LORAKU DRY FRUITS source code (React frontend, Node.js/Express backend, SQLite migrations, PWA config, Capacitor config, and README instructions), excluding runtime secrets and database files.
          </p>
        </div>
        <a
          href="/api/admin/export-project"
          download="loraku-dry-fruits-project.zip"
          className="min-h-[44px] shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#143325]"
        >
          <Download className="h-4 w-4" />
          Download Project ZIP
        </a>
      </section>
    </div>
  );
};
