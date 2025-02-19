import React from "react";

const Bill = () => {
  return (
    <div>
      <div className="flex items-center justify-between px-4 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">Items(1)</p>
        <h1 className="text-[var(--text-color)] text-md font-bold">₹250</h1>
      </div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">Tax(5.25%)</p>
        <h1 className="text-[var(--text-color)] text-md font-bold">₹24</h1>
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
