import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { enqueueSnackbar } from "notistack";
import BackButton from "../components/ui/BackButton";
import Modal from "../components/ui/Modal";
import {
  adjustStock, receiveStock, getStockUsage, createIngredient, createPurchaseOrder, createSupplier, getIngredients, getMovements, getPurchaseOrders,
  getRecipes, getShoppingList, getSuppliers, logWaste, receivePurchaseOrder, saveRecipe, stockTake, updateIngredient,
  updatePurchaseOrder,
} from "../https";
import { can, formatDateAndTime, newId } from "../utils";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const btn = "px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60";
const primary = `${btn} bg-[#F6b100] text-white`;
const secondary = `${btn} bg-[var(--nav-bg)] text-[var(--text-color)]`;
const rupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;
const errorText = (e, fallback) => e.response?.data?.message || fallback;
const WASTE_REASONS = ["expired", "spoiled", "dropped", "overcooked", "returned", "other"];

// Stock is kept in g / ml / pcs; prices are easier to think of per kg / litre / piece.
const PACK = { g: [1000, "kg"], ml: [1000, "L"], pcs: [1, "pc"] };
const packCost = (unit, paisePerUnit) => rupees(paisePerUnit * PACK[unit][0]);
const toUnitPaise = (unit, rupeesPerPack) => (Number(rupeesPerPack) * 100) / PACK[unit][0];
// Big amounts read in kg / L; small ones (a recipe's 60 g) stay in g / ml.
const qty = (n, unit) => {
  const [size, big] = PACK[unit] || [1, unit];
  const v = Number(n || 0);
  const show = size > 1 && Math.abs(v) >= size ? [v / size, big] : [v, unit];
  return `${show[0].toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${show[1]}`;
};
// What staff type is in kg / L / pc; the server keeps g / ml / pcs.
const toBase = (unit, v) => Number(v) * PACK[unit][0];
const fromBase = (unit, v) => Number(v || 0) / PACK[unit][0];
const today = () => new Date().toLocaleDateString("en-CA");
const PAID = [["", "Not paid yet"], ["till", "Cash from the till"], ["Cash", "Cash (not from the till)"], ["UPI", "UPI"], ["Card", "Card"], ["Bank", "Bank transfer"]];

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => ["ingredients", "movements", "shoppingList", "recipes", "purchaseOrders", "stockUsage"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
};
const useAct = (fn, done = "Saved", after) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      enqueueSnackbar(done, { variant: "success" });
      invalidate();
      after?.(res);
    },
    onError: (e) => enqueueSnackbar(errorText(e, "Could not save"), { variant: "error" }),
  });
};

