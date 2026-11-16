import React from "react";
import { useSelector } from "react-redux";
import { formatDate } from "../../utils";

// Who the order is for: the table, or takeaway. No guest names are kept.
const CustomerInfo = () => {
  const customerData = useSelector((state) => state.customer);
  const isDineIn = customerData.orderType === "Dine-in";
  const where = isDineIn ? `Table ${customerData.table?.tableNo || "not picked"}` : "Takeaway";

  return (
    <div className="px-4 py-3">
      <h1 className="text-lg text-[var(--text-color)] font-semibold">{where}</h1>
      <p className="text-xs text-[#ababab] mt-1">
        {customerData.orderId ? "Adding to the open order" : "New order"}
        {isDineIn && customerData.guests > 0 ? ` · ${customerData.guests} ${customerData.guests === 1 ? "guest" : "guests"}` : ""}
        {" · "}
        {formatDate(new Date())}
      </p>
    </div>
  );
};

export default CustomerInfo;
