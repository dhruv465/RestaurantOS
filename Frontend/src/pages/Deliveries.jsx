import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import BackButton from "../components/ui/BackButton";
import { assignRider, getDeliveryBoard, getDeliveryZones, saveDeliveryZone, setDeliveryStatus } from "../https";
import { formatDateAndTime } from "../utils";

const inputClass = "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)]";
const primary = "px-3 py-2 rounded-lg text-sm font-semibold bg-[#F6b100] text-white disabled:opacity-60";
const secondary = "px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--nav-bg)] text-[var(--text-color)]";
const card = "bg-[var(--card-bg)] rounded-lg p-3 text-[var(--text-color)]";
const rupees = (p) => `₹${((p || 0) / 100).toFixed(2)}`;
const COLUMNS = [
  ["Waiting", "Needs a rider"],
  ["Assigned", "Rider assigned"],
  ["Out", "On the way"],
  ["Done", "Finished (12h)"],
];
const errorText = (e) => e.response?.data?.message || "Could not update";

const Board = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["deliveryBoard"], queryFn: getDeliveryBoard, refetchInterval: 60000 });
  const { orders = [], riders = [] } = data?.data?.data || {};
  const refresh = (msg) => () => {
    enqueueSnackbar(msg, { variant: "success" });
    queryClient.invalidateQueries({ queryKey: ["deliveryBoard"] });
  };
  const onError = (e) => {
    enqueueSnackbar(errorText(e), { variant: "error" });
    queryClient.invalidateQueries({ queryKey: ["deliveryBoard"] });
  };
  const assign = useMutation({ mutationFn: assignRider, onSuccess: refresh("Rider updated"), onError });
  const status = useMutation({ mutationFn: setDeliveryStatus, onSuccess: refresh("Updated"), onError });
  const column = (o) => (["Delivered", "Failed"].includes(o.delivery.status) ? "Done" : o.delivery.status);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {COLUMNS.map(([key, title]) => {
        const list = orders.filter((o) => column(o) === key);
        return (
          <section key={key} className="bg-[var(--nav-bg)] rounded-lg p-2 space-y-2">
            <h2 className="font-semibold text-[var(--text-color)] px-1">
              {title} ({list.length})
            </h2>
            {list.map((o) => {
              const due = (o.bills?.totalPaise || 0) - (o.paidPaise || 0);
              return (
                <article key={o._id} className={card}>
                  <p className="font-semibold">
                    #{o.orderNo} · {o.customerDetails?.name} · {o.customerDetails?.phone}
                  </p>
                  <p className="text-sm">{o.delivery.address}</p>
                  <p className="text-xs text-[#ababab]">
                    {o.delivery.zoneName} · {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </p>
                  {o.delivery.note && <p className="text-xs text-[#F6b100]">Note: {o.delivery.note}</p>}
                  {o.scheduledFor && <p className="text-xs">For {formatDateAndTime(o.scheduledFor)}{o.kitchenHeld && " (not in kitchen yet)"}</p>}
                  <p className="text-sm font-semibold">{due > 0 ? `Collect ${rupees(due)}` : "Paid"} · kitchen: {o.orderStatus}</p>
                  {o.delivery.status === "Failed" && <p className="text-xs text-red-500">Failed: {o.delivery.failReason}</p>}
                  {["Waiting", "Assigned"].includes(o.delivery.status) && (
                    <select
                      aria-label={`Rider for order ${o.orderNo}`}
                      className={`${inputClass} mt-2`}
                      value={o.delivery.rider || ""}
                      disabled={assign.isPending}
                      onChange={(e) => assign.mutate({ orderId: o._id, riderId: e.target.value || null })}
                    >
                      <option value="">No rider</option>
                      {riders.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
                    </select>
                  )}
                  {o.delivery.riderName && key !== "Waiting" && <p className="text-xs mt-1">Rider: {o.delivery.riderName}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {o.delivery.status === "Assigned" && (
                      <button className={primary} onClick={() => status.mutate({ orderId: o._id, from: "Assigned", to: "Out" })}>Left the restaurant</button>
                    )}
                    {o.delivery.status === "Out" && (
                      <>
                        <button className={primary} onClick={() => status.mutate({ orderId: o._id, from: "Out", to: "Delivered" })}>Delivered</button>
                        <button
                          className={secondary}
                          onClick={() => {
                            const reason = window.prompt("Why did the delivery fail?");
                            if (reason) status.mutate({ orderId: o._id, from: "Out", to: "Failed", reason });
                          }}
                        >
                          Failed
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
      {riders.length === 0 && <p className="text-sm text-[#ababab] md:col-span-4">No riders yet. Add staff with the Rider role in Settings → Staff.</p>}
    </div>
  );
};

const Zones = () => {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["deliveryZones", "all"], queryFn: () => getDeliveryZones({ all: 1 }) });
  const zones = data?.data?.data || [];
  const blank = { name: "", fee: "", min: "", eta: 30 };
  const [form, setForm] = useState(blank);
  const save = useMutation({
    mutationFn: saveDeliveryZone,
    onSuccess: () => {
      enqueueSnackbar("Zone saved", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["deliveryZones"] });
      setForm(blank);
    },
    onError: (e) => enqueueSnackbar(errorText(e), { variant: "error" }),
  });
  const toPaise = (r) => Math.round(Number(r || 0) * 100);

  return (
    <div className="space-y-3 max-w-3xl">
      <form
        className={`${card} grid grid-cols-2 md:grid-cols-5 gap-2 items-end`}
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ id: form.id, name: form.name, feePaise: toPaise(form.fee), minOrderPaise: toPaise(form.min), etaMinutes: Number(form.eta) || 0 });
        }}
      >
        <label className="text-xs text-[#ababab]">Zone name<input required className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">Fee (₹)<input type="number" min="0" step="0.01" className={inputClass} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">Minimum order (₹)<input type="number" min="0" step="0.01" className={inputClass} value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></label>
        <label className="text-xs text-[#ababab]">Usual time (min)<input type="number" min="0" className={inputClass} value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /></label>
        <div className="flex gap-2">
          <button className={primary} disabled={save.isPending}>{form.id ? "Save" : "Add zone"}</button>
          {form.id && <button type="button" className={secondary} onClick={() => setForm(blank)}>Cancel</button>}
        </div>
      </form>
      <ul className={`${card} space-y-2 text-sm`}>
        {zones.map((z) => (
          <li key={z._id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border-color)] pb-2">
            <span className={z.active ? "" : "opacity-60"}>
              <span className="font-semibold">{z.name}</span> · fee {rupees(z.feePaise)} · minimum {rupees(z.minOrderPaise)} · ~{z.etaMinutes} min{!z.active && " · off"}
            </span>
            <span className="flex gap-2">
              <button className={secondary} onClick={() => setForm({ id: z._id, name: z.name, fee: z.feePaise / 100, min: z.minOrderPaise / 100, eta: z.etaMinutes })}>Edit</button>
              <button className={secondary} onClick={() => save.mutate({ id: z._id, active: !z.active })}>{z.active ? "Turn off" : "Turn on"}</button>
            </span>
          </li>
        ))}
        {zones.length === 0 && <li className="text-[#ababab]">No zones yet. Add one to start taking delivery orders.</li>}
      </ul>
    </div>
  );
};

const Deliveries = () => {
  const [tab, setTab] = useState("board");
  useEffect(() => {
    document.title = "RestOS | Deliveries";
  }, []);
  return (
    <div className="bg-[var(--main-bg)] min-h-screen px-2 sm:px-4 md:px-6 pb-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Deliveries</h1>
      </div>
      <div className="flex gap-1 mb-4 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg" role="tablist">
        {[["board", "Board"], ["zones", "Zones"]].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`py-2 px-4 rounded-md text-sm ${tab === key ? "bg-[var(--nav-bg)] text-[var(--text-color)] font-semibold" : "text-[#ababab]"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "board" ? <Board /> : <Zones />}
    </div>
  );
};

export default Deliveries;
