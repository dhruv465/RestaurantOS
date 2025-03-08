import React from "react";
import { FaCheckDouble, FaCircle, FaLongArrowAltRight } from "react-icons/fa";
import { getAvatarName } from "../../utils";

const OrderList = ({ order }) => {
  return (
    <div className="flex items-center gap-4 md:gap-6 mb-4 p-4 border-b border-[var(--border-color)]">
      <button className="bg-amber-400 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-full items-center justify-center">
        {getAvatarName(order.customerDetails.name)}
      </button>
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[var(--text-color)] text-base md:text-lg font-semibold tracking-wide">
            {order.customerDetails.name}
          </h1>
          <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
            {order.items.length} Items
          </p>
        </div>

        <div className="text-sm text-[var(--text-color)] ">
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
            Table No → {order.table.tableNo}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {order.orderStatus === "Ready" ? (
            <>
              <div className="flex items-center gap-1 rounded-full bg-gray-200 text-green-600 bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-semibold">
                <FaCheckDouble className="inline mr-2" />
                {order.orderStatus}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {order.orderStatus}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;
