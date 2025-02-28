import React from "react";
import { IoSearch } from "react-icons/io5";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https";

const RecentOders = () => {
  const { data: resData, isError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      return await getOrders();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  // Filter out orders where the table status is "Available"
  const filteredOrders = resData?.data.data.filter(order => order.table.status !== "Available");

  return (
    <div className="recent-orders px-4 md:px-8 mt-6">
      <div className="bg-[var(--card-bg)] w-full rounded-lg">
        <div className="flex justify-between items-center px-4 md:px-6 py-4">
          <h1 className="text-[var(--text-color)] text-lg md:text-xl font-semibold tracking-wide">
            Recent Orders
          </h1>
          <button className="text-[var(--text-color)] text-sm md:text-base bg-[var(--card-bg)] px-3 md:px-4 py-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors">
            View All
          </button>
        </div>
        <div className="flex items-center gap-2 md:gap-4 bg-[var(--card-bg)] rounded-[15px] px-4 md:px-6 py-4 mx-4 md:mx-6 border border-[var(--border-color)]">
          <IoSearch className="text-[var(--text-color)] text-xl opacity-80" />
          <input
            type="text"
            placeholder="Search"
            className="bg-[var(--card-bg)] w-full text-[var(--text-color)] placeholder:text-[var(--text-color)]/70 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all"
          />
        </div>

        {/* Recent Orders */}
        <div className="mt-4 px-4 md:px-6 overflow-y-scroll h-[300px] scrollbar-hide">
          {filteredOrders?.length > 0 ? (
            filteredOrders.map((order) => {
              return <OrderList key={order._id} order={order} />;
            })
          ) : (
            <p className="col-span-3">No orders available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentOders;
