import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { BellRing, Minus, Plus, Receipt } from "lucide-react";
import { callStaff, getGuestOrders, getPublicMenu, joinTable, placeGuestOrder } from "../https";
import { assetUrl, newId } from "../utils";
import ModifierPicker from "../components/menu/ModifierPicker";

const errorText = (error, fallback) => error?.response?.data?.message || fallback;
const rupees = (paise) => `₹${(paise / 100).toFixed(2)}`;

// What a guest sees after scanning the table QR: enter the table code, browse, order, call staff.
const GuestOrder = () => {
  const { qrToken } = useParams();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [cart, setCart] = useState([]); // [{ key, item, quantity, modifiers, unitPaise, instructions }]
  const [name, setName] = useState("");
  const [picking, setPicking] = useState(null);
  const [category, setCategory] = useState("");
  const requestId = useRef(newId());

  const menuQuery = useQuery({
    queryKey: ["publicMenu", qrToken],
    queryFn: () => getPublicMenu(qrToken),
    retry: false,
  });
  const menu = menuQuery.data?.data?.data;
  // A 401 here means "not joined yet / session ended": show the code screen.
  const ordersQuery = useQuery({
    queryKey: ["guestOrders"],
    queryFn: getGuestOrders,
    retry: false,
    refetchInterval: (q) => (q.state.status === "error" ? false : 10000),
  });
  const joined = ordersQuery.isSuccess;
  const myOrders = ordersQuery.data?.data?.data?.orders || [];

  // Tell the guest when the kitchen starts or finishes their food (not on first load).
  // shortcut: polls every 10s; switch to a guest event stream if guests need it faster.
  const seen = useRef(null);
  useEffect(() => {
    if (!ordersQuery.isSuccess) return;
    const now = Object.fromEntries(myOrders.map((o) => [o._id, o.status]));
    if (seen.current) {
      for (const o of myOrders) {
        if (seen.current[o._id] === o.status) continue;
        const msg = { "Being prepared": "The kitchen is preparing your order.", Ready: "Your food is ready. It is on its way to your table." }[o.status];
        if (!msg) continue;
        enqueueSnackbar(msg, { variant: o.status === "Ready" ? "success" : "info", autoHideDuration: 8000 });
        navigator.vibrate?.(200);
      }
    }
    seen.current = now;
  }, [ordersQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = menu ? `${menu.restaurantName} | Table ${menu.tableNo}` : "Order";
  }, [menu]);

  const joinMutation = useMutation({
    mutationFn: () => joinTable({ qrToken, code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guestOrders"] }),
    onError: (e) => enqueueSnackbar(errorText(e, "Could not join the table"), { variant: "error" }),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      placeGuestOrder({
        clientRequestId: requestId.current,
        name,
        items: cart.map((l) => ({
          itemId: l.item._id,
          quantity: l.quantity,
          instructions: l.instructions,
          modifiers: l.modifiers.map(({ groupId, optionId }) => ({ groupId, optionId })),
        })),
      }),
    onSuccess: () => {
      requestId.current = newId();
      setCart([]);
      enqueueSnackbar("Order sent. Staff will confirm it shortly.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["guestOrders"] });
    },
    onError: (e) => {
      enqueueSnackbar(errorText(e, "Could not place the order"), { variant: "error" });
      queryClient.invalidateQueries({ queryKey: ["guestOrders"] });
    },
  });

  const staffMutation = useMutation({
    mutationFn: callStaff,
    onSuccess: (_, type) => enqueueSnackbar(type === "bill" ? "Your bill is on its way" : "A server is coming", { variant: "success" }),
    onError: (e) => enqueueSnackbar(errorText(e, "Could not reach staff"), { variant: "error" }),
  });

  const groupsFor = (item) =>
    (item.modifierGroups || []).map((id) => menu.modifierGroups.find((g) => g._id === id)).filter(Boolean);

  const addLine = (item, modifiers = [], unitPrice = item.price) => {
    const key = `${item._id}|${modifiers.map((m) => m.optionId).sort().join(",")}`;
    setCart((lines) => {
      const found = lines.find((l) => l.key === key);
      if (found) return lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...lines, { key, item, quantity: 1, modifiers, unitPaise: Math.round(unitPrice * 100), instructions: "" }];
    });
  };
  const onAdd = (item) => (groupsFor(item).length ? setPicking(item) : addLine(item));
  const changeQty = (key, delta) =>
    setCart((lines) => lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));
  const setNote = (key, instructions) => setCart((lines) => lines.map((l) => (l.key === key ? { ...l, instructions } : l)));

  const items = useMemo(
    () => (menu?.items || []).filter((i) => !category || String(i.category) === category),
    [menu, category]
  );
  // Estimate only; the server prices the order and staff see the real bill.
  const cartPaise = cart.reduce((sum, l) => sum + l.unitPaise * l.quantity, 0);

  if (menuQuery.isLoading) return <Shell><p className="text-center pt-20">Loading menu…</p></Shell>;
  if (menuQuery.isError) return <Shell><p className="text-center pt-20">{errorText(menuQuery.error, "Menu unavailable")}</p></Shell>;

  if (!joined) {
    return (
      <Shell>
        <div className="max-w-sm mx-auto pt-16 text-center">
          <h1 className="text-2xl font-bold">{menu.restaurantName}</h1>
          <p className="text-[#ababab] mt-1">Table {menu.tableNo}</p>
          <form
            className="mt-8 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              joinMutation.mutate();
            }}
          >
            <label htmlFor="table-code" className="block text-sm">Enter the 6-character table code from your server</label>
            <input
              id="table-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              className="w-full text-center text-2xl tracking-[0.4em] font-mono p-3 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)]"
            />
            <button
              disabled={code.length !== 6 || joinMutation.isPending}
              className="w-full py-3 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60"
            >
              Start ordering
            </button>
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex items-center justify-between gap-2 py-3">
        <div>
          <h1 className="text-xl font-bold">{menu.restaurantName}</h1>
          <p className="text-sm text-[#ababab]">Table {menu.tableNo}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => staffMutation.mutate("waiter")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--card-bg)] text-sm"
          >
            <BellRing size={16} /> Call server
          </button>
          <button
            onClick={() => staffMutation.mutate("bill")}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--card-bg)] text-sm"
          >
            <Receipt size={16} /> Bill
          </button>
        </div>
      </header>

      {myOrders.length > 0 && (
        <section className="mb-4 space-y-2" aria-live="polite">
          <h2 className="font-semibold">Your orders</h2>
          {myOrders.map((o) => (
            <div key={o._id} className="p-3 rounded-lg bg-[var(--card-bg)] text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">{o.status}</span>
                <span className="text-[#ababab]">{o.orderNo}</span>
              </div>
              {o.declineReason && <p className="text-red-500">{o.declineReason}</p>}
              <p className="text-[#ababab]">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
            </div>
          ))}
        </section>
      )}

      <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Menu sections">
        {[{ _id: "", name: "All" }, ...menu.categories].map((c) => (
          <button
            key={c._id || "all"}
            onClick={() => setCategory(c._id)}
            aria-pressed={category === c._id}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              category === c._id ? "bg-[#F6b100] text-white" : "bg-[var(--card-bg)]"
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>

      <ul className="space-y-3 pb-48">
        {items.map((item) => (
          <li key={item._id} className="flex gap-3 p-3 rounded-lg bg-[var(--card-bg)]">
            {item.image && <img src={assetUrl(item.image)} alt="" className="w-20 h-20 rounded-lg object-cover" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {item.name}
                {item.itemCategory === "veg" && <span className="ml-2 text-xs text-green-600">Veg</span>}
                {item.itemCategory === "non-veg" && <span className="ml-2 text-xs text-red-600">Non-veg</span>}
              </p>
              {item.description && <p className="text-sm text-[#ababab]">{item.description}</p>}
              {item.allergens?.length > 0 && <p className="text-xs text-[#ababab]">Contains: {item.allergens.join(", ")}</p>}
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold">₹{item.price}</span>
                {item.available === false ? (
                  <span className="text-sm text-red-500">Sold out</span>
                ) : (
                  <button onClick={() => onAdd(item)} className="px-4 py-1.5 rounded-lg bg-[#F6b100] text-white text-sm font-semibold">
                    Add
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {cart.length > 0 && (
        <section className="fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] border-t border-[var(--border-color)] p-4 max-h-[60vh] overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-2">
            {cart.map((l) => (
              <div key={l.key} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1">
                    {l.item.name}
                    {l.modifiers.length > 0 && <span className="text-[#ababab]"> · {l.modifiers.map((m) => m.name).join(", ")}</span>}
                  </span>
                  <button aria-label={`One less ${l.item.name}`} title={`One less ${l.item.name}`} onClick={() => changeQty(l.key, -1)} className="p-1 rounded bg-[var(--card-bg)]"><Minus size={14} /></button>
                  <span className="w-5 text-center">{l.quantity}</span>
                  <button aria-label={`One more ${l.item.name}`} title={`One more ${l.item.name}`} onClick={() => changeQty(l.key, 1)} className="p-1 rounded bg-[var(--card-bg)]"><Plus size={14} /></button>
                </div>
                <input
                  value={l.instructions}
                  onChange={(e) => setNote(l.key, e.target.value.slice(0, 200))}
                  placeholder="Note for the kitchen (optional)"
                  aria-label={`Note for ${l.item.name}`}
                  className="w-full mt-1 p-1.5 rounded bg-[var(--input-bg)] border border-[var(--border-color)] text-xs"
                />
              </div>
            ))}
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              placeholder="Your name (optional)"
              aria-label="Your name"
              className="w-full p-2 rounded bg-[var(--input-bg)] border border-[var(--border-color)] text-sm"
            />
            <button
              disabled={orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
              className="w-full py-3 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60"
            >
              Place order · about {rupees(cartPaise)} + tax
            </button>
          </div>
        </section>
      )}

      {picking && (
        <ModifierPicker
          item={picking}
          groups={groupsFor(picking)}
          quantity={1}
          onClose={() => setPicking(null)}
          onConfirm={(modifiers, unitPrice) => {
            addLine(picking, modifiers, unitPrice);
            setPicking(null);
          }}
        />
      )}
    </Shell>
  );
};

const Shell = ({ children }) => (
  <div className="bg-[var(--main-bg)] text-[var(--text-color)] min-h-screen">
    <main className="px-4 py-1 max-w-xl mx-auto">{children}</main>
  </div>
);

export default GuestOrder;
