import React, { useState } from "react";
import BottomNav from "../components/ui/BottomNav";
import OrderCard from "../components/orders/OrderCard";
import BackButton from "../components/ui/BackButton";

const Orders = () => {
  const [status, setStatus] = useState("all");
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
              status === "completed" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            Completed
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 px-4 md:px-8 lg:px-16 py-4 overflow-y-auto h-[calc(100vh-5rem-7rem)] scrollbar-hide">
        <OrderCard />
        <OrderCard />
        <OrderCard />
        <OrderCard />
        <OrderCard />
        <OrderCard />
        <OrderCard />
      </div>
      <BottomNav />
    </section>
  );
};

export default Orders;
