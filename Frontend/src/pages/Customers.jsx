import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import BackButton from "../components/ui/BackButton";
import { adjustCustomerPoints, createCustomer, getCustomer, getCustomers, updateCustomer } from "../https";
import { can, formatDateAndTime } from "../utils";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)] disabled:opacity-60";
const rupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;
const errorText = (e, fallback) => e.response?.data?.message || fallback;
const LEDGER_LABEL = { earn: "Earned", redeem: "Spent", reverse: "Returned", refund: "Refunded", adjust: "Adjusted" };

const Profile = ({ id, canEdit, canAdjust }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["customer", id], queryFn: () => getCustomer(id) });
  const profile = data?.data?.data;
  const [form, setForm] = useState(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (profile) {
      const c = profile.customer;
      setForm({ name: c.name, phone: c.phone, email: c.email, birthday: c.birthday?.slice(0, 10) || "", allergies: c.allergies, notes: c.notes, marketingOptOut: c.marketingOptOut });
    }
  }, [profile]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["customer", id] });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };
  const save = useMutation({
    mutationFn: () => updateCustomer(id, form),
    onSuccess: () => {
      enqueueSnackbar("Saved", { variant: "success" });
      refresh();
    },
    onError: (e) => enqueueSnackbar(errorText(e, "Could not save"), { variant: "error" }),
  });
  const adjust = useMutation({
    mutationFn: () => adjustCustomerPoints(id, { points: Number(points), note }),
    onSuccess: () => {
      setPoints("");
      setNote("");
      refresh();
    },
    onError: (e) => enqueueSnackbar(errorText(e, "Could not change points"), { variant: "error" }),
  });

  if (isLoading || !profile || !form) return <p className="text-[var(--text-color)]">Loading…</p>;
  const c = profile.customer;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="space-y-5 text-[var(--text-color)]">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-[var(--nav-bg)] rounded-lg p-3">
          <p className="text-2xl font-bold">{c.loyaltyPoints}</p>
          <p className="text-xs text-[#ababab]">points</p>
        </div>
        <div className="bg-[var(--nav-bg)] rounded-lg p-3">
          <p className="text-2xl font-bold">{c.visits}</p>
          <p className="text-xs text-[#ababab]">paid visits</p>
        </div>
        <div className="bg-[var(--nav-bg)] rounded-lg p-3">
          <p className="text-2xl font-bold">{rupees(c.totalSpentPaise)}</p>
          <p className="text-xs text-[#ababab]">spent</p>
        </div>
      </div>

      <form
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {[
          ["name", "Name"],
          ["phone", "Phone"],
          ["email", "Email"],
          ["birthday", "Birthday", "date"],
          ["allergies", "Allergies"],
        ].map(([key, label, type]) => (
          <label key={key} className="text-xs text-[#ababab]">
            {label}
            <input type={type || "text"} className={inputClass} value={form[key] || ""} onChange={set(key)} disabled={!canEdit} />
          </label>
        ))}
        <label className="text-xs text-[#ababab] sm:col-span-2">
          Notes
          <textarea className={inputClass} rows={2} value={form.notes || ""} onChange={set("notes")} disabled={!canEdit} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.marketingOptOut} onChange={set("marketingOptOut")} disabled={!canEdit} />
          No marketing messages
        </label>
        {canEdit && (
          <button disabled={save.isPending} className="sm:col-start-2 py-2 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60">
            Save
          </button>
        )}
      </form>

      {canAdjust && (
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            adjust.mutate();
          }}
        >
          <label className="text-xs text-[#ababab] w-28">
            Points (+/−)
            <input type="number" step="1" className={inputClass} value={points} onChange={(e) => setPoints(e.target.value)} />
          </label>
          <label className="text-xs text-[#ababab] flex-1 min-w-[10rem]">
            Reason
            <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button disabled={!points || !note.trim() || adjust.isPending} className="px-4 py-2 rounded-lg bg-[var(--nav-bg)] font-semibold disabled:opacity-60">
            Change points
          </button>
        </form>
      )}

      <section>
        <h3 className="font-semibold mb-2">Recent orders</h3>
        {profile.orders.length === 0 && <p className="text-sm text-[#ababab]">None yet.</p>}
        <ul className="space-y-1 text-sm">
          {profile.orders.map((o) => (
            <li key={o._id} className="flex justify-between gap-2 border-b border-[var(--border-color)] py-1">
              <span>
                {o.orderNo} · {formatDateAndTime(o.createdAt)}
                <span className="block text-xs text-[#ababab]">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
              </span>
              <span className="text-right">
                {rupees(o.bills?.totalPaise)}
                <span className="block text-xs text-[#ababab]">{o.orderStatus === "Cancelled" ? "Cancelled" : o.paymentStatus}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Points history</h3>
        {profile.ledger.length === 0 && <p className="text-sm text-[#ababab]">None yet.</p>}
        <ul className="space-y-1 text-sm">
          {profile.ledger.map((l) => (
            <li key={l._id} className="flex justify-between gap-2">
              <span>
                {LEDGER_LABEL[l.type]} {l.orderNo && `· ${l.orderNo}`} {l.note && `· ${l.note}`}
                <span className="block text-xs text-[#ababab]">{formatDateAndTime(l.createdAt)}</span>
              </span>
              <span className={l.points < 0 ? "text-red-500" : "text-green-600"}>
                {l.points > 0 ? `+${l.points}` : l.points}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

const Customers = () => {
  const user = useSelector((state) => state.user);
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState({ name: "", phone: "" });

  useEffect(() => {
    document.title = "RestOS | Customers";
  }, []);

  const { data } = useQuery({ queryKey: ["customers", q], queryFn: () => getCustomers(q), placeholderData: keepPreviousData });
  const customers = data?.data?.data || [];

  const create = useMutation({
    mutationFn: () => createCustomer(adding),
    onSuccess: (res) => {
      setAdding({ name: "", phone: "" });
      setSelected(res.data.data._id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e) => enqueueSnackbar(errorText(e, "Could not add customer"), { variant: "error" }),
  });

  return (
    <div className="bg-[var(--main-bg)] min-h-screen px-2 sm:px-4 md:px-6 pb-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Customers</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">
        <section className="bg-[var(--card-bg)] rounded-lg p-3 space-y-3">
          <input
            aria-label="Search customers"
            className={inputClass}
            placeholder="Search name or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="max-h-[60vh] overflow-y-auto">
            {customers.map((c) => (
              <li key={c._id}>
                <button
                  onClick={() => setSelected(c._id)}
                  aria-current={selected === c._id}
                  className={`w-full text-left p-2 rounded-lg text-[var(--text-color)] ${selected === c._id ? "bg-[var(--nav-bg)]" : ""}`}
                >
                  <span className="font-semibold">{c.name}</span>
                  <span className="block text-xs text-[#ababab]">
                    {c.phone} · {c.loyaltyPoints} pts · {c.visits} visits
                  </span>
                </button>
              </li>
            ))}
            {customers.length === 0 && <li className="text-sm text-[#ababab] p-2">No customers found.</li>}
          </ul>
          {can(user, "orders.manage") && (
            <form
              className="space-y-2 border-t border-[var(--border-color)] pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <p className="text-sm text-[var(--text-color)] font-semibold">Add customer</p>
              <input aria-label="New customer name" className={inputClass} placeholder="Name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
              <input aria-label="New customer phone" className={inputClass} placeholder="Phone" inputMode="tel" value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
              <button disabled={!adding.name.trim() || !adding.phone.trim() || create.isPending} className="w-full py-2 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60">
                Add
              </button>
            </form>
          )}
        </section>
        <section className="bg-[var(--card-bg)] rounded-lg p-4">
          {selected ? (
            <Profile key={selected} id={selected} canEdit={can(user, "orders.manage")} canAdjust={can(user, "loyalty.adjust")} />
          ) : (
            <p className="text-[#ababab]">Pick a customer to see their visits, orders and points. Orders with a phone number add customers here automatically.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Customers;
