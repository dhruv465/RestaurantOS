import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { createModifierGroup, deleteModifierGroup, getModifierGroups, updateModifierGroup } from "../../https";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const EMPTY = { name: "", minSelect: 0, maxSelect: 1, options: [{ name: "", price: "" }] };

// Edit form keeps prices in rupees; the API stores paise.
const toForm = (g) => ({ ...g, options: g.options.map((o) => ({ name: o.name, price: String(o.pricePaise / 100) })) });
const toApi = (f) => ({
  name: f.name,
  minSelect: Number(f.minSelect) || 0,
  maxSelect: Number(f.maxSelect) || 1,
  options: f.options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), pricePaise: Math.round(Number(o.price || 0) * 100) })),
});

const GroupForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial);
  const setOption = (i, key, value) =>
    setForm({ ...form, options: form.options.map((o, j) => (j === i ? { ...o, [key]: value } : o)) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(toApi(form));
      }}
      className="bg-[var(--card-bg)] rounded-lg p-4 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="text-xs text-[#ababab]">
          Group name (e.g. Size, Extras)
          <input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="text-xs text-[#ababab]">
          Min choices (1 = required)
          <input type="number" min="0" className={inputClass} value={form.minSelect} onChange={(e) => setForm({ ...form, minSelect: e.target.value })} />
        </label>
        <label className="text-xs text-[#ababab]">
          Max choices
          <input type="number" min="1" className={inputClass} value={form.maxSelect} onChange={(e) => setForm({ ...form, maxSelect: e.target.value })} />
        </label>
      </div>
      {form.options.map((o, i) => (
        <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
          <input aria-label="Option name" placeholder="Option (e.g. Full)" className={inputClass} value={o.name} onChange={(e) => setOption(i, "name", e.target.value)} />
          <input aria-label="Extra price in rupees" type="number" min="0" placeholder="+₹" className={inputClass} value={o.price} onChange={(e) => setOption(i, "price", e.target.value)} />
          <button type="button" aria-label="Remove option" className="text-red-500 px-2" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}>
            ✕
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 justify-between">
        <button type="button" className="text-sm underline text-[var(--text-color)]" onClick={() => setForm({ ...form, options: [...form.options, { name: "", price: "" }] })}>
          + Add option
        </button>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-[var(--text-color)]">
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving} className="bg-[#F6b100] text-white rounded-lg px-4 py-2 disabled:opacity-60">
            Save group
          </button>
        </div>
      </div>
    </form>
  );
};

const ModifierSettings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["modifier-groups"], queryFn: getModifierGroups });
  const groups = data?.data?.data || [];
  const [editing, setEditing] = useState(null); // group id, or "new"

  const done = (message) => () => {
    enqueueSnackbar(message, { variant: "success" });
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["modifier-groups"] });
  };
  const onError = (error) => enqueueSnackbar(error.response?.data?.message || "Could not save", { variant: "error" });
  const save = useMutation({
    mutationFn: ({ id, body }) => (id ? updateModifierGroup(id, body) : createModifierGroup(body)),
    onSuccess: done("Add-on group saved"),
    onError,
  });
  const remove = useMutation({ mutationFn: deleteModifierGroup, onSuccess: done("Add-on group deleted"), onError });

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-[#ababab]">Add-on groups are attached to items in the item editor (Dashboard → menu).</p>
      {editing === "new" ? (
        <GroupForm initial={EMPTY} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(body) => save.mutate({ body })} />
      ) : (
        <button onClick={() => setEditing("new")} className="bg-[#F6b100] text-white rounded-lg px-4 py-2">
          New add-on group
        </button>
      )}
      {isLoading && <p className="text-[var(--text-color)]">Loading…</p>}
      {groups.map((g) =>
        editing === g._id ? (
          <GroupForm key={g._id} initial={toForm(g)} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(body) => save.mutate({ id: g._id, body })} />
        ) : (
          <div key={g._id} className="bg-[var(--card-bg)] rounded-lg p-4 flex justify-between gap-3">
            <div className="text-[var(--text-color)]">
              <p className="font-semibold">
                {g.name}{" "}
                <span className="text-xs text-[#ababab]">
                  {g.minSelect > 0 ? "required" : "optional"}, up to {g.maxSelect}
                </span>
              </p>
              <p className="text-sm">{g.options.map((o) => `${o.name}${o.pricePaise ? ` +₹${o.pricePaise / 100}` : ""}`).join(" · ")}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button className="underline text-[var(--text-color)]" onClick={() => setEditing(g._id)}>
                Edit
              </button>
              <button
                className="underline text-red-500"
                onClick={() => window.confirm(`Delete "${g.name}"? It is removed from every item.`) && remove.mutate(g._id)}
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ModifierSettings;
