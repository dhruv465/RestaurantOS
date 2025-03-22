import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import TableCard from "../components/tables/TableCard";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";
import { deleteTable, getTables } from "../https";

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
        {tablesWithShape.length === 0 ? (
          <div className="col-span-full  flex items-center justify-center text-gray-500">
            <div className="mx-auto max-w-md text-center bg-[var(--main-bg)] overflow-hidden">
              {/* Card Header */}
              <div className="p-6 pb-2">
                <div className="flex justify-center">
                  <div className="rounded-full bg-[var(--card-bg)] p-3">
                    <svg
                      width="50px"
                      height="50px"
                      viewBox="0 0 128 128"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink"
                      aria-hidden="true"
                      role="img"
                      class="iconify iconify--noto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <path
                        d="M68.35 83.58l.54 15.79c.01 1.19.79 1.98 2.61 1.98c1.82 0 2.62-.8 2.62-1.97l.59-17.03l-6.36 1.23z"
                        fill="#9e5737"
                      />
                      <path
                        fill="#9e5737"
                        d="M73.76 23.16H67.4l-.06 27.56l6.46-1.12z"
                      />
                      <path
                        d="M70.3 5.23c-.96.14-38.72 5.7-38.72 5.7c-1.55.3-2.81 1.71-2.82 3.52l.02.78l4.19 4.94s11.95 9.65 12.84 9.48S77.32 7.36 77.32 7.36c-.58-.7-1.17-1.02-3.69-1.67c-1.19-.31-2.37-.6-3.33-.46z"
                        fill="#f0aa6b"
                      />
                      <path
                        d="M33.24 37.41l-.43-20.57c.01-1.79-.5-2.54-1.53-3.07c-1.12-.63-2.51.18-2.5 1.47l.08 19.89c0 .61-.08 2.28 1.18 2.69l2.58.74v18.55l6.36-1.24V37.41h-5.74z"
                        fill="#9e5737"
                      />
                      <path
                        d="M60.03 77.09v-6.05c-2.42.3-3.58-.08-3.58-.08L30.08 58.45v3.32c0 1.45 0 2.38 2.12 3.41l.34.17l1.33 42.93c.01 1.19.91 1.98 2.72 1.98c1.82 0 2.71-.8 2.71-1.97l1.04-30.83l14.4 7.11l-.36-7.74c1.76.86 3.71.51 5.65.26z"
                        fill="#9e5737"
                      />
                      <path
                        d="M100.83 64.13L58.9 72.22c-.93.21-1.6 1.04-1.6 1.99v.96c0 1.04.77 1.86 1.74 2.01c-1.64.05-3.34-.27-4.82-1.01l1.48 45.85c.01 1.19.86 1.98 2.67 1.98c1.82 0 2.69-.8 2.69-1.97l1.25-36.93l30.12-5.8l1.06 33.82c.01 1.19.89 1.98 2.7 1.98c1.82 0 2.66-.8 2.66-1.97l1.51-43.73h.01l.74-.14c1.22-.23 2.1-1.3 2.1-2.54v-3.87l-2.38 1.28z"
                        fill="#ba793e"
                      />
                      <path
                        d="M102.07 64.01l-41.83 8.01c-1.9.36-3.87.1-5.61-.77L30.81 59.43c-1.12-.56-.92-2.39.73-2.63l42.09-7.16c1.67-.32 3.43-.36 4.96.39l23.84 11.33c1.21.6.97 2.39-.36 2.65z"
                        fill="#f0aa6b"
                      />
                      <path
                        d="M75.18 7.27l-40.36 5.99c-1.75.42-2 1.81-2 2.79l.08 21.06c0 1.28 1.26 1.67 2.52 1.43l40.54-6.51c.96-.19 1.71-1.34 1.72-2.83L77.6 8.14c-.01-1.28-1.2-1.04-2.42-.87z"
                        fill="#ba793e"
                      />
                      <path
                        fill="#9e5737"
                        d="M62.3 76.68l29.87-5.72l.1 2.84l-27.43 5.25l-.74 5.7l-1.67.33z"
                      />
                      <path
                        d="M54.22 76.16L32.5 65.31s2.59 2.46 5 6.03c2.14 3.18 2.84 6.12 2.84 6.12l1.4.69v-5.38L54.29 79l-.07-2.84z"
                        fill="#77381f"
                      />
                      <path
                        d="M68.38 83.93l.19 5.73s.97-1.76 2.57-2.98c1.55-1.19 3.48-1.46 3.48-1.46l.09-2.51l-6.33 1.22z"
                        fill="#77381f"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-[var(--text-color)]">
                  No Tables are Listed
                </h2>
              </div>
            </div>
          </div>
        ) : (
          tablesWithShape.map((table) => {
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
          })
        )}
      </div>

      <BottomNav />
    </section>
  );
};

export default Tables;