// ---------- Stock ----------
const StockTab = ({ canManage }) => {
  const { data } = useQuery({ queryKey: ["ingredients"], queryFn: getIngredients });
  const { data: sup } = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers, enabled: canManage });
  const list = data?.data?.data || [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "g", parLevel: "", openingStock: "", packCost: "" });
  const [acting, setActing] = useState(null); // { mode: 'waste'|'adjust'|'edit', ingredient }
  const [entry, setEntry] = useState({ qty: "", reason: "spoiled", note: "", parLevel: "", supplier: "", price: "", paid: "" });
  const [counting, setCounting] = useState(null); // { [id]: counted }

  const create = useAct(
    () => createIngredient({
      name: form.name,
      unit: form.unit,
      parLevel: toBase(form.unit, form.parLevel || 0),
      openingStock: toBase(form.unit, form.openingStock || 0),
      unitCostPaise: toUnitPaise(form.unit, form.packCost || 0),
    }),
    "Ingredient added",
    () => {
      setAdding(false);
      setForm({ name: "", unit: "g", parLevel: "", openingStock: "", packCost: "" });
    }
  );
  const close = () => setActing(null);
  const unit = acting?.ingredient.unit;
  const waste = useAct(() => logWaste({ ingredient: acting.ingredient._id, qty: toBase(unit, entry.qty), reason: entry.reason, note: entry.note }), "Waste logged", close);
  const adjust = useAct(() => adjustStock(acting.ingredient._id, { qty: toBase(unit, entry.qty), note: entry.note }), "Stock adjusted", close);
  const edit = useAct(() => updateIngredient(acting.ingredient._id, { parLevel: toBase(unit, entry.parLevel || 0), supplier: entry.supplier || null }), "Saved", close);
  const receive = useAct(
    () => receiveStock(acting.ingredient._id, {
      qty: toBase(unit, entry.qty),
      unitCostPaise: toUnitPaise(unit, entry.price || 0),
      ...(entry.paid && { method: entry.paid === "till" ? "Cash" : entry.paid, fromTill: entry.paid === "till" }),
      note: entry.note,
    }),
    "Stock added",
    close
  );
  const count = useAct(
    () => stockTake({ counts: Object.entries(counting).filter(([, v]) => v !== "").map(([ingredient, counted]) => ({ ingredient, counted: toBase(list.find((i) => i._id === ingredient).unit, counted) })) }),
    "Stock take saved",
    () => setCounting(null)
  );

  const open = (mode, ingredient) => {
    setEntry({ qty: "", reason: "spoiled", note: "", parLevel: ingredient.parLevel ? String(fromBase(ingredient.unit, ingredient.parLevel)) : "", supplier: ingredient.supplier?._id || "", price: ingredient.avgCostPaise ? (ingredient.avgCostPaise * PACK[ingredient.unit][0] / 100).toFixed(2) : "", paid: "" });
    setActing({ mode, ingredient });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canManage && <button className={primary} onClick={() => setAdding(true)}>Add ingredient</button>}
        {canManage && !counting && (
          <button className={secondary} onClick={() => setCounting(Object.fromEntries(list.map((i) => [i._id, ""])))}>Start stock take</button>
        )}
        {counting && (
          <>
            <button className={primary} disabled={count.isPending} onClick={() => count.mutate()}>Save counts</button>
            <button className={secondary} onClick={() => setCounting(null)}>Cancel count</button>
            <p className="text-xs text-[#ababab] self-center">Type what is on the shelf; leave blank to skip. Best done when the kitchen is closed.</p>
          </>
        )}
      </div>
      <div className="overflow-x-auto bg-[var(--card-bg)] rounded-lg">
        <table className="w-full text-sm text-[var(--text-color)]">
          <thead className="text-left text-[#ababab]">
            <tr>
              <th className="p-2">Ingredient</th>
              <th className="p-2">In stock</th>
              <th className="p-2">Low at</th>
              <th className="p-2">Avg cost</th>
              <th className="p-2">Supplier</th>
              <th className="p-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i._id} className="border-t border-[var(--border-color)]">
                <td className="p-2 font-semibold">
                  {i.name} {i.low && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Low</span>}
                </td>
                <td className={`p-2 ${i.stock < 0 ? "text-red-500" : ""}`}>
                  {counting ? (
                    <input
                      aria-label={`Counted ${i.name} in ${PACK[i.unit][1]}`}
                      type="number"
                      min="0"
                      className={`${inputClass} w-28`}
                      placeholder={String(fromBase(i.unit, i.stock))}
                      value={counting[i._id]}
                      onChange={(e) => setCounting({ ...counting, [i._id]: e.target.value })}
                    />
                  ) : (
                    qty(i.stock, i.unit)
                  )}
                </td>
                <td className="p-2">{qty(i.parLevel, i.unit)}</td>
                <td className="p-2">{packCost(i.unit, i.avgCostPaise)}/{PACK[i.unit][1]}</td>
                <td className="p-2">{i.supplier?.name || "—"}</td>
                <td className="p-2 whitespace-nowrap space-x-1">
                  {canManage && <button className={primary} onClick={() => open("receive", i)}>Stock received</button>}
                  <button className={secondary} onClick={() => open("waste", i)}>Waste</button>
                  {canManage && <button className={secondary} onClick={() => open("adjust", i)}>Adjust</button>}
                  {canManage && <button className={secondary} onClick={() => open("edit", i)}>Edit</button>}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td className="p-3 text-[#ababab]" colSpan={6}>No ingredients yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && (
        <Modal isOpen onClose={() => setAdding(false)} title="Add ingredient">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <label className="block text-xs text-[#ababab]">Name<input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block text-xs text-[#ababab]">Counted in
              <select className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="g">grams (g)</option><option value="ml">millilitres (ml)</option><option value="pcs">pieces (pcs)</option>
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-[#ababab]">Low at ({PACK[form.unit][1]})<input type="number" min="0" step="any" className={inputClass} value={form.parLevel} onChange={(e) => setForm({ ...form, parLevel: e.target.value })} /></label>
              <label className="text-xs text-[#ababab]">Opening stock ({PACK[form.unit][1]})<input type="number" min="0" step="any" className={inputClass} value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} /></label>
              <label className="text-xs text-[#ababab]">Cost ₹/{PACK[form.unit][1]}<input type="number" min="0" step="0.01" className={inputClass} value={form.packCost} onChange={(e) => setForm({ ...form, packCost: e.target.value })} /></label>
            </div>
            <button className={`${primary} w-full`} disabled={!form.name.trim() || create.isPending}>Add</button>
          </form>
        </Modal>
      )}

      {acting && (
        <Modal isOpen onClose={close} title={`${{ waste: "Log waste", adjust: "Adjust stock", receive: "Stock received", edit: "Edit" }[acting.mode]}: ${acting.ingredient.name}`}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              ({ waste, adjust, edit, receive })[acting.mode].mutate();
            }}
          >
            {acting.mode !== "edit" && (
              <label className="block text-xs text-[#ababab]">
                {{ adjust: `Change (${PACK[unit][1]}, use − to remove)`, waste: `Amount wasted (${PACK[unit][1]})`, receive: `Amount received (${PACK[unit][1]})` }[acting.mode]}
                <input type="number" step="any" required className={inputClass} value={entry.qty} onChange={(e) => setEntry({ ...entry, qty: e.target.value })} />
              </label>
            )}
            {acting.mode === "receive" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-[#ababab]">Price ₹/{PACK[unit][1]}
                  <input type="number" min="0" step="0.01" className={inputClass} value={entry.price} onChange={(e) => setEntry({ ...entry, price: e.target.value })} />
                </label>
                <label className="text-xs text-[#ababab]">Paid
                  <select className={inputClass} value={entry.paid} onChange={(e) => setEntry({ ...entry, paid: e.target.value })}>
                    {PAID.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <p className="col-span-2 text-xs text-[#ababab]">
                  Total {rupees(toBase(unit, entry.qty || 0) * toUnitPaise(unit, entry.price || 0))}. Paid stock shows in Accounting → Expenses and the cash close; profit counts it when it is used.
                </p>
              </div>
            )}
            {acting.mode === "waste" && (
              <label className="block text-xs text-[#ababab]">Reason
                <select className={inputClass} value={entry.reason} onChange={(e) => setEntry({ ...entry, reason: e.target.value })}>
                  {WASTE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            )}
            {acting.mode !== "edit" && (
              <label className="block text-xs text-[#ababab]">{acting.mode === "adjust" ? "Reason (required)" : acting.mode === "receive" ? "Note (e.g. from where)" : "Note"}
                <input className={inputClass} value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} />
              </label>
            )}
            {acting.mode === "edit" && (
              <>
                <label className="block text-xs text-[#ababab]">Low at ({PACK[unit][1]})
                  <input type="number" min="0" step="any" className={inputClass} value={entry.parLevel} onChange={(e) => setEntry({ ...entry, parLevel: e.target.value })} />
                </label>
                <label className="block text-xs text-[#ababab]">Usual supplier
                  <select className={inputClass} value={entry.supplier} onChange={(e) => setEntry({ ...entry, supplier: e.target.value })}>
                    <option value="">None</option>
                    {(sup?.data?.data || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </label>
              </>
            )}
            <button className={`${primary} w-full`}>Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ---------- Recipes ----------
const RecipesTab = () => {
  const { data } = useQuery({ queryKey: ["recipes"], queryFn: getRecipes });
  const { data: ing } = useQuery({ queryKey: ["ingredients"], queryFn: getIngredients });
  const items = data?.data?.data || [];
  const ingredients = ing?.data?.data || [];
  const byId = Object.fromEntries(ingredients.map((i) => [i._id, i]));
  const [editing, setEditing] = useState(null); // { item, lines: [{ ingredient, qty }] }
  const save = useAct(() => saveRecipe(editing.item._id, { recipe: editing.lines.filter((l) => l.ingredient && Number(l.qty) > 0).map((l) => ({ ingredient: l.ingredient, qty: Number(l.qty) })) }), "Recipe saved", () => setEditing(null));
  const setLine = (n, patch) => setEditing({ ...editing, lines: editing.lines.map((l, i) => (i === n ? { ...l, ...patch } : l)) });

  return (
    <div className="overflow-x-auto bg-[var(--card-bg)] rounded-lg">
      <table className="w-full text-sm text-[var(--text-color)]">
        <thead className="text-left text-[#ababab]">
          <tr><th className="p-2">Dish</th><th className="p-2">Price</th><th className="p-2">Ingredient cost</th><th className="p-2">Food cost</th><th className="p-2">Recipe</th><th /></tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it._id} className="border-t border-[var(--border-color)]">
              <td className="p-2 font-semibold">{it.name}</td>
              <td className="p-2">₹{it.price}</td>
              <td className="p-2">{it.recipe?.length ? rupees(it.costPaise) : "—"}</td>
              <td className={`p-2 ${it.foodCostPercent > 35 ? "text-red-500 font-semibold" : ""}`}>{it.recipe?.length ? `${it.foodCostPercent}%` : "—"}</td>
              <td className="p-2 text-xs text-[#ababab]">{(it.recipe || []).map((r) => `${byId[r.ingredient]?.name || "?"} ${r.qty}${byId[r.ingredient]?.unit || ""}`).join(", ") || "None"}</td>
              <td className="p-2">
                <button className={secondary} onClick={() => setEditing({ item: it, lines: (it.recipe || []).map((r) => ({ ingredient: r.ingredient, qty: String(r.qty) })) })}>Edit recipe</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Recipe: ${editing.item.name} (one portion)`}>
          <div className="space-y-2">
            {editing.lines.map((l, n) => (
              <div key={n} className="flex gap-2 items-center">
                <select aria-label="Ingredient" className={inputClass} value={l.ingredient} onChange={(e) => setLine(n, { ingredient: e.target.value })}>
                  <option value="">Pick ingredient</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                </select>
                <input aria-label="Amount" type="number" min="0" step="any" className={`${inputClass} w-28`} value={l.qty} onChange={(e) => setLine(n, { qty: e.target.value })} />
                <button aria-label="Remove line" title="Remove line" className={secondary} onClick={() => setEditing({ ...editing, lines: editing.lines.filter((_, i) => i !== n) })}>×</button>
              </div>
            ))}
            <button className={secondary} onClick={() => setEditing({ ...editing, lines: [...editing.lines, { ingredient: "", qty: "" }] })}>Add ingredient</button>
            <button className={`${primary} w-full`} disabled={save.isPending} onClick={() => save.mutate()}>Save recipe</button>
            <p className="text-xs text-[#ababab]">Stock comes off when an order with this dish is fully paid.</p>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------- Purchase orders ----------
const PurchaseOrdersTab = () => {
  const { data } = useQuery({ queryKey: ["purchaseOrders"], queryFn: getPurchaseOrders });
  const { data: ing } = useQuery({ queryKey: ["ingredients"], queryFn: getIngredients });
  const { data: sup } = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });
  const orders = data?.data?.data || [];
  const ingredients = ing?.data?.data || [];
  const suppliers = sup?.data?.data || [];
  const unitOf = (id) => ingredients.find((i) => i._id === id)?.unit || "g";
  const [draft, setDraft] = useState(null); // { supplier, lines: [{ ingredient, qty, packCost }] }
  const [receiving, setReceiving] = useState(null); // { po, requestId, invoiceNo, lines }

  const create = useAct(
    (status) => createPurchaseOrder({
      supplier: draft.supplier,
      status,
      lines: draft.lines.filter((l) => l.ingredient).map((l) => ({ ingredient: l.ingredient, qty: toBase(unitOf(l.ingredient), l.qty), unitCostPaise: toUnitPaise(unitOf(l.ingredient), l.packCost || 0) })),
    }),
    "Purchase order saved",
    () => setDraft(null)
  );
  const setStatus = useAct(({ id, status }) => updatePurchaseOrder(id, { status }), "Updated");
  const receive = useAct(
    () => receivePurchaseOrder(receiving.po._id, {
      requestId: receiving.requestId,
      invoiceNo: receiving.invoiceNo,
      lines: receiving.lines.filter((l) => Number(l.qty) > 0).map((l) => ({ ingredient: l.ingredient, qty: toBase(l.unit, l.qty), unitCostPaise: toUnitPaise(l.unit, l.packCost || 0) })),
    }),
    "Goods received; stock updated",
    () => setReceiving(null)
  );
  const setLine = (n, patch) => setDraft({ ...draft, lines: draft.lines.map((l, i) => (i === n ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-3">
      <button className={primary} disabled={!suppliers.length} onClick={() => setDraft({ supplier: suppliers[0]?._id, lines: [{ ingredient: "", qty: "", packCost: "" }] })}>
        New purchase order
      </button>
      {!suppliers.length && <p className="text-xs text-[#ababab]">Add a supplier first.</p>}
      <div className="space-y-2">
        {orders.map((po) => (
          <div key={po._id} className="bg-[var(--card-bg)] rounded-lg p-3 text-sm text-[var(--text-color)]">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-semibold">{po.poNo} · {po.supplier?.name} · {po.status}</span>
              <span className="text-[#ababab]">{formatDateAndTime(po.createdAt)}</span>
            </div>
            <p className="text-[#ababab]">
              {po.lines.map((l) => `${l.ingredient?.name} ${qty(l.receivedQty, l.ingredient?.unit)} / ${qty(l.qty, l.ingredient?.unit)}`).join(" · ")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {po.status === "Draft" && <button className={secondary} onClick={() => setStatus.mutate({ id: po._id, status: "Ordered" })}>Mark ordered</button>}
              {["Draft", "Ordered", "Partly received"].includes(po.status) && (
                <button
                  className={primary}
                  onClick={() =>
                    setReceiving({
                      po,
                      requestId: newId(),
                      invoiceNo: "",
                      lines: po.lines.map((l) => ({
                        ingredient: l.ingredient?._id,
                        name: l.ingredient?.name,
                        unit: l.ingredient?.unit || "g",
                        qty: String(fromBase(l.ingredient?.unit || "g", Math.max(0, l.qty - l.receivedQty))),
                        packCost: String(((l.unitCostPaise * PACK[l.ingredient?.unit || "g"][0]) / 100).toFixed(2)),
                      })),
                    })
                  }
                >
                  Receive goods
                </button>
              )}
              {["Draft", "Ordered"].includes(po.status) && <button className={secondary} onClick={() => window.confirm("Cancel this purchase order?") && setStatus.mutate({ id: po._id, status: "Cancelled" })}>Cancel</button>}
              {po.status === "Partly received" && <button className={secondary} onClick={() => setStatus.mutate({ id: po._id, status: "Received" })}>Close (rest not coming)</button>}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-[#ababab]">No purchase orders yet.</p>}
      </div>

      {draft && (
        <Modal isOpen onClose={() => setDraft(null)} title="New purchase order">
          <div className="space-y-2">
            <select aria-label="Supplier" className={inputClass} value={draft.supplier} onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            {draft.lines.map((l, n) => (
              <div key={n} className="grid grid-cols-[1fr_6rem_6rem_auto] gap-2 items-end">
                <select aria-label="Ingredient" className={inputClass} value={l.ingredient} onChange={(e) => setLine(n, { ingredient: e.target.value })}>
                  <option value="">Ingredient</option>
                  {ingredients.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
                </select>
                <label className="text-xs text-[#ababab]">Qty ({PACK[unitOf(l.ingredient)][1]})<input type="number" min="0" step="any" className={inputClass} value={l.qty} onChange={(e) => setLine(n, { qty: e.target.value })} /></label>
                <label className="text-xs text-[#ababab]">₹/{PACK[unitOf(l.ingredient)][1]}<input type="number" min="0" step="0.01" className={inputClass} value={l.packCost} onChange={(e) => setLine(n, { packCost: e.target.value })} /></label>
                <button aria-label="Remove line" title="Remove line" className={secondary} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== n) })}>×</button>
              </div>
            ))}
            <button className={secondary} onClick={() => setDraft({ ...draft, lines: [...draft.lines, { ingredient: "", qty: "", packCost: "" }] })}>Add line</button>
            <div className="flex gap-2">
              <button className={`${secondary} flex-1`} disabled={create.isPending} onClick={() => create.mutate("Draft")}>Save draft</button>
              <button className={`${primary} flex-1`} disabled={create.isPending} onClick={() => create.mutate("Ordered")}>Save as ordered</button>
            </div>
          </div>
        </Modal>
      )}

      {receiving && (
        <Modal isOpen onClose={() => setReceiving(null)} title={`Receive ${receiving.po.poNo}`}>
          <div className="space-y-2">
            {receiving.lines.map((l, n) => (
              <div key={n} className="grid grid-cols-[1fr_6rem_6rem] gap-2 items-end text-sm text-[var(--text-color)]">
                <span>{l.name}</span>
                <label className="text-xs text-[#ababab]">Arrived ({PACK[l.unit][1]})
                  <input type="number" min="0" step="any" className={inputClass} value={l.qty} onChange={(e) => setReceiving({ ...receiving, lines: receiving.lines.map((x, i) => (i === n ? { ...x, qty: e.target.value } : x)) })} />
                </label>
                <label className="text-xs text-[#ababab]">Paid ₹/{PACK[l.unit][1]}
                  <input type="number" min="0" step="0.01" className={inputClass} value={l.packCost} onChange={(e) => setReceiving({ ...receiving, lines: receiving.lines.map((x, i) => (i === n ? { ...x, packCost: e.target.value } : x)) })} />
                </label>
              </div>
            ))}
            <input aria-label="Supplier invoice number" className={inputClass} placeholder="Supplier invoice no. (optional)" value={receiving.invoiceNo} onChange={(e) => setReceiving({ ...receiving, invoiceNo: e.target.value })} />
            <button className={`${primary} w-full`} disabled={receive.isPending} onClick={() => receive.mutate()}>Add to stock</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ---------- Suppliers ----------
const SuppliersTab = () => {
  const { data } = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "", gstin: "" });
  const create = useAct(() => createSupplier(form), "Supplier added", () => {
    setForm({ name: "", phone: "", email: "", gstin: "" });
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  });
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-4">
      <ul className="bg-[var(--card-bg)] rounded-lg p-3 space-y-2 text-sm text-[var(--text-color)]">
        {(data?.data?.data || []).map((s) => (
          <li key={s._id} className="border-b border-[var(--border-color)] pb-2">
            <span className="font-semibold">{s.name}</span>
            <span className="block text-xs text-[#ababab]">{[s.phone, s.email, s.gstin && `GSTIN ${s.gstin}`].filter(Boolean).join(" · ")}</span>
          </li>
        ))}
        {!data?.data?.data?.length && <li className="text-[#ababab]">No suppliers yet.</li>}
      </ul>
      <form className="bg-[var(--card-bg)] rounded-lg p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
        <p className="font-semibold text-[var(--text-color)]">Add supplier</p>
        {[["name", "Name"], ["phone", "Phone"], ["email", "Email"], ["gstin", "GSTIN"]].map(([k, label]) => (
          <input key={k} aria-label={label} placeholder={label} className={inputClass} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
        <button className={`${primary} w-full`} disabled={!form.name.trim() || create.isPending}>Add</button>
      </form>
    </div>
  );
};

// ---------- Shopping list + history ----------
const ShoppingTab = () => {
  const { data } = useQuery({ queryKey: ["shoppingList"], queryFn: getShoppingList });
  const list = data?.data?.data || [];
  return (
    <div className="bg-[var(--card-bg)] rounded-lg p-3 text-sm text-[var(--text-color)] space-y-1">
      {list.length === 0 && <p className="text-[#ababab]">Nothing is low. Set a low-stock level on ingredients to use this list.</p>}
      {list.map((i) => (
        <p key={i._id} className="flex justify-between gap-2 border-b border-[var(--border-color)] py-1">
          <span>{i.name} <span className="text-xs text-[#ababab]">{i.supplier?.name || "no supplier"}</span></span>
          <span>buy {qty(i.suggestedQty, i.unit)} · about {rupees(i.estimatedPaise)}</span>
        </p>
      ))}
      {list.length > 0 && <p className="text-right font-semibold pt-2">About {rupees(list.reduce((s, i) => s + i.estimatedPaise, 0))}</p>}
    </div>
  );
};

const HistoryTab = () => {
  const { data } = useQuery({ queryKey: ["movements"], queryFn: () => getMovements({ limit: 500 }) });
  const list = data?.data?.data || [];
  const csv = () => {
    const rows = [["When", "Ingredient", "Type", "Qty", "Unit", "Balance", "Order/PO", "Reason/note", "By"], ...list.map((m) => [
      new Date(m.createdAt).toISOString(), m.ingredient?.name, m.type, m.qty, m.ingredient?.unit, m.balanceAfter, m.orderNo || "", [m.reason, m.note].filter(Boolean).join(" "), m.by?.name || "",
    ])];
    const cell = (v) => {
      const s = String(v ?? "");
      const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s; // no spreadsheet formulas, keep negative numbers
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "stock-history.csv" }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-2">
      <button className={secondary} onClick={csv} disabled={!list.length}>Download CSV</button>
      <div className="overflow-x-auto bg-[var(--card-bg)] rounded-lg">
        <table className="w-full text-sm text-[var(--text-color)]">
          <thead className="text-left text-[#ababab]"><tr><th className="p-2">When</th><th className="p-2">Ingredient</th><th className="p-2">What</th><th className="p-2">Change</th><th className="p-2">After</th><th className="p-2">Note</th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m._id} className="border-t border-[var(--border-color)]">
                <td className="p-2 whitespace-nowrap">{formatDateAndTime(m.createdAt)}</td>
                <td className="p-2">{m.ingredient?.name}</td>
                <td className="p-2">{m.type}{m.reason ? ` (${m.reason})` : ""}</td>
                <td className={`p-2 ${m.qty < 0 ? "text-red-500" : "text-green-600"}`}>{m.qty > 0 ? "+" : ""}{qty(m.qty, m.ingredient?.unit)}</td>
                <td className="p-2">{qty(m.balanceAfter, m.ingredient?.unit)}</td>
                <td className="p-2 text-xs text-[#ababab]">{[m.orderNo, m.note, m.by?.name].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------- Usage: what came in, what the dishes used, what was wasted, what is left ----------
const UsageTab = () => {
  const [range, setRange] = useState({ from: today(), to: today() });
  const { data, isLoading, error } = useQuery({ queryKey: ["stockUsage", range], queryFn: () => getStockUsage(range), enabled: range.from <= range.to });
  const rows = data?.data?.data || [];
  const Line = ({ label, value, tone = "" }) => (
    <div className="flex justify-between"><span className="text-[#ababab]">{label}</span><span className={`font-semibold ${tone}`}>{value}</span></div>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-[#ababab]">From<input type="date" className={inputClass} value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">To<input type="date" className={inputClass} value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        <button className={secondary} onClick={() => setRange({ from: today(), to: today() })}>Today</button>
      </div>
      {isLoading && <p className="text-[var(--text-color)]">Loading…</p>}
      {error && <p className="text-red-500">{errorText(error, "Could not load usage")}</p>}
      {!isLoading && !error && rows.length === 0 && <p className="text-[#ababab]">No stock moved in these days.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((r) => {
          const u = r.ingredient.unit;
          const dishes = Object.entries(r.dishes || {}).sort((a, b) => b[1].qty - a[1].qty);
          return (
            <article key={r.ingredient._id} className="bg-[var(--card-bg)] rounded-lg p-4 text-sm text-[var(--text-color)] space-y-1">
              <h3 className="text-base font-semibold mb-1">{r.ingredient.name}</h3>
              <Line label="At the start" value={qty(r.start, u)} />
              <Line label="+ Added (bought)" value={qty(r.bought, u)} tone="text-green-600" />
              <Line label="− Used in dishes" value={`${qty(r.used, u)} · ${rupees(r.usedCostPaise)}`} />
              {dishes.length > 0 && (
                <ul className="pl-3 border-l-2 border-[var(--border-color)] my-1">
                  {dishes.map(([name, d]) => (
                    <li key={name} className="flex justify-between text-xs"><span>{d.quantity} × {name}</span><span>{qty(d.qty, u)}</span></li>
                  ))}
                </ul>
              )}
              <Line label="− Wasted" value={`${qty(r.wasted, u)} · ${rupees(r.wastedCostPaise)}`} tone={r.wasted ? "text-red-500" : ""} />
              {r.corrected !== 0 && <Line label="± Counts and fixes" value={qty(r.corrected, u)} />}
              <div className="border-t border-[var(--border-color)] pt-1"><Line label="Left" value={qty(r.left, u)} tone={r.left < 0 ? "text-red-500" : ""} /></div>
            </article>
          );
        })}
      </div>
      <p className="text-xs text-[#ababab]">Dishes take stock out when their bill is paid, using each dish&apos;s recipe. Dishes without a recipe use nothing.</p>
    </div>
  );
};

const Inventory = () => {
  const user = useSelector((state) => state.user);
  const canManage = can(user, "inventory.manage");
  const tabs = [
    ["stock", "Stock", true],
    ["usage", "Usage", canManage],
    ["recipes", "Recipes & cost", canManage],
    ["po", "Purchase orders", canManage],
    ["suppliers", "Suppliers", canManage],
    ["shopping", "Shopping list", canManage],
    ["history", "History", canManage],
  ].filter((t) => t[2]);
  const [tab, setTab] = useState("stock");

  useEffect(() => {
    document.title = "RestOS | Inventory";
  }, []);

  return (
    <div className="bg-[var(--main-bg)] min-h-screen px-2 sm:px-4 md:px-6 pb-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Inventory</h1>
      </div>
      <div className="flex flex-wrap gap-1 mb-4 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`py-2 px-4 rounded-md text-sm ${tab === key ? "bg-[var(--nav-bg)] text-[var(--text-color)] font-semibold" : "text-[#ababab]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "stock" && <StockTab canManage={canManage} />}
      {tab === "usage" && <UsageTab />}
      {tab === "recipes" && <RecipesTab />}
      {tab === "po" && <PurchaseOrdersTab />}
      {tab === "suppliers" && <SuppliersTab />}
      {tab === "shopping" && <ShoppingTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
};

export default Inventory;
