import React, { useState } from "react";

import { useSelector } from "react-redux";
import { getAvatarName, formatDate } from "../../utils";
import { MapPin } from "lucide-react";
const CustomerInfo = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const customerData = useSelector((state) => state.customer);

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex flex-col items-start">
        <h1 className="text-md text-[var(--text-color)] font-medium tracking-wide">
          {customerData.customerName || "Customer Name"}
        </h1>
        <p className="text-xs text-[var(--text-color)] font-medium mt-1  text-ellipsis">
          #{customerData.orderId || "N/A"} / Dine in
        </p>
        <p className="flex items-center mt-2 bg-[var(--main-bg)] px-3 py-1.5 rounded-md">
          <MapPin className="h-4 w-4 mr-2 text-[var(--text-color)]" />
          <span className="font-medium text-[var(--text-color)]">
            Table: {customerData.table?.tableNo || "N/A"}
          </span>
        </p>
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">
          {" "}
          {formatDate(dateTime)}
        </p>
      </div>
      <button className="bg-[#f6b100] p-3 text-xl font-bold rounded-full text-[var(--text-color)]">
        {getAvatarName(customerData.customerName || "CN")}
      </button>
    </div>
  );
};

export default CustomerInfo;
