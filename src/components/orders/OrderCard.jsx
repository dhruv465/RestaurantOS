import React from "react";
import { FaCheckDouble, FaCircle } from "react-icons/fa";

const OrderCard = () => {
  return (
    <div className="w-full bg-[var(--card-bg)] p-4 rounded-lg shadow-lg mb-4">
      <div className="flex items-center gap-4">
        <button className="bg-yellow-500 p-3 md:p-4 text-lg md:text-xl font-bold text-white rounded-lg">
          DS
        </button>
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col items-start gap-1">
            <h1 className="text-[var(--text-color)] text-base md:text-lg font-semibold tracking-wide">
              Dhruv
            </h1>
            <p className="text-[var(--text-color)] text-xs md:text-sm opacity-80">
              #101/ Dine in
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="bg-gray-200 text-green-600 bg-[var(--success-bg)] px-2 rounded-lg py-1 text-sm md:text-base">
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
      <div className="flex flex-col md:flex-row items-center justify-between text-[var(--text-color)] mt-4 gap-2 opacity-80">
        <p>Jan 18, 2024 12:30 PM</p>
        <p>8 Items</p>
      </div>
      <hr className="text-[var(--border-color)] mt-4 border-t-1 w-full" />

      <div className="flex items-center justify-between mt-4 mb-2">
        <h1 className="text-[var(--text-color)] text-lg md:text-xl font-semibold">
          Total
        </h1>
        <p className="text-[var(--text-color)] text-base md:text-lg font-semibold">
          2500.00
        </p>
      </div>
    </div>
  );
};

export default OrderCard;
