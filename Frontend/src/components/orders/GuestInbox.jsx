import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { BellRing, Receipt } from "lucide-react";
import { acceptGuestOrder, declineGuestOrder, getTableRequests, resolveTableRequest } from "../../https";

// Guest QR orders waiting for staff, plus "call server" / "bill" taps. Shown on the Orders page.
const GuestInbox = ({ orders, canManage }) => {
  const queryClient = useQueryClient();
  const pending = orders.filter((o) => o.acceptance === "Pending");
  const { data } = useQuery({ queryKey: ["tableRequests"], queryFn: getTableRequests });
  const requests = data?.data?.data || [];

  const done = (message) => () => {
    enqueueSnackbar(message, { variant: "success" });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["tableRequests"] });
  };
  const onError = (e) => {
    enqueueSnackbar(e.response?.data?.message || "Could not update", { variant: "error" });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };
  const accept = useMutation({ mutationFn: acceptGuestOrder, onSuccess: done("Sent to the kitchen"), onError });
  const decline = useMutation({ mutationFn: declineGuestOrder, onSuccess: done("Declined"), onError });
  const resolve = useMutation({ mutationFn: resolveTableRequest, onSuccess: done("Done"), onError });
  const busy = accept.isPending || decline.isPending;

  if (pending.length === 0 && requests.length === 0) return null;

  return (
    <section className="mx-4 md:mx-8 lg:mx-10 mb-4 p-4 rounded-lg bg-[var(--card-bg)] border-2 border-[#F6b100]" aria-live="polite">
      {requests.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {requests.map((r) => (
            <button
              key={r._id}
              disabled={!canManage}
              onClick={() => resolve.mutate(r._id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F6b100] text-white text-sm font-semibold"
              title="Tap when handled"
            >
              {r.type === "bill" ? <Receipt size={16} /> : <BellRing size={16} />}
              Table {r.tableNo}: {r.type === "bill" ? "wants the bill" : "calling a server"}
            </button>
          ))}
        </div>
      )}
      {pending.map((o) => (
        <div key={o._id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-t border-[var(--border-color)] first:border-t-0">
          <div className="text-[var(--text-color)] text-sm">
            <p className="font-semibold">
              {o.channel === "Kiosk" ? `Kiosk order ${o.orderNo} (accept once paid at the counter)` : `Table ${o.table?.tableNo ?? "?"} · QR order ${o.orderNo}`} · {o.customerDetails?.name}
            </p>
            <p className="text-[#ababab]">
              {o.items.map((i) => `${i.quantity}× ${i.name}${i.modifiers?.length ? ` (${i.modifiers.map((m) => m.name).join(", ")})` : ""}`).join(", ")}
            </p>
            {o.items.some((i) => i.instructions) && (
              <p className="text-[#F6b100]">Notes: {o.items.filter((i) => i.instructions).map((i) => `${i.name}: ${i.instructions}`).join("; ")}</p>
            )}
            <p className="font-semibold">₹{o.bills.grandTotal.toFixed(2)}</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt("Reason shown to the guest (optional)", "") ?? null;
                  if (reason !== null) decline.mutate({ orderId: o._id, reason });
                }}
                className="px-4 py-2 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] text-sm font-semibold disabled:opacity-60"
              >
                Decline
              </button>
              <button
                disabled={busy}
                onClick={() => accept.mutate(o._id)}
                className="px-4 py-2 rounded-lg bg-[#F6b100] text-white text-sm font-semibold disabled:opacity-60"
              >
                Accept
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
};

export default GuestInbox;
