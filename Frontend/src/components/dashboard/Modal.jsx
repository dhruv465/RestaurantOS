import React, { useState, useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import { motion } from "framer-motion";
import { addTable } from "../../https";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getTables } from "../../https";
import { enqueueSnackbar } from "notistack";

// Add a table. Its floor can be an existing one or a new name: a floor exists once it has a table.
const Modal = ({ isOpen, onClose, defaultArea = "Main", newFloor = false, onAdded }) => {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["tables"], queryFn: getTables });
  const floors = [...new Set((data?.data?.data || []).map((t) => t.area || "Main"))];
  const [tableData, setTableData] = useState({
    tableNo: "",
    seats: "",
    area: newFloor ? "" : defaultArea,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTableData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    tableMutation.mutate(tableData);
  };

  const handleCloseModal = () => {
    onClose();
  };

  const tableMutation = useMutation({
    mutationFn: (reqData) => addTable(reqData),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      onAdded?.(res.data.data);
      onClose();
      enqueueSnackbar(res.data.message, { variant: "success" });
    },
    onError: (error) => {
      enqueueSnackbar(error.response?.data?.message || "Could not add the table", { variant: "error" });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-[var(--card-bg)] p-4 rounded-md shadow-md w-96 max-w-[calc(100vw-2rem)]"
      >
        <div className="flex justify-between item-center mb-4">
          <h2 className="text-lg font-bold text-[var(--text-color)]">
            {newFloor ? "Add a floor" : "Add Table"}
          </h2>

          <button
            onClick={handleCloseModal}
            className="text-[var(--text-color)]"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="table-floor" className="block text-[#ababab] text-sm font-medium">
              {newFloor ? "New floor name (e.g. First floor, Terrace)" : "Floor"}
            </label>
            <input
              id="table-floor"
              name="area"
              required
              maxLength={40}
              autoFocus={newFloor}
              list={newFloor ? undefined : "table-floors"}
              value={tableData.area}
              onChange={handleInputChange}
              className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
            />
            <datalist id="table-floors">
              {floors.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            {newFloor && <p className="text-xs text-[#ababab]">Add the first table on this floor. You can move other tables here with Arrange tables.</p>}
          </div>
          <div className="flex flex-col gap-4">
            <label className="block text-[#ababab] text-sm font-medium">
              Table Number
            </label>
            <div>
              <input
                type="number"
                value={tableData.tableNo}
                onChange={handleInputChange}
                name="tableNo"
                required
                min={1}
                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                id=""
              />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <label className="block text-[#ababab] text-sm font-medium">
              Number of Seats
            </label>
            <div>
              <input
                type="number"
                value={tableData.seats}
                onChange={handleInputChange}
                name="seats"
                required
                min={1}
                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                id=""
              />
            </div>
          </div>

          <button disabled={tableMutation.isPending} className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-4 hover:bg-[#F6b100]/90 transition-colors duration-200 disabled:opacity-60">
            Add Table
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Modal;
