/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { STATUS } from "../orders/OrderCard";
import { getAvatarName } from "../../utils";

export const card = "rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)]";

// "Hello, name" with the time, and one line saying what this screen is for.
export const Greeting = ({ name, hint }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-end justify-between gap-4 pt-5 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold">{name ? `Hello, ${name}` : "Welcome to RestOS"}</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">{hint}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xl md:text-2xl font-bold tabular-nums">
          {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
        </p>
        <p className="text-xs text-[var(--muted)]">{now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
      </div>
    </div>
  );
};

// One number with a label. A link when there is a page to act on it.
export const Stat = ({ label, value, note, to, alert }) => {
  const cls = `block p-4 ${card} ${alert ? "border-red-500" : ""} ${to ? "hover:border-[#F6b100] transition-colors" : ""}`;
  const body = (
    <>
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      <p className={`mt-1 text-2xl md:text-3xl font-bold tabular-nums ${alert ? "text-red-600" : ""}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-[var(--muted)]">{note}</p>}
    </>
  );
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
};

export const Panel = ({ title, to, linkText = "View all", children, className = "" }) => (
  <section className={`p-4 ${card} ${className}`}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <h2 className="font-semibold">{title}</h2>
      {to && <Link to={to} className="text-sm font-medium underline underline-offset-2 shrink-0">{linkText}</Link>}
    </div>
    {children}
  </section>
);

export const Empty = ({ children }) => <p className="text-sm text-[var(--muted)] py-3">{children}</p>;

const where = (o) => (o.table ? `Table ${o.table.tableNo}` : `${o.type || "Takeaway"} #${String(o.orderNo || "").split("-").pop()}`);

export const StatusPill = ({ status }) => {
  const [text, cls] = STATUS[status] || [status, "bg-gray-200 text-gray-700"];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
};

// One order on a line: where, who, how many items, status, and an optional action on the right.
export const OrderRow = ({ order, right }) => (
  <li className="flex items-center gap-3 py-2.5 border-b border-[var(--border-color)] last:border-0">
    <span aria-hidden="true" className="hidden sm:flex h-9 w-9 shrink-0 rounded-full bg-[#F6b100]/20 items-center justify-center text-xs font-bold">
      {getAvatarName(order.customerDetails?.name || "Guest").slice(0, 2)}
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-semibold truncate">{where(order)}</p>
      <p className="text-xs text-[var(--muted)] truncate">
        {order.customerDetails?.name || "Guest"} · {order.items.length} {order.items.length === 1 ? "item" : "items"}
      </p>
    </div>
    {right ?? <StatusPill status={order.orderStatus} />}
  </li>
);

// Bill amount and whether it is settled; a cancelled order is neither paid nor owed.
export const BillCell = ({ order, hideAmountOnPhone }) => {
  const [text, cls] = order.orderStatus === "Cancelled" ? ["Cancelled", "text-red-600"] : order.paymentStatus === "Paid" ? ["Paid", "text-green-600"] : ["Not paid", "text-[var(--muted)]"];
  return (
    <span className="flex items-center gap-3 shrink-0 text-sm">
      <span className={`tabular-nums ${hideAmountOnPhone ? "hidden sm:inline" : ""}`}>₹{Math.round((order.bills?.totalPaise || 0) / 100).toLocaleString("en-IN")}</span>
      <span className={`w-16 text-right text-xs font-semibold ${cls}`}>{text}</span>
    </span>
  );
};

// Big labelled buttons to the pages this person can open.
export const QuickLinks = ({ items }) => (
  <div className="grid grid-cols-2 gap-2">
    {items.map(({ to, label, hint, icon: Icon }) => (
      <Link key={to} to={to} className={`p-3 flex items-start gap-3 ${card} hover:border-[#F6b100] transition-colors`}>
        <Icon size={20} className="text-[#F6b100] shrink-0 mt-0.5" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-semibold text-sm">{label}</span>
          <span className="block text-xs text-[var(--muted)]">{hint}</span>
        </span>
      </Link>
    ))}
  </div>
);
