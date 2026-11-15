import React from "react";
import { FaCheckDouble, FaCheckCircle } from "react-icons/fa"; // Import FaCheckCircle
import { formatDateAndTime, getAvatarName } from "../../utils/index";

const OrderCard = ({ order, onTakePayment, actions = [], onAction }) => {
  // console.log(order);

  const cardClass =
    order.orderStatus === "Completed" || order.orderStatus === "Cancelled"
      ? "opacity-70" // closed orders stay readable, just dimmed
      : "";

  return (
    <div
      className={`w-full bg-[var(--card-bg)] p-4 rounded-lg shadow-lg mb-4 ${cardClass} border border-[var(--border-color)]`}
    >
      <div className="flex items-center gap-4">
        <button className="bg-amber-400 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-full">
          {getAvatarName(order.customerDetails.name)}
        </button>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-[var(--text-color)] text-base md:text-lg font-semibold tracking-wide">
              {order.customerDetails.name}
            </h1>
            <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80 mb-2">
              #{order.orderNo || Math.floor(new Date(order.orderDate).getTime())} / {order.type || "Dine-in"}
            </p>
            <div className="text-sm text-[var(--text-color)] flex flex-wrap gap-1">
              {order.table && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  Table No → {order.table?.tableNo}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                {order.paymentStatus || (order.paymentMethod ? "Paid" : "Unpaid")}
              </span>
              {order.scheduledFor && (
                <span className="inline-flex items-center rounded-full border border-[#F6b100] px-2.5 py-0.5 text-xs font-semibold">
                  {order.kitchenHeld ? "Scheduled" : "For"} {formatDateAndTime(order.scheduledFor)}
                </span>
              )}
              {order.delivery?.status && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  Delivery: {order.delivery.status}{order.delivery.riderName ? ` · ${order.delivery.riderName}` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {order.orderStatus === "Ready" ? (
              <div className="flex items-center gap-1 rounded-full bg-gray-200 text-green-600 bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-semibold">
                <FaCheckDouble className="inline mr-2" />
                {order.orderStatus}
              </div>
            ) : order.orderStatus === "Completed" ? ( // New condition for "Completed"
              <div className="flex items-center gap-1 rounded-full bg-gray-300 text-gray-600 px-2.5 py-0.5 text-xs font-semibold">
                <FaCheckCircle className="inline mr-2" />{" "}
                {/* Use FaCheckCircle */}
                {order.orderStatus}
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {order.orderStatus}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between text-[var(--text-color)] mt-4 gap-2 opacity-80">
        <p>{formatDateAndTime(order.createdAt)}</p>
        <p>{order.items.length} Items</p>
      </div>
      <hr className="text-[var(--border-color)] mt-4 border-t-1 w-full" />

      <div className="flex items-center justify-between mt-4 mb-2 ">
        <h1 className="text-[var(--text-color)] text-lg md:text-xl font-semibold">
          Total
        </h1>
        <p className="text-[var(--text-color)] text-base md:text-lg font-semibold">
          ₹{order.bills.grandTotal.toFixed(2)}
        </p>
      </div>
      {order.refundedPaise > 0 && (
        <p className="text-xs text-red-500 mt-2">Refunded ₹{(order.refundedPaise / 100).toFixed(2)}</p>
      )}
      {order.orderStatus === "Cancelled" && (
        <p className="text-xs text-red-500 mt-2">Cancelled: {order.cancel?.reason}</p>
      )}
      {actions.length > 0 && (
        <div className="flex gap-3 mt-2 text-sm">
          {actions.map((a) => (
            <button key={a.mode} onClick={() => onAction(a.mode)} className={`underline ${a.mode === "cancel" ? "text-red-500" : "text-[var(--text-color)]"}`}>
              {a.label}
            </button>
          ))}
        </div>
      )}
      {onTakePayment && order.paymentStatus !== "Paid" && !["Completed", "Cancelled"].includes(order.orderStatus) && (
        <button
          onClick={onTakePayment}
          className="w-full mt-2 py-2 rounded-lg bg-[#F6b100] text-white font-semibold hover:bg-[#F6b100]/90"
        >
          Take payment
        </button>
      )}
    </div>
  );
};

export default OrderCard;
