import React from "react";
import { FaCheckDouble, FaCircle } from "react-icons/fa";

const OrderList = () => {
  return (
    <div className="flex items-center gap-4 md:gap-6 mb-4 p-4 border-b border-[var(--border-color)]">
      <button className="bg-yellow-500 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-lg">
        DS
      </button>
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex flex-col items-start gap-1">
          <h1 className="text-[var(--text-color)] text-base md:text-lg font-semibold tracking-wide">
            Dhruv
          </h1>
          <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
            8 Items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-yellow-500 text-sm md:text-base font-semibold border border-yellow-500 rounded-lg p-1">
            Table No: 3
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="bg-gray-200 dark:bg-gray-600 text-green-600 text-sm md:text-base px-3 md:px-4 rounded-lg">
            <FaCheckDouble className="inline mr-2" />
            Ready
          </p>
          <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
            <FaCircle className="inline mr-2 text-green-600" />
            Ready to serve
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
