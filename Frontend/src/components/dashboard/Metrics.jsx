/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getDashboard, getOrders } from "../../https";
import { rupees } from "../../utils";
import { BillCell, Empty, OrderRow, Panel, Stat } from "../home/Widgets";

// Today vs yesterday in words and an arrow, so it does not rely on colour alone.
const change = (now, before) => {
  if (!before) return "Nothing yesterday to compare";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs yesterday`;
};
const dayLabel = (key, short) => new Date(`${key}T00:00`).toLocaleDateString("en-IN", short ? { weekday: "narrow" } : { weekday: "short", day: "numeric", month: "short" });

// Label, a bar sized against the biggest row, and the figure. Used for dishes, order types and payment types.
const Bars = ({ rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.size));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="font-semibold tabular-nums shrink-0">{r.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-[var(--main-bg)]" aria-hidden="true">
            <div className="h-2 rounded-full bg-[#F6b100]" style={{ width: `${(r.size / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const SalesChart = ({ trend }) => {
  const max = Math.max(1, ...trend.map((x) => x.totalPaise));
  const total = trend.reduce((s, x) => s + x.totalPaise, 0);
  const best = trend.reduce((a, b) => (b.totalPaise > a.totalPaise ? b : a), trend[0]);
  return (
    <>
      <p className="text-sm text-[var(--muted)] -mt-1 mb-3">
        {rupees(total)} in 14 days{best.totalPaise > 0 && <> · best day {dayLabel(best.key)} ({rupees(best.totalPaise)})</>}
      </p>
      <div className="relative">
        <span className="absolute right-0 -top-1 text-[10px] text-[var(--muted)]">{rupees(max)}</span>
        <div className="flex items-end gap-1 sm:gap-1.5 h-44 border-b border-[var(--border-color)] pt-3" role="img" aria-label={`Daily sales for the last 14 days. Today ${rupees(trend.at(-1).totalPaise)}.`}>
          {trend.map((x, i) => (
            <div key={x.key} className="flex-1 h-full flex items-end" title={`${dayLabel(x.key)}: ${rupees(x.totalPaise)}, ${x.orders} orders`}>
              <div
                className={`w-full rounded-t ${i === trend.length - 1 ? "bg-[#F6b100]" : "bg-[#F6b100]/40"}`}
                style={{ height: `${(x.totalPaise / max) * 100}%`, minHeight: x.totalPaise ? 3 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1 sm:gap-1.5 mt-1" aria-hidden="true">
          {trend.map((x, i) => (
            <span key={x.key} className={`flex-1 text-center text-[10px] leading-tight ${i === trend.length - 1 ? "font-bold" : "text-[var(--muted)]"}`}>
              {dayLabel(x.key, true)}
              <br />
              {x.key.slice(8)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

const Metrics = () => {
  // Realtime order/table/kitchen events invalidate ["dashboard"]; the minute poll is a fallback.
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60000 });
  const { data: ordersRes } = useQuery({ queryKey: ["orders"], queryFn: getOrders, placeholderData: keepPreviousData });
  const d = data?.data?.data;
  if (isLoading) return <p className="text-[var(--text-color)]">Loading…</p>;
  if (error) return <p className="text-red-500">{error.response?.data?.message || "Could not load the sales numbers"}</p>;

  const t = d.totals;
  const y = d.yesterday;
  const recent = (ordersRes?.data?.data || [])
    .filter((o) => o.acceptance !== "Pending")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sales today" value={rupees(t.totalPaise)} note={change(t.totalPaise, y.totalPaise)} />
        <Stat label="Paid orders" value={t.orders} note={change(t.orders, y.orders)} />
        <Stat label="Average bill" value={rupees(t.averagePaise)} note={change(t.averagePaise, y.averagePaise)} />
        <Stat label="Open orders" value={d.openOrders} note={d.pendingGuest ? `${d.pendingGuest} guest orders to accept` : "Not paid yet"} to="/orders" />
      </div>
      <p className="text-xs text-[var(--muted)]">Sales count paid orders only, for {dayLabel(d.today)}.</p>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Sales, last 14 days" className="lg:col-span-2">
          <SalesChart trend={d.trend} />
        </Panel>
        <Panel title="Top dishes today">
          {d.topItems.length === 0 ? <Empty>No dishes sold yet today.</Empty> : (
            <Bars rows={d.topItems.map((i) => ({ label: i.key, size: i.revenuePaise, value: `${i.quantity} sold · ${rupees(i.revenuePaise)}` }))} />
          )}
        </Panel>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Panel title="How it was ordered">
          {d.byType.length === 0 ? <Empty>Nothing paid yet today.</Empty> : (
            <Bars rows={d.byType.map((x) => ({ label: x.key, size: x.totalPaise, value: `${x.orders} · ${rupees(x.totalPaise)}` }))} />
          )}
          {d.qrOrders > 0 && <p className="mt-3 text-xs text-[var(--muted)]">{d.qrOrders} of these were ordered by guests from the table QR.</p>}
        </Panel>
        <Panel title="How people paid">
          {d.byMethod.length === 0 ? <Empty>No payments yet today.</Empty> : <Bars rows={d.byMethod.map((m) => ({ label: m.key, size: m.paidPaise, value: rupees(m.paidPaise) }))} />}
        </Panel>
        <Panel title="Right now">
          <ul className="text-sm">
            {[
              ["Tables busy", d.tables.Booked || 0],
              ["Tables free", d.tables.Available || 0],
              ["Reserved", d.tables.Reserved || 0],
              ["Kitchen: new tickets", d.kitchen.New || 0],
              ["Kitchen: cooking", d.kitchen.Preparing || 0],
              ["Kitchen: ready to serve", d.kitchen.Ready || 0],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between py-1.5 border-b border-[var(--border-color)] last:border-0">
                <span>{k}</span>
                <span className="font-semibold tabular-nums">{v}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent orders" to="/orders">
        {recent.length === 0 ? <Empty>No orders yet.</Empty> : (
          <ul>
            {recent.map((o) => (
              <OrderRow
                key={o._id}
                order={o}
                right={<BillCell order={o} />}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default Metrics;
