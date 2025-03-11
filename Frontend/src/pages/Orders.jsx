import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query"; // Import useMutation for updating order status
import BottomNav from "../components/ui/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/ui/BackButton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders } from "../https/index";
import { FaKitchenSet } from "react-icons/fa6";

const Orders = () => {
  const mutation = useMutation((orderId) => {
    return updateOrderStatus(orderId); // Function to update order status
  });

  const [status, setStatus] = useState("all");

  useEffect(() => {
    document.title = "RestOS | Orders";
  }, []);

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

  // Filter orders based on the selected status
  const handleUpdateOrderStatus = (orderId) => {
    mutation.mutate(orderId); // Call mutation to update order status
  };

  const filteredOrders = resData?.data.data.filter(
    (order) =>
      status === "all" ||
      (status === "progress" &&
        order.orderStatus.toLowerCase() === "in progress") ||
      (status === "ready" && order.orderStatus.toLowerCase() === "ready") ||
      (status === "completed" &&
        order.orderStatus.toLowerCase() === "completed")
  );

  console.log(filteredOrders); // Debugging line to check filtered orders

  return (
    <section className="bg-[var(--main-bg)] min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 lg:px-10 py-4 gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
            Orders
          </h1>
        </div>
        <div className="flex items-center justify-center flex-wrap gap-2 md:gap-4">
          <button
            onClick={() => setStatus("all")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "all" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            All
          </button>
          <button
            onClick={() => setStatus("progress")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "progress" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            In Progress
          </button>
          <button
            onClick={() => setStatus("ready")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "ready" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            Ready
          </button>
          <button
            onClick={() => setStatus("completed")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "ready" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            Completed
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 px-4 md:px-8 lg:px-16 py-4 overflow-y-auto  scrollbar-hide">
        {/* h-[calc(100vh-5rem-7rem)] */}
        {filteredOrders?.length > 0 ? (
          filteredOrders.map((order) => {
            return (
              <OrderCard
                key={order._id}
                order={order}
                onUpdateStatus={handleUpdateOrderStatus} // Pass update handler to OrderCard
              />
            );
          })
        ) : (
          <div className="col-span-1 sm:col-span-2 xl:col-span-3 flex justify-center items-center">
            <div className="mx-auto max-w-md text-center bg-[var(--main-bg)] overflow-hidden">
              {/* Card Header */}
              <div className="p-6 pb-2">
                <div className="flex justify-center">
                  <div className="rounded-full bg-[var(--card-bg)] p-3">
                    <FaKitchenSet className="h-10 w-10 text-[var(--text-color)] opacity-50" />
                  </div>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-[var(--text-color)]">
                  No Orders Available
                </h2>
              </div>

              {/* Card Content */}
              <div className="px-6 py-4">
                <p className="text-[var(--text-color)] opacity-50">
                  You don&apos;t have any {status !== "all" ? status : ""}{" "}
                  orders yet.
                  {status === "all"
                    ? " Start processing sales to see orders here."
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </section>
  );
};

export default Orders;
