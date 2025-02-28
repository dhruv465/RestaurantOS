import React from "react";
import { popularDishes } from "../../constants/index.js";

const PopularDishes = () => {
  return (
    <div className="mt-6 pr-6 px-4">
        <div className="bg-[var(--card-bg)] w-full rounded-lg">

        <div className="flex justify-between items-center px-6 py-4">
          <h1 className="text-[var(--text-color)] text-lg font-semibold tracking-wide">
            Popular Dishes
          </h1>
          <button className="text-[var(--text-color)] text-sm md:text-base bg-[var(--card-bg)] px-3 md:px-4 py-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors">
            View All
          </button>
        </div>
        <div className="overflow-y-auto h-[680px] scrollbar-hide">
          {popularDishes.map((dish) => {
            return (
              <div
                key={dish.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-color)]"
              >
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-16 h-16 rounded-lg"
                />
                <div>
                  <h1 className="text-[var(--text-color)] text-lg font-semibold">
                    {dish.name}
                  </h1>
                  <p className="text-[var(--text-color)] text-sm">
                    <span className="text-[#ababab]">Orders: </span>
                    {dish.numberOfOrders} 
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PopularDishes;
