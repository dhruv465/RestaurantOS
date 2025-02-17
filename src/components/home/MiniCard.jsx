import React from "react";

const MiniCard = ({ title, icon, number, footerNum }) => {
  return (
    <div className="bg-[var(--card-bg)] py-3 px-4 md:py-5 md:px-5 rounded-lg w-full md:w-[50%] mb-4">
      <div className="flex items-start justify-between">
        <h1 className="text-[var(--text-color)] text-sm md:text-lg font-semibold tracking-wide">
          {title}
        </h1>
        <button
          className={`${title === "Total Earnings" ? "bg-[#02ca3a]" : "bg-[#f6b100]"} p-2 md:p-3 rounded-lg text-[#f5f5f5] text-xl md:text-2xl`}
        >
          {icon}
        </button>
      </div>
      <div>
        <h1 className="text-[var(--text-color)] text-2xl md:text-4xl font-bold mt-3 md:mt-5">{number}</h1>
        <h1 className="text-[var(--text-color)] text-xs md:text-sm mt-1 md:mt-2">
          <span className="text-[#02ca3a]">{footerNum}%</span> than yesterday
        </h1>
      </div>
    </div>
  );
};

export default MiniCard;
