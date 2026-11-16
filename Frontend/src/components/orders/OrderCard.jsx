import React from "react";
import { formatDateAndTime } from "../../utils/index";

// Plain words for where the order is: what the staff needs to do next.
export const STATUS = {
  "In Progress": ["In the kitchen", "bg-amber-100 text-amber-800"],
  Ready: ["Ready to serve", "bg-green-100 text-green-800"],
  Completed: ["Done", "bg-gray-200 text-gray-700"],
  Cancelled: ["Cancelled", "bg-red-100 text-red-700"],
};
const ago = (date) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date)) / 60000));
  return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : formatDateAndTime(date);
};

const OrderCard = ({ order, onTakePayment, actions = [], onAction }) => {
  const closed = ["Completed", "Cancelled"].includes(order.orderStatus);
  const [statusText, statusClass] = STATUS[order.orderStatus] || [order.orderStatus, "bg-gray-200 text-gray-700"];
  const paid = order.paymentStatus === "Paid";
  const where = order.table ? `Table ${order.table.tableNo}` : order.type || "Takeaway";

  return (
    <div className={`w-full bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--border-color)] ${closed ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[var(--text-color)] text-xl font-bold">{where}</h2>
          <p className="text-sm text-[#ababab] truncate">
            {order.customerDetails?.name || "Guest"} · #{String(order.orderNo || "").split("-").pop()} · {ago(order.createdAt)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusText}</span>
      </div>

      <div className="flex flex-wrap gap-1 mt-2 text-xs">
        {order.scheduledFor && (
          <span className="rounded-full border border-[#F6b100] px-2 py-0.5 text-[var(--text-color)]">
            {order.kitchenHeld ? "Starts" : "For"} {formatDateAndTime(order.scheduledFor)}
          </span>
        )}
        {order.orderStatus === "Cancelled" && <span className="text-red-500">Reason: {order.cancel?.reason}</span>}
        {order.refundedPaise > 0 && <span className="text-red-500">Refunded ₹{(order.refundedPaise / 100).toFixed(2)}</span>}
      </div>

      <div className="flex items-baseline justify-between mt-3 text-[var(--text-color)]">
        <span className="text-sm">{order.items.length} {order.items.length === 1 ? "item" : "items"} · {paid ? "Paid" : "Not paid"}</span>
        <span className="text-lg font-semibold">₹{order.bills.grandTotal.toFixed(2)}</span>
      </div>

      {onTakePayment && !paid && !closed && (
        <button onClick={onTakePayment} className="w-full mt-3 py-2.5 rounded-lg bg-[#F6b100] text-white font-semibold hover:bg-[#F6b100]/90">
          Take payment
        </button>
      )}
      {actions.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-[#ababab] select-none">More options</summary>
          <div className="flex flex-wrap gap-2 mt-2">
            {actions.map((a) => (
              <button
                key={a.mode}
                onClick={() => onAction(a.mode)}
                className={`px-3 py-1.5 rounded-lg border ${a.mode === "cancel" ? "border-red-300 text-red-600" : "border-[var(--border-color)] text-[var(--text-color)]"}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default OrderCard;
