import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getSettings, setKiosk, updateSettings } from "../../https";

const FIELDS = [
  { key: "restaurantName", label: "Restaurant name" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone" },
  { key: "gstin", label: "GSTIN" },
  { key: "upiVpa", label: "UPI ID (VPA)", placeholder: "restaurant@bank" },
  { key: "upiPayeeName", label: "UPI payee name" },
  { key: "timezone", label: "Timezone", placeholder: "Asia/Kolkata" },
  { key: "publicBaseUrl", label: "Guest menu address (what table QRs open)", placeholder: "http://192.168.1.20:5173" },
];

const inputClass =
  "w-full px-4 py-3 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)] disabled:opacity-60";

const GeneralSettings = ({ canEdit }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.data?.data) setForm(data.data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      enqueueSnackbar("Settings saved", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["price"] });
    },
    onError: (error) =>
      enqueueSnackbar(error.response?.data?.message || "Could not save settings", { variant: "error" }),
  });

  const kioskMutation = useMutation({
    mutationFn: setKiosk,
    onSuccess: (_, enabled) => {
      enqueueSnackbar(enabled ? "New kiosk link made. Old kiosk screens stop working." : "Kiosk turned off", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => enqueueSnackbar(error.response?.data?.message || "Could not change the kiosk", { variant: "error" }),
  });
  const kioskUrl = data?.data?.data?.kioskToken ? `${data.data.data.publicBaseUrl || window.location.origin}/kiosk/${data.data.data.kioskToken}` : "";

  if (isLoading || !form) return <p className="text-[var(--text-color)]">Loading settings…</p>;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(FIELDS.map(({ key }) => [key, form[key] ?? ""]));
    payload.taxRatePercent = Number(form.taxRatePercent);
    payload.taxInclusive = !!form.taxInclusive;
    payload.loyaltyEarnPer100 = Number(form.loyaltyEarnPer100) || 0;
    payload.scheduleLeadMinutes = Number(form.scheduleLeadMinutes ?? 30) || 0;
    payload.loyaltyPointPaise = Math.round(Number(form.loyaltyPointRupees ?? (form.loyaltyPointPaise || 100) / 100) * 100);
    payload.stations = String(form.stationsText ?? form.stations.join(", ")).split(",").map((s) => s.trim()).filter(Boolean);
    saveMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-lg p-6 space-y-5 max-w-3xl">
      {!canEdit && (
        <p className="text-sm text-[#ababab]">Only an Admin can change these settings.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, placeholder }) => (
          <label key={key} className="space-y-2 block">
            <span className="block text-[#ababab] text-sm font-medium">{label}</span>
            <input
              className={inputClass}
              value={form[key] ?? ""}
              placeholder={placeholder}
              disabled={!canEdit}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="space-y-2 block">
          <span className="block text-[#ababab] text-sm font-medium">GST rate (%)</span>
          <input
            type="number"
            min="0"
            max="28"
            step="0.01"
            className={inputClass}
            value={form.taxRatePercent ?? 0}
            disabled={!canEdit}
            onChange={(e) => set("taxRatePercent", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-3 mt-8 text-[var(--text-color)]">
          <input
            type="checkbox"
            checked={!!form.taxInclusive}
            disabled={!canEdit}
            onChange={(e) => set("taxInclusive", e.target.checked)}
          />
          Menu prices already include GST
        </label>
        <label className="space-y-2 block">
          <span className="block text-[#ababab] text-sm font-medium">Loyalty points earned per ₹100 (0 = off)</span>
          <input
            type="number"
            min="0"
            max="100"
            className={inputClass}
            value={form.loyaltyEarnPer100 ?? 0}
            disabled={!canEdit}
            onChange={(e) => set("loyaltyEarnPer100", e.target.value)}
          />
        </label>
        <label className="space-y-2 block">
          <span className="block text-[#ababab] text-sm font-medium">One point is worth (₹)</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={inputClass}
            value={form.loyaltyPointRupees ?? (form.loyaltyPointPaise || 100) / 100}
            disabled={!canEdit}
            onChange={(e) => set("loyaltyPointRupees", e.target.value)}
          />
        </label>
        <label className="space-y-2 block">
          <span className="block text-[#ababab] text-sm font-medium">Send scheduled orders to the kitchen (minutes before)</span>
          <input type="number" min="0" max="240" className={inputClass} value={form.scheduleLeadMinutes ?? 30} disabled={!canEdit} onChange={(e) => set("scheduleLeadMinutes", e.target.value)} />
        </label>
        <label className="space-y-2 block md:col-span-2">
          <span className="block text-[#ababab] text-sm font-medium">
            Kitchen stations (comma separated; the first one gets items with no station)
          </span>
          <input
            className={inputClass}
            value={form.stationsText ?? (form.stations || []).join(", ")}
            placeholder="Kitchen, Tandoor, Bar"
            disabled={!canEdit}
            onChange={(e) => set("stationsText", e.target.value)}
          />
        </label>
      </div>
      {canEdit && (
        <div className="space-y-2 border-t border-[var(--border-color)] pt-4">
          <span className="block text-[#ababab] text-sm font-medium">Self-order kiosk</span>
          {kioskUrl ? (
            <p className="text-sm text-[var(--text-color)] break-all">
              Open this on the counter screen: <a className="underline" href={kioskUrl} target="_blank" rel="noreferrer">{kioskUrl}</a>
            </p>
          ) : (
            <p className="text-sm text-[#ababab]">Off. Turn it on to get a link for a screen at the counter. Kiosk orders wait in the Orders inbox until the guest pays.</p>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={kioskMutation.isPending} onClick={() => kioskMutation.mutate(true)} className="px-4 py-2 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-sm">
              {kioskUrl ? "Make a new link" : "Turn on"}
            </button>
            {kioskUrl && (
              <button type="button" disabled={kioskMutation.isPending} onClick={() => kioskMutation.mutate(false)} className="px-4 py-2 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-sm">
                Turn off
              </button>
            )}
          </div>
        </div>
      )}
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-[#F6b100] text-white rounded-lg px-6 py-3 hover:bg-[#F6b100]/90 transition-colors disabled:opacity-60"
          >
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      )}
    </form>
  );
};

export default GeneralSettings;
