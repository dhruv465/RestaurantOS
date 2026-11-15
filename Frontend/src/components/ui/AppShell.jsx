/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Lock, Menu as MenuIcon, MonitorSmartphone, Moon, Plus, Sun, UserRoundCog, Utensils, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getOrders, getSettings, getTableRequests, logout } from "../../https";
import { removeUser } from "../../redux/slices/userSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { can, getAvatarName } from "../../utils";
import { mobilePicks, navFor } from "./nav";
import NewOrderModal from "./NewOrderModal";
import SwitchUserModal from "./SwitchUserModal";

const WIDE = "(min-width: 1024px)";
// One layout in the DOM at a time (sidebar or phone bars), so every button and label exists once.
const useWide = () => {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const m = window.matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
};

// Floor staff get the alerts bell; the kitchen has its own screen and riders take no tables.
const isFloor = (user) => can(user, "orders.manage") && user.role !== "Chef";

// What the floor should act on now: guest calls, QR/kiosk orders to accept, food ready to serve.
const useAlerts = (user) => {
  const on = isFloor(user);
  const { data: o } = useQuery({ queryKey: ["orders"], queryFn: getOrders, enabled: on });
  const { data: r } = useQuery({ queryKey: ["tableRequests"], queryFn: getTableRequests, enabled: on });
  const orders = o?.data?.data || [];
  const where = (x) => (x.table?.tableNo ? `Table ${x.table.tableNo}` : `${x.type || "Order"} ${x.orderNo || ""}`.trim());
  return [
    ...(r?.data?.data || []).map((q) => ({ key: q._id, text: `Table ${q.tableNo} ${q.type === "bill" ? "wants the bill" : "is calling a server"}` })),
    ...orders
      .filter((x) => x.acceptance === "Pending" && x.orderStatus !== "Cancelled")
      .map((x) => ({ key: x._id, text: `${x.channel === "Kiosk" ? "The kiosk" : where(x)} sent an order. Accept it on Orders.` })),
    ...orders.filter((x) => x.orderStatus === "Ready").map((x) => ({ key: `${x._id}-ready`, text: `${where(x)}: food is ready to serve` })),
  ];
};

const Alerts = ({ alerts, wide }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  const label = alerts.length ? `Alerts: ${alerts.length} need attention` : "Alerts: nothing needs attention";

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={label}
        title={label}
        aria-expanded={open}
        className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-lg text-[var(--text-color)] hover:bg-[var(--card-bg)]"
      >
        <Bell size={20} aria-hidden="true" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold leading-[18px] text-center">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close alerts" title="Close alerts" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Alerts"
            className={`fixed z-50 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl p-4 text-[var(--text-color)] ${
              wide ? "left-[268px] top-3 w-80" : "left-4 right-4 top-16"
            }`}
          >
            <p className="font-semibold mb-2">Needs attention</p>
            {alerts.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">All clear. New guest calls and ready food show up here.</p>
            ) : (
              <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
                {alerts.map((a) => (
                  <li key={a.key} className="text-sm py-1.5 border-b border-[var(--border-color)] last:border-0">{a.text}</li>
                ))}
              </ul>
            )}
            <Link to="/orders" className="mt-3 block text-center rounded-lg bg-[#F6b100] text-white font-semibold py-2">
              Open Orders
            </Link>
          </div>
        </>
      )}
    </>
  );
};

const Brand = ({ name }) => (
  <Link to="/" className="flex items-center gap-2 min-w-0" title="Go to Home">
    <span className="h-9 w-9 shrink-0 rounded-lg bg-[#F6b100] text-white flex items-center justify-center" aria-hidden="true">
      <Utensils size={18} />
    </span>
    <span className="min-w-0">
      <span className="block font-semibold leading-tight truncate">{name}</span>
      <span className="block text-[11px] text-[var(--muted)] leading-tight">RestOS</span>
    </span>
  </Link>
);

const row = "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-color)] hover:bg-[var(--card-bg)]";

// Theme, switch user, customer display and lock: the same list in the sidebar footer and the phone "More" sheet.
const Actions = ({ user, onSwitch, onLock }) => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <>
      <button onClick={toggleTheme} className={row} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Switch to light theme" : "Switch to dark theme"}>
        {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        {dark ? "Light mode" : "Dark mode"}
      </button>
      {can(user, "payments.collect") && (
        <button onClick={() => window.open("/display", "restos-display", "popup,width=1024,height=768")} className={row} aria-label="Open customer display" title="Open the screen guests see at the counter">
          <MonitorSmartphone size={18} aria-hidden="true" /> Customer display
        </button>
      )}
      <button onClick={onSwitch} className={row} aria-label="Switch user" title="Hand this device to someone else (PIN)">
        <UserRoundCog size={18} aria-hidden="true" /> Switch user
      </button>
      <button onClick={onLock} className={row} aria-label="Lock screen" title="Lock screen">
        <Lock size={18} aria-hidden="true" /> Lock screen
      </button>
    </>
  );
};

const Person = ({ user }) => (
  <div className="flex items-center gap-3 px-3 py-2">
    <span className="h-9 w-9 shrink-0 rounded-full bg-[var(--card-bg)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold" aria-hidden="true">
      {getAvatarName(user.name)}
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold truncate">{user.name}</span>
      <span className="block text-xs text-[var(--muted)]">{user.role}</span>
    </span>
  </div>
);

