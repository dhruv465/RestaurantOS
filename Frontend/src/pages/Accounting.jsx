import React, { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import BackButton from "../components/ui/BackButton";
import { addExpense, closeDay, deleteExpense, getClosingPreview, getClosings, getExpenses, getGst, getPnl } from "../https";

const inputClass = "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)]";
const primary = "px-3 py-2 rounded-lg text-sm font-semibold bg-[#F6b100] text-white disabled:opacity-60";
const card = "bg-[var(--card-bg)] rounded-lg p-4 text-[var(--text-color)]";
const rupees = (paise) => `${paise < 0 ? "−" : ""}₹${(Math.abs(paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toPaise = (r) => Math.round(Number(r || 0) * 100);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86400000));
const monthStart = () => isoDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const errorText = (e) => e.response?.data?.message || "Could not save";

const Range = ({ from, to, setFrom, setTo }) => (
  <div className="flex flex-wrap gap-2 items-end">
    <label className="text-xs text-[#ababab]">From<input type="date" className={inputClass} value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
    <label className="text-xs text-[#ababab]">To<input type="date" className={inputClass} value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
  </div>
);

const Row = ({ label, value, strong, indent }) => (
  <tr className="border-t border-[var(--border-color)]">
    <td className={`p-2 ${indent ? "pl-6 text-[#ababab]" : ""} ${strong ? "font-bold" : ""}`}>{label}</td>
    <td className={`p-2 text-right ${strong ? "font-bold" : ""}`}>{value}</td>
  </tr>
);

// ---------- Expenses ----------
const Expenses = () => {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(daysAgo(0));
  const { data } = useQuery({ queryKey: ["expenses", from, to], queryFn: () => getExpenses({ from, to }), placeholderData: keepPreviousData });
  const res = data?.data;
  const list = res?.data || [];
  const [form, setForm] = useState({ day: daysAgo(0), category: "Supplies", amount: "", method: "Cash", fromTill: true, note: "" });
  const done = (msg) => () => {
    enqueueSnackbar(msg, { variant: "success" });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["closing"] });
  };
  const fail = (e) => enqueueSnackbar(errorText(e), { variant: "error" });
  const add = useMutation({
    mutationFn: () => addExpense({ day: form.day, category: form.category, amountPaise: toPaise(form.amount), method: form.method, fromTill: form.method === "Cash" && form.fromTill, note: form.note }),
    onSuccess: () => {
      done("Expense added")();
      setForm({ ...form, amount: "", note: "" });
    },
    onError: fail,
  });
  const remove = useMutation({ mutationFn: deleteExpense, onSuccess: done("Expense deleted"), onError: fail });
  const total = list.reduce((s, e) => s + e.amountPaise, 0);

  return (
    <div className="space-y-4">
      <form className={`${card} grid grid-cols-2 md:grid-cols-7 gap-2 items-end`} onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
        <label className="text-xs text-[#ababab]">Date<input type="date" className={inputClass} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">Category
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(res?.categories || ["Supplies"]).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#ababab]">Amount (₹)<input type="number" min="0.01" step="0.01" required className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">Paid by
          <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            {(res?.methods || ["Cash"]).map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" disabled={form.method !== "Cash"} checked={form.method === "Cash" && form.fromTill} onChange={(e) => setForm({ ...form, fromTill: e.target.checked })} />
          From the till
        </label>
        <label className="text-xs text-[#ababab]">Note<input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        <button className={primary} disabled={add.isPending}>Add expense</button>
      </form>
      <p className="text-xs text-[#ababab]">Stock bought through purchase orders is already counted as food cost when it is used. Don&apos;t add it here too.</p>

      <div className={card}>
        <div className="flex flex-wrap justify-between gap-2 mb-2">
          <Range from={from} to={to} setFrom={setFrom} setTo={setTo} />
          <p className="font-semibold self-end">Total {rupees(total)}</p>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-[#ababab]"><tr><th className="p-1">Date</th><th className="p-1">Category</th><th className="p-1">Note</th><th className="p-1">Paid by</th><th className="p-1 text-right">Amount</th><th /></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e._id} className="border-t border-[var(--border-color)]">
                <td className="p-1">{e.day}</td>
                <td className="p-1">{e.category}</td>
                <td className="p-1">{e.note} <span className="text-xs text-[#ababab]">{e.by?.name}</span></td>
                <td className="p-1">{e.method}{e.fromTill && " (till)"}</td>
                <td className="p-1 text-right">{rupees(e.amountPaise)}</td>
                <td className="p-1 text-right"><button className="text-red-500 text-xs" onClick={() => window.confirm("Delete this expense?") && remove.mutate(e._id)}>Delete</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-2 text-[#ababab]">No expenses in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Cash close ----------
const CashClose = () => {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(daysAgo(0));
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const { data, error } = useQuery({
    queryKey: ["closing", day, opening],
    queryFn: () => getClosingPreview({ day, openingFloatPaise: toPaise(opening) }),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const p = data?.data?.data;
  const history = useQuery({ queryKey: ["closings"], queryFn: () => getClosings({ from: daysAgo(30), to: daysAgo(0) }) }).data?.data?.data || [];
  // Start from the cash left at the last close; the person can change it.
  useEffect(() => {
    if (opening === "" && p?.previous) setOpening(String(p.previous.countedPaise / 100));
  }, [p?.previous, opening]);
  const variance = counted === "" || !p ? null : toPaise(counted) - p.expectedPaise;
  const close = useMutation({
    mutationFn: () => closeDay({ day, openingFloatPaise: toPaise(opening), countedPaise: toPaise(counted), note }),
    onSuccess: () => {
      enqueueSnackbar(`${day} closed`, { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["closing"] });
      queryClient.invalidateQueries({ queryKey: ["closings"] });
      setCounted("");
      setNote("");
    },
    onError: (e) => enqueueSnackbar(errorText(e), { variant: "error" }),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className={`${card} space-y-3`}>
        <label className="text-xs text-[#ababab] block">Day<input type="date" className={inputClass} value={day} max={p?.today} onChange={(e) => setDay(e.target.value)} /></label>
        {error && <p className="text-red-500 text-sm">{errorText(error)}</p>}
        {p?.closed ? (
          <p className="text-sm">
            Closed by {p.closed.by?.name}: counted {rupees(p.closed.countedPaise)}, expected {rupees(p.closed.expectedPaise)},{" "}
            <span className={p.closed.variancePaise === 0 ? "" : "text-red-500 font-semibold"}>difference {rupees(p.closed.variancePaise)}</span>
            {p.closed.note && <span className="block text-[#ababab]">{p.closed.note}</span>}
          </p>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); close.mutate(); }}>
            <label className="text-xs text-[#ababab] block">Cash in the till at opening (₹)<input type="number" min="0" step="0.01" className={inputClass} value={opening} onChange={(e) => setOpening(e.target.value)} /></label>
            {p && (
              <table className="w-full text-sm">
                <tbody>
                  <Row label="Opening float" value={rupees(p.openingFloatPaise)} />
                  <Row label="+ Cash payments taken" value={rupees(p.cashInPaise)} />
                  <Row label="− Cash refunds given" value={rupees(p.cashOutPaise)} />
                  <Row label="− Expenses paid from the till" value={rupees(p.tillExpensesPaise)} />
                  <Row label="Should be in the till" value={rupees(p.expectedPaise)} strong />
                </tbody>
              </table>
            )}
            <label className="text-xs text-[#ababab] block">Cash you counted (₹)<input type="number" min="0" step="0.01" required className={inputClass} value={counted} onChange={(e) => setCounted(e.target.value)} /></label>
            {variance !== null && (
              <p className={variance === 0 ? "text-green-500 text-sm" : "text-red-500 text-sm font-semibold"}>
                {variance === 0 ? "Matches." : variance < 0 ? `Short by ${rupees(-variance)}` : `Over by ${rupees(variance)}`}
              </p>
            )}
            <input aria-label="Note" placeholder={variance ? "Why is it different? (required)" : "Note (optional)"} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className={primary} disabled={close.isPending || counted === ""}>Close the day</button>
          </form>
        )}
      </section>
      <section className={card}>
        <h3 className="font-semibold mb-2">Last 30 days</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-[#ababab]"><tr><th className="p-1">Day</th><th className="p-1 text-right">Expected</th><th className="p-1 text-right">Counted</th><th className="p-1 text-right">Difference</th></tr></thead>
          <tbody>
            {history.map((c) => (
              <tr key={c._id} className="border-t border-[var(--border-color)]" title={c.note}>
                <td className="p-1">{c.day}</td>
                <td className="p-1 text-right">{rupees(c.expectedPaise)}</td>
                <td className="p-1 text-right">{rupees(c.countedPaise)}</td>
                <td className={`p-1 text-right ${c.variancePaise ? "text-red-500" : ""}`}>{rupees(c.variancePaise)}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={4} className="p-2 text-[#ababab]">No closings yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

// ---------- P&L ----------
const ProfitLoss = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(daysAgo(0));
  const { data, error } = useQuery({ queryKey: ["pnl", from, to], queryFn: () => getPnl({ from, to }), placeholderData: keepPreviousData, retry: false });
  const r = data?.data?.data;
  return (
    <div className="space-y-3">
      <Range from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {error && <p className="text-red-500">{errorText(error)}</p>}
      {r && (
        <section className={`${card} max-w-xl`}>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Sales (incl. tax & tips)" value={rupees(r.sales.totalPaise)} />
              <Row label="− Tax collected" value={rupees(r.sales.taxPaise)} indent />
              <Row label="− Tips (passed to staff)" value={rupees(r.sales.tipPaise)} indent />
              <Row label="− Refunds" value={rupees(r.sales.refundsPaise)} indent />
              <Row label="Revenue" value={rupees(r.revenuePaise)} strong />
              <Row label="− Food cost (stock used)" value={rupees(r.foodCostPaise)} indent />
              <Row label="− Waste and stock losses" value={rupees(r.shrinkagePaise)} indent />
              <Row label="Gross profit" value={rupees(r.grossProfitPaise)} strong />
              <Row label="− Staff pay (finalized payroll)" value={rupees(r.payrollPaise)} indent />
              {r.expensesByCategory.map((e) => <Row key={e.key} label={`− ${e.key}`} value={rupees(e.amountPaise)} indent />)}
              <Row label="Net profit" value={rupees(r.netProfitPaise)} strong />
              <Row label="Margin" value={r.marginPercent === null ? "—" : `${r.marginPercent}%`} />
            </tbody>
          </table>
          <p className="text-xs text-[#ababab] mt-2">Sales by order date in {r.timezone}. Payroll counts only finalized runs, spread evenly over their days.</p>
        </section>
      )}
    </div>
  );
};

// ---------- GST ----------
const Gst = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(daysAgo(0));
  const { data, error } = useQuery({ queryKey: ["gst", from, to], queryFn: () => getGst({ from, to }), placeholderData: keepPreviousData, retry: false });
  const r = data?.data?.data;
  return (
    <div className="space-y-3">
      <Range from={from} to={to} setFrom={setFrom} setTo={setTo} />
      {error && <p className="text-red-500">{errorText(error)}</p>}
      {r && (
        <section className={card}>
          <table className="w-full text-sm">
            <thead className="text-left text-[#ababab]">
              <tr><th className="p-2">Rate</th><th className="p-2 text-right">Bills</th><th className="p-2 text-right">Taxable value</th><th className="p-2 text-right">CGST</th><th className="p-2 text-right">SGST</th><th className="p-2 text-right">Total tax</th></tr>
            </thead>
            <tbody>
              {[...r.rows, { ...r.total, ratePercent: "Total" }].map((x) => (
                <tr key={x.ratePercent} className={`border-t border-[var(--border-color)] ${x.ratePercent === "Total" ? "font-bold" : ""}`}>
                  <td className="p-2">{x.ratePercent === "Total" ? "Total" : `${x.ratePercent}%`}</td>
                  <td className="p-2 text-right">{x.orders}</td>
                  <td className="p-2 text-right">{rupees(x.taxablePaise)}</td>
                  <td className="p-2 text-right">{rupees(x.cgstPaise)}</td>
                  <td className="p-2 text-right">{rupees(x.sgstPaise)}</td>
                  <td className="p-2 text-right">{rupees(x.taxPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[#ababab] mt-2">Paid bills, split half CGST / half SGST (same-state sales). Refunds are not taken off. Check with your accountant before filing.</p>
        </section>
      )}
    </div>
  );
};

const TABS = [["expenses", "Expenses"], ["close", "Cash close"], ["pnl", "Profit & loss"], ["gst", "GST summary"]];

const Accounting = () => {
  const [tab, setTab] = useState("expenses");
  useEffect(() => {
    document.title = "RestOS | Accounting";
  }, []);
  return (
    <div className="bg-[var(--main-bg)] px-4 md:px-6 pb-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Accounting</h1>
      </div>
      <div className="flex flex-wrap gap-1 mb-4 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`py-2 px-4 rounded-md text-sm ${tab === key ? "bg-[var(--nav-bg)] text-[var(--text-color)] font-semibold" : "text-[#ababab]"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "expenses" && <Expenses />}
      {tab === "close" && <CashClose />}
      {tab === "pnl" && <ProfitLoss />}
      {tab === "gst" && <Gst />}
    </div>
  );
};

export default Accounting;
