import React from "react";
import { Link } from "react-router-dom";
import OrderList from "./OrderList";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../../https";
import { FaKitchenSet } from "react-icons/fa6";

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

  // Every open order: dine-in, takeaway and delivery.
  const filteredOrders = resData?.data.data.filter((order) => !["Completed", "Cancelled"].includes(order.orderStatus));

  return (
    <div className="recent-orders px-4 md:px-8 mt-6">
      <div className="bg-[var(--card-bg)] w-full rounded-lg border border-[var(--border-color)]">
        <div className="flex justify-between items-center px-4 md:px-6 py-4">
          <h1 className="text-[var(--text-color)] text-lg md:text-xl font-semibold tracking-wide">
            Recent Orders
          </h1>
          <Link to="/orders" className="text-[var(--text-color)] text-sm md:text-base bg-[var(--card-bg)] px-3 md:px-4 py-1 rounded-lg border border-[var(--border-color)]">
            View all
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="mt-4 px-4 md:px-6">
          {filteredOrders?.length > 0 ? (
            // Home shows the latest few; the full list is on Orders.
            filteredOrders.slice(0, 6).map((order) => {
              return <OrderList key={order._id} order={order} />;
            })
          ) : (
            <div className="col-span-1 sm:col-span-2 xl:col-span-3 flex justify-center items-center">
              <div className="mx-auto max-w-md text-center bg-[var(--card-bg)] overflow-hidden">
                {/* Card Header */}
                <div className="p-6 pb-2">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-[var(--main-bg)] p-3">
                      <FaKitchenSet className="h-10 w-10 text-[var(--text-color)] opacity-50" />
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-[var(--text-color)]">
                    No Orders Available
                  </h2>
                </div>

                {/* Card Content */}
                <div className="px-6">
                  <p className="text-[var(--text-color)] opacity-50">
                    You don&apos;t have any orders yet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentOders;
