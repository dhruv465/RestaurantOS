import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import BackButton from "../components/ui/BackButton";
import { getSalesReport } from "../https";

const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Local calendar date (not UTC) for the date inputs.
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86400000));
const PRESETS = [
  ["Today", 0],
  ["7 days", 6],
  ["30 days", 29],
];

const inputClass = "px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)]";

const csvCell = (v) => {
  const s = String(v ?? "");
  // Leading = + - @ would run as a formula in Excel/Sheets.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const downloadCsv = (name, header, lines) => {
  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
};

const Card = ({ label, value }) => (
  <div className="bg-[var(--card-bg)] rounded-lg p-4">
    <p className="text-xs text-[#ababab]">{label}</p>
    <p className="text-xl font-bold text-[var(--text-color)]">{value}</p>
  </div>
);

// Horizontal bars: readable on a phone, no chart library needed.
const Bars = ({ title, rows, valueKey, label = (r) => r.key, format = rupees, extra }) => {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  return (
    <section className="bg-[var(--card-bg)] rounded-lg p-4">
      <h2 className="font-semibold text-[var(--text-color)] mb-3">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-[#ababab]">Nothing in this period.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="text-sm text-[var(--text-color)]">
            <div className="flex justify-between gap-2">
              <span className="truncate">{label(r)}</span>
              <span className="whitespace-nowrap">
                {format(r[valueKey])}
                {extra && <span className="text-[#ababab]"> · {extra(r)}</span>}
              </span>
            </div>
            <div className="h-2 rounded bg-[var(--nav-bg)] mt-1">
              <div className="h-2 rounded bg-[#F6b100]" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

const Reports = () => {
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    document.title = "RestOS | Reports";
  }, []);

  const { data, error, isFetching } = useQuery({
    queryKey: ["salesReport", from, to],
    queryFn: () => getSalesReport({ from, to }),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const r = data?.data?.data;
  const t = r?.totals;

  return (
    <div className="bg-[var(--main-bg)] px-4 md:px-6 pb-8 text-[var(--text-color)]">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-lg sm:text-xl md:text-2xl tracking-wider font-bold">Sales report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map(([label, n]) => (
            <button
              key={label}
              onClick={() => {
                setFrom(daysAgo(n));
                setTo(daysAgo(0));
              }}
              className="px-3 py-1.5 rounded-full text-sm bg-[var(--card-bg)]"
            >
              {label}
            </button>
          ))}
          <input aria-label="From" type="date" className={inputClass} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <input aria-label="To" type="date" className={inputClass} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-red-500 mb-3">{error.response?.data?.message || "Could not load the report"}</p>}
      {!r ? (
        <p>Loading…</p>
      ) : (
        <div className={`space-y-4 ${isFetching ? "opacity-70" : ""}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Paid orders" value={t.orders} />
            <Card label="Sales (incl. tax & tips)" value={rupees(t.totalPaise)} />
            <Card label="After refunds" value={rupees(t.netPaise)} />
            <Card label="Average order" value={rupees(t.averagePaise)} />
            <Card label="Discounts given" value={rupees(t.discountPaise)} />
            <Card label="Tax collected" value={rupees(t.taxPaise)} />
            <Card label="Tips" value={rupees(t.tipPaise)} />
            <Card label="Cancelled orders" value={t.cancelled} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                downloadCsv(`sales-by-day-${from}-to-${to}.csv`, ["Date", "Paid orders", "Sales (₹)", "Refunds (₹)"], r.byDay.map((d) => [d.key, d.orders, (d.totalPaise / 100).toFixed(2), (d.refundsPaise / 100).toFixed(2)]))
              }
              className="px-4 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-semibold"
            >
              Download days (CSV)
            </button>
            <button
              onClick={() =>
                downloadCsv(`items-${from}-to-${to}.csv`, ["Item", "Quantity", "Revenue before tax (₹)"], r.byItem.map((i) => [i.key, i.quantity, (i.revenuePaise / 100).toFixed(2)]))
              }
              className="px-4 py-2 rounded-lg bg-[var(--card-bg)] text-sm font-semibold"
            >
              Download items (CSV)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Bars title="Sales by day" rows={r.byDay} valueKey="totalPaise" extra={(d) => `${d.orders} orders`} />
            <Bars title="Top items (before tax)" rows={r.byItem.slice(0, 15)} valueKey="revenuePaise" extra={(i) => `${i.quantity} sold`} />
            <Bars
              title="Payments by method"
              rows={r.byMethod}
              valueKey="paidPaise"
              extra={(m) => (m.refundedPaise ? `${rupees(m.refundedPaise)} refunded` : "no refunds")}
            />
            <Bars title="Busiest hours" rows={r.byHour} valueKey="totalPaise" label={(h) => `${String(h.key).padStart(2, "0")}:00`} extra={(h) => `${h.orders} orders`} />
            <Bars title="By order type" rows={r.byType} valueKey="totalPaise" extra={(x) => `${x.orders} orders`} />
            <Bars title="By staff (who took the order)" rows={r.byStaff} valueKey="totalPaise" extra={(x) => `${x.orders} orders`} />
            <Bars title="Discount reasons" rows={r.discountReasons} valueKey="discountPaise" extra={(x) => `${x.count}×`} />
            <Bars title="Cancel reasons" rows={r.cancelReasons} valueKey="count" format={(n) => `${n}×`} />
          </div>
          <p className="text-xs text-[#ababab]">Days and hours are in {r.timezone}. Only fully paid orders count as sales.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
