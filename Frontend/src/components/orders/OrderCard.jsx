import React from "react";
import { FaCheckDouble, FaCircle, FaLongArrowAltRight } from "react-icons/fa";
import { formatDateAndTime, getAvatarName } from "../../utils/index";

const OrderCard = ({ key, order }) => {
  console.log(order);
  return (
    <div className="w-full bg-[var(--card-bg)] p-4 rounded-lg shadow-lg mb-4">
      <div className="flex items-center gap-4">
        <button className="bg-yellow-500 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-lg">
          {getAvatarName(order.customerDetails.name)}
        </button>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-[var(--text-color)] text-base md:text-lg font-semibold tracking-wide">
              {order.customerDetails.name}
            </h1>
            <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
              #{Math.floor(new Date(order.orderDate).getTime())}/ Dine in
            </p>
            <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
             Table <FaLongArrowAltRight className="text-[#ababab] ml-1 inline content-center"/> {order.table.tableNo}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {order.orderStatus === "Ready" ? (
              <>
                <p className="bg-gray-200 text-green-600 bg-[var(--success-bg)] px-2 rounded-lg py-1 text-sm md:text-base">
                  <FaCheckDouble className="inline mr-2" />
                  {order.orderStatus}
                </p>
                <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
                  <FaCircle className="inline mr-2 text-green-600" />
                  Ready to serve
                </p>
              </>
            ) : (
              <>
                <p className="bg-gray-200 text-yellow-600 bg-[var(--success-bg)] px-2 rounded-lg py-1 text-sm md:text-base">
                  <FaCircle className="inline mr-2" />
                  {order.orderStatus}
                </p>
                <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
                  <FaCircle className="inline mr-2 text-yellow-600" />
                  Preparing your order
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between text-[var(--text-color)] mt-4 gap-2 opacity-80">
        <p>{formatDateAndTime(order.createdAt)}</p>
        <p>{order.items.length} Items</p>
      </div>
      <hr className="text-[var(--border-color)] mt-4 border-t-1 w-full" />

      <div className="flex items-center justify-between mt-4 mb-2">
        <h1 className="text-[var(--text-color)] text-lg md:text-xl font-semibold">
          Total
        </h1>
        <p className="text-[var(--text-color)] text-base md:text-lg font-semibold">
          ₹{order.bills.grandTotal.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default OrderCard;
