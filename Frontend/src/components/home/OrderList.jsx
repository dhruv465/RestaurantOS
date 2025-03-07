import React from "react";
import { FaCheckDouble, FaCircle, FaLongArrowAltRight } from "react-icons/fa";
import { getAvatarName } from "../../utils";

const OrderList = ({ order }) => {
  return (
    <div className="flex items-center gap-4 md:gap-6 mb-4 p-4 border-b border-[var(--border-color)]">
      <button className="bg-yellow-500 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-lg">
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
        <div className="flex items-center gap-2">
          <h1 className="text-yellow-500 text-sm md:text-base font-semibold border border-yellow-500 rounded-lg p-1">
            Table No{" "}
            <FaLongArrowAltRight className="text-[var(--text-color)] ml-1 inline content-center opacity-50" />{" "}
            {order.table.tableNo}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
        {order.orderStatus === "Ready" ? (
              <>
                <p className="bg-gray-200 text-green-600 bg-[var(--success-bg)] px-2 rounded-lg py-1 text-sm md:text-base">
                  <FaCheckDouble className="inline mr-2" />
                  {order.orderStatus}
                </p>
                
              </>
            ) : (
              <>
                <p className="bg-gray-200 text-yellow-600 bg-[var(--success-bg)] px-2 rounded-lg py-1 text-sm md:text-base">
                  <FaCircle className="inline mr-2" />
                  {order.orderStatus}
                </p>
              
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default OrderList;
