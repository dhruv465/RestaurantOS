import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../../https";

const rupees = (paise) => `₹${((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const card = "bg-[var(--card-bg)] rounded-lg p-4 text-[var(--text-color)]";

// Today vs yesterday, as text so it does not rely on colour alone.
const Change = ({ now, before }) => {
  if (!before) return <span className="text-xs text-[#ababab]">no sales yesterday</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={`text-xs ${pct >= 0 ? "text-green-500" : "text-red-500"}`}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% vs yesterday
    </span>
  );
};

const Kpi = ({ label, value, now, before }) => (
  <div className={card}>
    <p className="text-xs text-[#ababab]">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
    {before !== undefined && <Change now={now} before={before} />}
  </div>
);

const List = ({ title, rows }) => (
  <section className={card}>
    <h3 className="font-semibold mb-2">{title}</h3>
    {rows.length === 0 && <p className="text-sm text-[#ababab]">Nothing yet today.</p>}
    <ul className="text-sm space-y-1">
      {rows.map(([k, v]) => (
        <li key={k} className="flex justify-between">
          <span>{k}</span>
          <span className="font-semibold">{v}</span>
        </li>
      ))}
    </ul>
  </section>
);

const Metrics = () => {
  // Realtime order/table/kitchen events invalidate ["dashboard"]; the minute poll is a fallback.
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60000 });
  const d = data?.data?.data;
  if (isLoading) return <p className="px-6 text-[var(--text-color)]">Loading…</p>;
  if (error) return <p className="px-6 text-red-500">{error.response?.data?.message || "Could not load the dashboard"}</p>;

  const t = d.totals;
  const y = d.yesterday;
  const max = Math.max(1, ...d.trend.map((x) => x.totalPaise));

  return (
    <div className="container mx-auto py-2 px-6 md:px-4 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-color)]">Today ({d.today})</h2>
        <p className="text-sm text-[#ababab]">Paid orders only. Updates live.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Sales" value={rupees(t.totalPaise)} now={t.totalPaise} before={y.totalPaise} />
        <Kpi label="Paid orders" value={t.orders} now={t.orders} before={y.orders} />
        <Kpi label="Average order" value={rupees(t.averagePaise)} now={t.averagePaise} before={y.averagePaise} />
        <Kpi label="Open orders" value={d.openOrders} />
      </div>

      <section className={card}>
        <h3 className="font-semibold mb-3">Sales, last 14 days</h3>
        <div className="flex items-end gap-1 h-40" role="img" aria-label={`Daily sales for 14 days. Today ${rupees(d.trend.at(-1).totalPaise)}.`}>
          {d.trend.map((x) => (
            <div key={x.key} className="flex-1 flex flex-col items-center justify-end h-full" title={`${x.key}: ${rupees(x.totalPaise)}, ${x.orders} orders`}>
              <div className="w-full rounded-t bg-[#F6b100]" style={{ height: `${(x.totalPaise / max) * 100}%`, minHeight: x.totalPaise ? 2 : 0 }} />
              <span className="text-[10px] text-[#ababab] mt-1">{x.key.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <List
          title="Floor"
          rows={[
            ["Tables busy", d.tables.Booked || 0],
            ["Tables free", d.tables.Available || 0],
            ["Reserved", d.tables.Reserved || 0],
            ["Being cleaned", d.tables.Cleaning || 0],
            ["Guest QR orders waiting", d.pendingGuest],
          ]}
        />
        <List title="Kitchen tickets" rows={[["New", d.kitchen.New || 0], ["Preparing", d.kitchen.Preparing || 0], ["Ready to serve", d.kitchen.Ready || 0]]} />
        <List title="Top items today" rows={d.topItems.map((i) => [i.key, `${i.quantity} · ${rupees(i.revenuePaise)}`])} />
        <List
          title="How it was ordered and paid"
          rows={[
            ...d.byType.map((x) => [x.key, `${x.orders} · ${rupees(x.totalPaise)}`]),
            ["Table QR", d.qrOrders],
            ...d.byMethod.map((m) => [`Paid by ${m.key}`, rupees(m.paidPaise)]),
          ]}
        />
      </div>
    </div>
  );
};

export default Metrics;