const Sidebar = ({ user, items, name, alerts, canNew, newDisabled, onNew, onSwitch, onLock }) => {
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-[var(--nav-bg)] border-r border-[var(--border-color)] text-[var(--text-color)] overflow-y-auto">
      <div className="flex items-center gap-2 px-4 h-16 shrink-0">
        <div className="min-w-0 flex-1"><Brand name={name} /></div>
        {isFloor(user) && <Alerts alerts={alerts} wide />}
      </div>
      {canNew && (
        <button
          onClick={onNew}
          disabled={newDisabled}
          title={newDisabled ? "Finish this order first" : "Start a new order"}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg bg-[#F6b100] text-white font-semibold py-2.5 hover:bg-[#F6b100]/90 disabled:opacity-50"
        >
          <Plus size={18} aria-hidden="true" /> New order
        </button>
      )}
      <nav aria-label="Main" className="px-3 py-2 space-y-4">
        {groups.map((g) => (
          <div key={g || "top"}>
            {g && <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{g}</p>}
            {items.filter((i) => i.group === g).map(({ to, label, hint, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                title={hint}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    isActive ? "bg-[#F6b100]/15 font-semibold text-[var(--text-color)]" : "hover:bg-[var(--card-bg)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} aria-hidden="true" className={isActive ? "text-[#F6b100]" : "text-[var(--muted)]"} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-[var(--border-color)] p-3 space-y-0.5">
        <Person user={user} />
        <Actions user={user} onSwitch={onSwitch} onLock={onLock} />
      </div>
    </aside>
  );
};

const tab = (active) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-[#F6b100]" : "text-[var(--muted)]"}`;

const PhoneBars = ({ user, items, name, alerts, canNew, newDisabled, onNew, onSwitch, onLock }) => {
  const [more, setMore] = useState(false);
  const location = useLocation();
  useEffect(() => setMore(false), [location.pathname]);
  const picks = mobilePicks(user).slice(0, canNew ? 3 : 4);
  const slots = picks.length + (canNew ? 1 : 0) + 1;
  const link = ({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => tab(isActive)}>
      <Icon size={22} aria-hidden="true" />
      {label}
    </NavLink>
  );

  return (
    <>
      <header className="sticky top-0 z-30 h-14 px-4 flex items-center gap-2 bg-[var(--nav-bg)] border-b border-[var(--border-color)] text-[var(--text-color)]">
        <div className="min-w-0 flex-1"><Brand name={name} /></div>
        {isFloor(user) && <Alerts alerts={alerts} />}
        <button onClick={onLock} aria-label="Lock screen" title="Lock screen" className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--card-bg)]">
          <Lock size={20} aria-hidden="true" />
        </button>
      </header>

      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-30 bg-[var(--nav-bg)] border-t border-[var(--border-color)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${slots}, minmax(0, 1fr))` }}>
          {picks.slice(0, 2).map(link)}
          {canNew && (
            <button onClick={onNew} disabled={newDisabled} aria-label="New order" title={newDisabled ? "Finish this order first" : "Start a new order"} className={`${tab(false)} disabled:opacity-50`}>
              <span className="-mt-6 h-12 w-12 rounded-full bg-[#F6b100] text-white flex items-center justify-center shadow-lg ring-4 ring-[var(--nav-bg)]" aria-hidden="true">
                <Plus size={26} />
              </span>
              New order
            </button>
          )}
          {picks.slice(2).map(link)}
          <button onClick={() => setMore(true)} className={tab(more)} aria-label="More pages and options" title="More pages and options" aria-expanded={more}>
            <MenuIcon size={22} aria-hidden="true" />
            More
          </button>
        </div>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/40 cursor-default" aria-label="Close menu" title="Close menu" onClick={() => setMore(false)} />
          <div role="dialog" aria-label="More" className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-[var(--nav-bg)] text-[var(--text-color)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <Person user={user} />
              <button onClick={() => setMore(false)} aria-label="Close menu" title="Close menu" className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-[var(--card-bg)]">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 my-3">
              {items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-medium text-center border ${
                      isActive ? "border-[#F6b100] bg-[#F6b100]/15" : "border-[var(--border-color)] bg-[var(--card-bg)]"
                    }`
                  }
                >
                  <Icon size={22} aria-hidden="true" className="text-[#F6b100]" />
                  {label}
                </NavLink>
              ))}
            </div>
            <div className="border-t border-[var(--border-color)] pt-2">
              <Actions user={user} onSwitch={() => { setMore(false); onSwitch(); }} onLock={onLock} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// The frame around every staff page: sidebar on wide screens, top bar + bottom bar on phones.
// The page itself scrolls with the window; only the sidebar/sheets scroll on their own when taller than the screen.
const AppShell = ({ children }) => {
  const user = useSelector((state) => state.user);
  const wide = useWide();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [newOrder, setNewOrder] = useState(false);
  const [switching, setSwitching] = useState(false);
  const { data: settingsRes } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const alerts = useAlerts(user);

  const lock = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      // Lock: the next person signs in with their PIN on this device; nothing of this person's stays loaded.
      queryClient.clear();
      dispatch(removeCustomer());
      dispatch(removeAllItems());
      dispatch(removeUser());
      navigate("/auth");
    },
  });

  const props = {
    user,
    items: navFor(user),
    name: settingsRes?.data?.data?.restaurantName || "RestOS",
    alerts,
    canNew: can(user, "orders.manage"),
    newDisabled: location.pathname.startsWith("/menu"), // mid-order: a new one would replace this cart
    onNew: () => setNewOrder(true),
    onSwitch: () => setSwitching(true),
    onLock: () => lock.mutate(),
  };

  return (
    <div className="min-h-screen bg-[var(--main-bg)] text-[var(--text-color)]">
      {wide ? <Sidebar {...props} /> : <PhoneBars {...props} />}
      <main className={wide ? "pl-64 pb-8" : "pb-24"}>{children}</main>
      {newOrder && <NewOrderModal onClose={() => setNewOrder(false)} />}
      {switching && <SwitchUserModal onClose={() => setSwitching(false)} />}
    </div>
  );
};

export default AppShell;
