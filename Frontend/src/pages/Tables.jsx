import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import TableCard from "../components/tables/TableCard";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";
import { tables } from "../constants";
import { getTables } from "../https";
import { keepPreviousData, useQuery} from "@tanstack/react-query"

const Tables = () => {
  const [status, setStatus] = useState("all");

  const { data: resData, isError } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      return await getTables();
      },
      placeholderData: keepPreviousData,
  });

  if(isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });

  }

  console.log(resData);

  return (
    <section className="bg-[var(--main-bg)] min-h-screen overflow-auto pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 lg:px-10 py-4 gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
            Tables
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
            onClick={() => setStatus("Booked")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "Booked" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            Booked
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 sm:p-6 md:p-8">
        {resData?.data.data.map((table) => {
          return (
            <TableCard
              key={table._id}
              id={table._id}
              name={table.tableNo}
              status={table.status}
              initials={table?.currentOrders?.customerDetails.name}
              seats={table.seats}
              currentOrders={table.currentOrders}
            />
          );
        })}
      </div>

      <BottomNav />
    </section>
  );
};

export default Tables;
