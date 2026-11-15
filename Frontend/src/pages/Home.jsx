/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChefHat, Plus } from "lucide-react";
import { getAttendance, getDashboard, getIngredients, getKots, getOrders, getTableRequests, getTables } from "../https";
import { can, rupees, takenToday } from "../utils";
import { navFor } from "../components/ui/nav";
import NewOrderModal from "../components/ui/NewOrderModal";
import GuestInbox from "../components/orders/GuestInbox";
import CheckoutModal from "../components/checkout/CheckoutModal";
import Invoice from "../components/invoice/Invoice";
import { BillCell, Empty, Greeting, OrderRow, Panel, QuickLinks, Stat } from "../components/home/Widgets";
import { isLate, minutesSince } from "./Kitchen";

const isOpen = (o) => !["Completed", "Cancelled"].includes(o.orderStatus) && o.acceptance !== "Pending";
const due = (o) => Math.max(0, (o.bills?.totalPaise || 0) - (o.paidPaise || 0));
const byOldest = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const useOrders = () => {
  const { data } = useQuery({ queryKey: ["orders"], queryFn: getOrders, placeholderData: keepPreviousData });
  return data?.data?.data || [];
};
const useNow = (ms = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

const NewOrderTile = ({ onClick }) => (
  <button onClick={onClick} className="col-span-3 lg:col-span-1 rounded-xl bg-[#F6b100] text-white p-4 text-left flex items-center gap-3 hover:bg-[#F6b100]/90 transition-colors">
    <span className="h-11 w-11 shrink-0 rounded-full bg-white/25 flex items-center justify-center" aria-hidden="true">
      <Plus size={26} />
    </span>
    <span>
      <span className="block text-lg font-bold leading-tight">New order</span>
      <span className="block text-sm opacity-90">Dine-in, takeaway or delivery</span>
    </span>
  </button>
);

// ---------- Waiter: my tables, food to serve, guest calls ----------
const WaiterHome = ({ user }) => {
  const [newOrder, setNewOrder] = useState(false);
  const orders = useOrders();
  const { data: t } = useQuery({ queryKey: ["tables"], queryFn: getTables });
  const tables = t?.data?.data || [];
  const open = orders.filter(isOpen).sort(byOldest);
  const mine = open.filter((o) => String(o.createdBy?._id ?? o.createdBy ?? "") === String(user._id));
  const ready = open.filter((o) => o.orderStatus === "Ready");
  const free = tables.filter((x) => x.status === "Available").length;

  return (
    <>
      <Greeting name={user.name} hint="Your orders, food to serve and guest calls. New ones pop up as they happen." />
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {can(user, "orders.manage") && <NewOrderTile onClick={() => setNewOrder(true)} />}
        <Stat label="Your open orders" value={mine.length} to="/orders" />
        <Stat label="Food ready to serve" value={ready.length} alert={ready.length > 0} note={ready.length ? "Pick it up" : "Nothing waiting"} to="/orders" />
        <Stat label="Free tables" value={`${free} of ${tables.length}`} to="/tables" />
      </div>
      <GuestInbox orders={orders} canManage={can(user, "orders.manage")} className="mb-4" />
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Ready to serve" to="/orders">
          {ready.length === 0 ? <Empty>No food waiting. The kitchen will alert you when it is ready.</Empty> : (
            <ul>{ready.map((o) => <OrderRow key={o._id} order={o} />)}</ul>
          )}
        </Panel>
        <Panel title="Your open orders" to="/orders">
          {mine.length === 0 ? <Empty>You have no open orders. Tap New order, or pick a free table.</Empty> : (
            <ul>{mine.map((o) => <OrderRow key={o._id} order={o} />)}</ul>
          )}
        </Panel>
      </div>
      {newOrder && <NewOrderModal onClose={() => setNewOrder(false)} />}
    </>
  );
};

// ---------- Chef: what to cook, what is late ----------
const ChefHome = ({ user }) => {
  const now = useNow();
  const { data } = useQuery({ queryKey: ["kots", ""], queryFn: () => getKots({}) });
  const tickets = data?.data?.data || [];
  const count = (s) => tickets.filter((x) => x.status === s).length;
  const late = tickets.filter((x) => isLate(x, now));
  const next = tickets.filter((x) => x.status !== "Ready").sort((a, b) => b.isPriority - a.isPriority || byOldest(a, b)).slice(0, 8);
  const ticketWhere = (x) => (x.orderType === "Dine-in" || !x.orderType ? `Table ${x.tableNo ?? "?"}` : x.orderType);

  return (
    <>
      <Greeting name={user.name} hint="Tickets waiting in the kitchen. Open the kitchen screen to start cooking." />
      <Link to="/kitchen" className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-[#F6b100] text-white py-5 text-xl font-bold hover:bg-[#F6b100]/90 transition-colors">
        <ChefHat size={28} aria-hidden="true" /> Open kitchen
      </Link>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="New, not started" value={count("New")} to="/kitchen" />
        <Stat label="Cooking now" value={count("Preparing")} to="/kitchen" />
        <Stat label="Ready, waiting for pickup" value={count("Ready")} to="/kitchen" />
        <Stat label="Late" value={late.length} alert={late.length > 0} note={late.length ? "Over their cooking time" : "Nothing late"} to="/kitchen" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Cook next" to="/kitchen" linkText="Open kitchen" className="lg:col-span-2">
          {next.length === 0 ? <Empty>No tickets to cook right now.</Empty> : (
            <ul>
              {next.map((x) => (
                <li key={x._id} className="flex items-center gap-3 py-2.5 border-b border-[var(--border-color)] last:border-0">
                  <span className="font-bold w-12 shrink-0">#{x.ticketNo}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold truncate">{ticketWhere(x)}{x.isPriority ? " · Rush" : ""}</span>
                    <span className="block text-xs text-[var(--muted)] truncate">{x.items.filter((i) => i.quantity > 0).map((i) => `${i.quantity}× ${i.name}`).join(", ") || "Cancelled dishes: tap Got it on the kitchen screen"}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${isLate(x, now) ? "text-red-600" : "text-[var(--muted)]"}`}>
                    {minutesSince(x.createdAt, now)} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Also for you">
          <QuickLinks items={navFor(user).filter((n) => !["/", "/kitchen"].includes(n.to))} />
        </Panel>
      </div>
    </>
  );
};

// ---------- Cashier: bills to collect, money taken today ----------
const CashierHome = ({ user }) => {
  const orders = useOrders();
  const [checkoutId, setCheckoutId] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);
  const waiting = orders.filter((o) => isOpen(o) && o.paymentStatus !== "Paid").sort((a, b) => (b.orderStatus === "Ready") - (a.orderStatus === "Ready") || byOldest(a, b));
  const taken = takenToday(orders);
  const method = (m) => rupees(taken.byMethod[m]);

  return (
    <>
      <Greeting name={user.name} hint="Bills waiting to be paid, and the money taken today." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Waiting for payment" value={waiting.length} note={`${rupees(waiting.reduce((s, o) => s + due(o), 0))} to collect`} to="/orders" />
        <Stat label="Taken today" value={rupees(taken.total)} note="After refunds" />
        <Stat label="Cash today" value={method("Cash")} note="Should be in the drawer" />
        <Stat label="UPI and card today" value={rupees((taken.byMethod.UPI || 0) + (taken.byMethod.Card || 0) + (taken.byMethod.Online || 0))} />
      </div>
      <GuestInbox orders={orders} canManage={can(user, "orders.manage")} className="mb-4" />
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Waiting for payment" to="/orders" className="lg:col-span-2">
          {waiting.length === 0 ? <Empty>No unpaid bills. Nice.</Empty> : (
            <ul>
              {waiting.map((o) => (
                <OrderRow
                  key={o._id}
                  order={o}
                  right={
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold tabular-nums">{rupees(due(o))}</span>
                      {can(user, "payments.collect") && (
                        <button onClick={() => setCheckoutId(o._id)} className="px-3 py-1.5 rounded-lg bg-[#F6b100] text-white text-sm font-semibold">
                          Take payment
                        </button>
                      )}
                    </span>
                  }
                />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Today by payment type">
          {Object.keys(taken.byMethod).length === 0 ? <Empty>No payments yet today.</Empty> : (
            <ul className="text-sm">
              {Object.entries(taken.byMethod).map(([m, p]) => (
                <li key={m} className="flex justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                  <span>{m}</span>
                  <span className="font-semibold tabular-nums">{rupees(p)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <QuickLinks items={navFor(user).filter((n) => ["/deliveries", "/customers", "/tables"].includes(n.to))} />
          </div>
        </Panel>
      </div>
      {checkoutId && (
        <CheckoutModal
          orderId={checkoutId}
          onClose={() => setCheckoutId(null)}
          onPaid={(order) => {
            setCheckoutId(null);
            setPaidOrder(order);
          }}
        />
      )}
      {paidOrder && <Invoice orderInfo={paidOrder} setShowInvoice={() => setPaidOrder(null)} />}
    </>
  );
};

// ---------- Manager / owner: how today is going, and what needs a decision ----------
const vsYesterday = (now, before) => {
  if (!before) return "No sales yesterday to compare";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs yesterday`;
};

const ManagerHome = ({ user }) => {
  const orders = useOrders();
  const { data: dash } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60000 });
  const stockOn = can(user, "inventory.manage") || can(user, "inventory.waste");
  const { data: ing } = useQuery({ queryKey: ["ingredients"], queryFn: getIngredients, enabled: stockOn });
  const today = isoDay(new Date());
  const { data: att } = useQuery({ queryKey: ["attendance", today, today], queryFn: () => getAttendance({ from: today, to: today }), enabled: can(user, "hr.manage") });
  const { data: req } = useQuery({ queryKey: ["tableRequests"], queryFn: getTableRequests });
  const d = dash?.data?.data;
  const low = (ing?.data?.data || []).filter((i) => i.low);
  const onShift = (att?.data?.data || []).filter((a) => !a.clockOut);
  const calls = req?.data?.data || [];
  const recent = [...orders].filter((o) => o.acceptance !== "Pending").sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
  const tableCount = d ? Object.values(d.tables).reduce((s, n) => s + n, 0) : 0;

  const attention = d
    ? [
        [d.pendingGuest, "guest QR or kiosk orders to accept", "/orders"],
        [calls.length, "guest calls (server or bill)", "/orders"],
        [d.kitchen.Ready || 0, "dishes ready, waiting to be served", "/orders"],
        [(d.kitchen.New || 0) + (d.kitchen.Preparing || 0), "kitchen tickets being cooked or waiting", can(user, "kitchen.manage") ? "/kitchen" : "/orders"],
        [low.length, low.length === 1 ? "stock item running low" : "stock items running low", "/inventory"],
      ].filter(([n]) => n > 0)
    : [];

  return (
    <>
      <Greeting name={user.name} hint="How today is going, and what needs you right now." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Sales today" value={d ? rupees(d.totals.totalPaise) : "…"} note={d && vsYesterday(d.totals.totalPaise, d.yesterday.totalPaise)} to="/dashboard" />
        <Stat label="Paid orders" value={d ? d.totals.orders : "…"} note={d && `${d.openOrders} still open`} to="/orders" />
        <Stat label="Average bill" value={d ? rupees(d.totals.averagePaise) : "…"} note={d && vsYesterday(d.totals.averagePaise, d.yesterday.averagePaise)} />
        <Stat label="Tables in use" value={d ? `${d.tables.Booked || 0} of ${tableCount}` : "…"} note={d && `${d.tables.Available || 0} free`} to="/tables" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Panel title="Needs attention">
          {!d ? <Empty>Loading…</Empty> : attention.length === 0 ? <Empty>All clear. Nothing is waiting on anyone.</Empty> : (
            <ul>
              {attention.map(([n, text, to]) => (
                <li key={text}>
                  <Link to={to} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0 hover:underline">
                    <span className="min-w-[2rem] h-8 px-2 rounded-lg bg-[#F6b100]/20 font-bold flex items-center justify-center tabular-nums">{n}</span>
                    <span className="text-sm">{text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {can(user, "hr.manage") && (
          <Panel title={`On shift now (${onShift.length})`} to="/team" linkText="Staff">
            {onShift.length === 0 ? <Empty>Nobody has clocked in yet today.</Empty> : (
              <ul className="text-sm">
                {onShift.map((a) => (
                  <li key={a._id} className="flex justify-between gap-2 py-2 border-b border-[var(--border-color)] last:border-0">
                    <span className="truncate"><span className="font-semibold">{a.user?.name}</span> <span className="text-[var(--muted)]">· {a.user?.role}</span></span>
                    <span className="text-[var(--muted)] shrink-0">since {new Date(a.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {stockOn && (
          <Panel title="Stock alerts" to="/inventory" linkText="Stock">
            {low.length === 0 ? <Empty>Everything is above its low mark.</Empty> : (
              <ul className="text-sm">
                {low.slice(0, 6).map((i) => (
                  <li key={i._id} className="flex justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                    <span className="font-semibold">{i.name}</span>
                    <span className="text-red-600 font-semibold">Low</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="recent-orders lg:col-span-2">
          <Panel title="Recent orders" to="/orders">
            {recent.length === 0 ? <Empty>No orders yet today.</Empty> : (
              <ul>
                {recent.map((o) => (
                  <OrderRow
                    key={o._id}
                    order={o}
                    right={<BillCell order={o} hideAmountOnPhone />}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <Panel title="Go to">
          <QuickLinks items={navFor(user).filter((n) => n.to !== "/")} />
        </Panel>
      </div>
    </>
  );
};

// Each person lands on the screen for their job, decided by what they are allowed to do.
const Home = () => {
  const user = useSelector((state) => state.user);
  useEffect(() => {
    document.title = "RestOS | Home";
  }, []);
  const View = can(user, "dashboard.view") ? ManagerHome : can(user, "kitchen.manage") ? ChefHome : can(user, "payments.collect") ? CashierHome : WaiterHome;
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 pb-6">
      <View user={user} />
    </div>
  );
};

export default Home;
