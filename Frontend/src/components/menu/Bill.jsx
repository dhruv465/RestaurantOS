import React from "react";
import { getTotalPrice } from "../../redux/slices/CartSlice";
import { useSelector } from "react-redux";

const Bill = () => {
  const cartData = useSelector((state) => state.cart);

  const total = useSelector(getTotalPrice);
  const taxRate = 5.25;
  const tax = (total * taxRate) / 100;
  const grandTotal = total + tax;
  return (
    <div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">Items({cartData.length})</p>
        <h1 className="text-[var(--text-color)] text-md font-bold">₹{total.toFixed(2)}</h1>
      </div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">Tax(5.25%)</p>
        <h1 className="text-[var(--text-color)] text-md font-bold">₹{tax.toFixed(2)}</h1>
      </div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">Grand Total</p>
        <h1 className="text-[var(--text-color)] text-md font-bold">₹{grandTotal.toFixed(2)}</h1>
      </div>
      <div className="flex items-center gap-3 px-5 mt-4">
        <button className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200">
          Cash
        </button>
        <button className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200">
          Online
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 mt-4 mb-4">
        <button className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200">
          Print Receipt
        </button>
        <button className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200">
          Place Order
        </button>
      </div>
    </div>
  );
};

export default Bill;
