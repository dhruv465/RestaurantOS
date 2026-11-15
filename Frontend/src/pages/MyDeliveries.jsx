import React, { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getMyDeliveries, setDeliveryStatus } from "../https";

const rupees = (p) => `₹${((p || 0) / 100).toFixed(2)}`;

// Phone-first list for riders: big buttons, address with a maps link, how much cash to collect.
const MyDeliveries = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["myDeliveries"], queryFn: getMyDeliveries, refetchInterval: 60000 });
  const list = data?.data?.data || [];
  const status = useMutation({
    mutationFn: setDeliveryStatus,
    onSuccess: () => {
      enqueueSnackbar("Updated", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["myDeliveries"] });
    },
    onError: (e) => {
      enqueueSnackbar(e.response?.data?.message || "Could not update", { variant: "error" });
      queryClient.invalidateQueries({ queryKey: ["myDeliveries"] });
    },
  });
  useEffect(() => {
    document.title = "RestOS | My deliveries";
  }, []);

  const active = list.filter((o) => ["Assigned", "Out"].includes(o.delivery.status));
  const done = list.filter((o) => !["Assigned", "Out"].includes(o.delivery.status));

  return (
    <div className="bg-[var(--main-bg)] px-4 pb-8 text-[var(--text-color)]">
      <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold pt-5 pb-1">My deliveries</h1>
      <p className="text-sm text-[var(--muted)] mb-4">
        {active.length === 0 ? "New deliveries show up here when they are given to you." : `${active.length} to deliver · collect ${rupees(active.reduce((s, o) => s + Math.max(0, (o.bills?.totalPaise || 0) - (o.paidPaise || 0)), 0))} cash in total`}
      </p>
      {isLoading && <p>Loading…</p>}
      {!isLoading && active.length === 0 && <p className="text-[#ababab]">Nothing to deliver right now.</p>}
      <div className="space-y-3">
        {active.map((o) => {
          const due = (o.bills?.totalPaise || 0) - (o.paidPaise || 0);
          return (
            <article key={o._id} className="bg-[var(--card-bg)] rounded-xl p-4 space-y-2">
              <p className="text-lg font-semibold">#{o.orderNo} · {o.customerDetails?.name}</p>
              <a className="block underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.delivery.address)}`} target="_blank" rel="noreferrer">
                {o.delivery.address}
              </a>
              <a className="block underline" href={`tel:${o.customerDetails?.phone}`}>Call {o.customerDetails?.phone}</a>
              {o.delivery.note && <p className="text-[#F6b100]">Note: {o.delivery.note}</p>}
              <p className="text-sm text-[#ababab]">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
              <p className={`text-lg font-bold ${due > 0 ? "text-red-500" : "text-green-500"}`}>{due > 0 ? `Collect ${rupees(due)} cash` : "Already paid"}</p>
              {o.delivery.status === "Assigned" ? (
                <button disabled={status.isPending} onClick={() => status.mutate({ orderId: o._id, from: "Assigned", to: "Out" })} className="w-full py-4 rounded-lg bg-[#F6b100] text-white text-lg font-semibold disabled:opacity-60">
                  I have the food, leaving now
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={status.isPending} onClick={() => status.mutate({ orderId: o._id, from: "Out", to: "Delivered" })} className="py-4 rounded-lg bg-green-600 text-white text-lg font-semibold disabled:opacity-60">
                    Delivered
                  </button>
                  <button
                    disabled={status.isPending}
                    onClick={() => {
                      const reason = window.prompt("What went wrong?");
                      if (reason) status.mutate({ orderId: o._id, from: "Out", to: "Failed", reason });
                    }}
                    className="py-4 rounded-lg bg-[var(--nav-bg)] text-lg font-semibold"
                  >
                    Could not deliver
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {done.length > 0 && (
        <>
          <h2 className="font-semibold mt-6 mb-2">Finished today</h2>
          <ul className="text-sm space-y-1">
            {done.map((o) => (
              <li key={o._id}>#{o.orderNo} · {o.delivery.status}{o.delivery.failReason ? ` (${o.delivery.failReason})` : ""}</li>
            ))}
          </ul>
        </>
      )}
      </div>
    </div>
  );
};

export default MyDeliveries;
