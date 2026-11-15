import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import Modal from "../ui/Modal";
import { newId } from "../../utils";
import { cancelOrder, getTables, mergeOrder, moveOrder, refundOrder } from "../../https";

const inputClass =
  "w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";

const sumPaise = (list, method) => (list || []).filter((p) => !method || p.method === method).reduce((s, p) => s + p.amountPaise, 0);

// mode: "cancel" | "move" | "merge" | "refund". openOrders = other orders that can be merged in.
const OrderActionsModal = ({ order, mode, openOrders, onClose }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [choice, setChoice] = useState("");
  const refundablePaise = sumPaise(order.payments) - sumPaise(order.refunds);
  const lastMethod = order.payments?.[order.payments.length - 1]?.method || "Cash";
  const [refundMethod, setRefundMethod] = useState(lastMethod);
  const [refundInput, setRefundInput] = useState((refundablePaise / 100).toFixed(2));
  const [requestId] = useState(() => newId());
  const { data: tablesRes } = useQuery({ queryKey: ["tables"], queryFn: getTables, enabled: mode === "move" });
  const freeTables = (tablesRes?.data?.data || []).filter((t) => t.status !== "Booked");

  const action = useMutation({
    mutationFn: () =>
      mode === "refund"
        ? refundOrder({
            orderId: order._id,
            requestId,
            method: refundMethod,
            amountPaise: Math.round(Number(refundInput) * 100),
            reason,
          })
        : mode === "cancel"
        ? cancelOrder({ orderId: order._id, reason })
        : mode === "move"
          ? moveOrder({ orderId: order._id, tableId: choice })
          : mergeOrder({ orderId: order._id, fromOrderId: choice }),
    onSuccess: (res) => {
      enqueueSnackbar(res.data.message, { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      onClose();
    },
    onError: (error) => enqueueSnackbar(error.response?.data?.message || "Could not do that", { variant: "error" }),
  });

  const title = { refund: "Refund", cancel: "Cancel order", move: "Move to another table", merge: "Merge another order into this one" }[mode];
  const ready = mode === "cancel" || mode === "refund" ? reason.trim() : choice;

  return (
    <Modal isOpen onClose={onClose} title={`${title} #${order.orderNo || ""}`}>
      <div className="space-y-4">
        {mode === "cancel" && (
          <>
            <p className="text-sm text-[#ababab]">The kitchen gets a cancel ticket and the table is freed.</p>
            <input autoFocus className={inputClass} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </>
        )}
        {mode === "refund" && (
          <>
            <p className="text-sm text-[#ababab]">
              Up to ₹{(refundablePaise / 100).toFixed(2)} can be refunded. Online refunds go back through Razorpay; others are
              paid back at the till and recorded here.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="Refund amount in rupees"
                type="number"
                min="0"
                className={inputClass}
                value={refundInput}
                onChange={(e) => setRefundInput(e.target.value)}
              />
              <select aria-label="Refund method" className={inputClass} value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                {["Cash", "Card", "UPI", "Online"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <input className={inputClass} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
          </>
        )}
        {mode === "move" && (
          <select aria-label="Free table" className={inputClass} value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Pick a free table</option>
            {freeTables.map((t) => (
              <option key={t._id} value={t._id}>
                Table {t.tableNo}
                {t.seats ? ` (${t.seats} seats)` : ""}
              </option>
            ))}
          </select>
        )}
        {mode === "merge" && (
          <>
            <p className="text-sm text-[#ababab]">Its items move here, its kitchen tickets follow, and it is closed.</p>
            <select aria-label="Order to merge" className={inputClass} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">Pick an order</option>
              {openOrders.map((o) => (
                <option key={o._id} value={o._id}>
                  #{o.orderNo} · {o.customerDetails?.name}
                  {o.table?.tableNo ? ` · Table ${o.table.tableNo}` : ` · ${o.type || ""}`} · ₹{o.bills?.grandTotal?.toFixed(2)}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          disabled={!ready || action.isPending}
          onClick={() => action.mutate()}
          className={`w-full py-3 rounded-lg text-white font-semibold disabled:opacity-60 ${mode === "cancel" ? "bg-red-600" : "bg-[#F6b100]"}`}
        >
          {title}
        </button>
      </div>
    </Modal>
  );
};

export default OrderActionsModal;
