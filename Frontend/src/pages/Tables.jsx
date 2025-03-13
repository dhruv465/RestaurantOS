import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import TableCard from "../components/tables/TableCard";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";
import { getTables, deleteTable } from "../https";
import { setCustomer } from "../redux/slices/customerSlice";
import { Plus } from "lucide-react";

const Tables = () => {
  useEffect(() => {
    document.title = "RestOS | Tables";
  }, []);

  const [status, setStatus] = useState("all");
  const dispatch = useDispatch();

  const {
    data: resData,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      return await getTables();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const handleDeleteTable = async (id) => {
    try {
      await deleteTable(id);
      enqueueSnackbar("Table deleted successfully!", { variant: "success" });
      refetch(); // Refetch tables after deletion
    } catch (error) {
      console.error("Error deleting table:", error);
      enqueueSnackbar("Failed to delete table", { variant: "error" });
    }
  };

  // Filter tables based on status
  const filteredTables =
    resData?.data.data.filter((table) => {
      return status === "all" || table.status === status;
    }) || [];

  // Map your table data to include shape based on capacity
  const tablesWithShape = filteredTables.map((table) => {
    // Determine shape based on capacity
    let shape = "square"; // default
    if (table.seats <= 2) {
      shape = "round";
    } else if (table.seats > 6) {
      shape = "rectangle";
    }
    return { ...table, shape };
  });

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
            Occupied
          </button>
          <button
            onClick={() => setStatus("Available")}
            className={`text-[var(--text-color)] text-sm md:text-base ${
              status === "Available" && "bg-[var(--card-bg)]"
            } rounded-lg px-3 md:px-5 py-1 md:py-2 font-semibold hover:bg-[var(--card-bg)] transition-colors duration-200`}
          >
            Available
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 sm:p-6 md:p-8">
        {tablesWithShape.map((table) => {
          return (
            <TableCard
              id={table._id}
              name={table.tableNo}
              status={table.status}
              initials={table?.currentOrder?.customerDetails?.name}
              seats={table.seats}
              key={table._id}
              currentOrder={table.currentOrder}
              shape={table.shape}
              onDelete={handleDeleteTable}
            />
          );
        })}
      </div>

      <BottomNav />
    </section>
  );
};

export default Tables;
