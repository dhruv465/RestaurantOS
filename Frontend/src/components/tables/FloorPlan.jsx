import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import Modal from "../ui/Modal";
import { saveTableLayout, updateTable } from "../../https";
import { useOpenTable } from "./TableCard";

const COLORS = {
  Available: "bg-green-500",
  Booked: "bg-red-500",
  Reserved: "bg-amber-500",
  Cleaning: "bg-sky-500",
};
// Tables never placed yet get a tidy grid until someone arranges them.
const fallbackSpot = (i) => ({ posX: 10 + (i % 6) * 16, posY: 12 + Math.floor(i / 6) * 22 });
const minutesSince = (date, now) => (date ? Math.max(0, Math.floor((now - new Date(date)) / 60000)) : null);

// Room view of the tables. In edit mode, drag tables and save; otherwise tap a table to open it or change its status.
const FloorPlan = ({ tables, canEdit, canChangeStatus }) => {
  const queryClient = useQueryClient();
  const openTable = useOpenTable();
  const room = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({}); // id -> { posX, posY, area }
  const [picked, setPicked] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const spotOf = (t, i) => ({ ...(t.posX !== undefined && t.posX !== null ? { posX: t.posX, posY: t.posY } : fallbackSpot(i)), ...draft[t._id] });

  const save = useMutation({
    mutationFn: () => saveTableLayout(Object.entries(draft).map(([id, v]) => ({ id, ...v }))),
    onSuccess: () => {
      enqueueSnackbar("Floor plan saved", { variant: "success" });
      setDraft({});
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.message || "Could not save", { variant: "error" }),
  });
  const setStatus = useMutation({
    mutationFn: ({ table, status }) => updateTable({ tableId: table._id, status }),
    onSuccess: () => {
      setPicked(null);
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.message || "Could not change the table", { variant: "error" }),
  });

  const onDragEnd = (table, e) => {
    const box = room.current.getBoundingClientRect();
    const rect = e.target.closest("[data-table]").getBoundingClientRect();
    const posX = (((rect.left + rect.width / 2 - box.left) / box.width) * 100).toFixed(1);
    const posY = (((rect.top + rect.height / 2 - box.top) / box.height) * 100).toFixed(1);
    setDraft((d) => ({ ...d, [table._id]: { ...d[table._id], posX: Math.min(100, Math.max(0, +posX)), posY: Math.min(100, Math.max(0, +posY)) } }));
  };

  const onTap = (table) => {
    if (editing) {
      const area = window.prompt(`Area for table ${table.tableNo}`, draft[table._id]?.area || table.area || "Main");
      if (area && area.trim()) setDraft((d) => ({ ...d, [table._id]: { ...d[table._id], area: area.trim() } }));
      return;
    }
    if (table.status === "Booked" || !canChangeStatus) return openTable({ id: table._id, tableNo: table.tableNo, currentOrder: table.currentOrder });
    setPicked(table);
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-6">
      <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-[var(--text-color)]">
        {Object.entries(COLORS).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-sm ${color}`} aria-hidden="true" /> {status === "Booked" ? "Occupied" : status}
          </span>
        ))}
        {canEdit && (
          <div className="ml-auto flex gap-2">
            {editing && (
              <button
                onClick={() => {
                  setDraft({});
                  setEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)]"
              >
                Cancel
              </button>
            )}
            <button
              disabled={save.isPending}
              onClick={() => (editing ? (Object.keys(draft).length ? save.mutate() : setEditing(false)) : setEditing(true))}
              className="px-3 py-1.5 rounded-lg bg-[#F6b100] text-white font-semibold disabled:opacity-60"
            >
              {editing ? "Save floor plan" : "Arrange tables"}
            </button>
          </div>
        )}
      </div>
      {editing && <p className="text-xs text-[#ababab] mb-2">Drag tables into place. Tap a table to change its area.</p>}
      <div
        ref={room}
        className={`relative w-full aspect-[16/10] min-h-[320px] rounded-lg bg-[var(--card-bg)] border ${
          editing ? "border-dashed border-[#F6b100]" : "border-[var(--border-color)]"
        } overflow-hidden`}
      >
        {tables.map((t, i) => {
          const { posX, posY } = spotOf(t, i);
          const mins = minutesSince(t.status === "Booked" ? t.currentOrder?.createdAt : t.statusSince, now);
          return (
            <motion.button
              key={`${t._id}-${posX}-${posY}`}
              data-table
              drag={editing}
              dragMomentum={false}
              dragConstraints={room}
              onDragEnd={(e) => onDragEnd(t, e)}
              onTap={() => onTap(t)}
              aria-label={`Table ${t.tableNo}, ${t.status === "Booked" ? "occupied" : t.status.toLowerCase()}`}
              style={{ left: `${posX}%`, top: `${posY}%` }}
              className={`absolute -ml-10 -mt-8 w-20 h-16 rounded-lg text-white shadow-md flex flex-col items-center justify-center ${COLORS[t.status] || "bg-gray-500"} ${
                t.seats <= 2 ? "rounded-full" : ""
              } ${editing ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
            >
              <span className="font-bold">{t.tableNo}</span>
              <span className="text-[10px] leading-tight">
                {t.seats} seats{mins !== null && t.status !== "Available" ? ` · ${mins}m` : ""}
              </span>
            </motion.button>
          );
        })}
      </div>

      {picked && (
        <Modal isOpen onClose={() => setPicked(null)} title={`Table ${picked.tableNo}`}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openTable({ id: picked._id, tableNo: picked.tableNo, currentOrder: picked.currentOrder })}
              className="col-span-2 py-3 rounded-lg bg-[#F6b100] text-white font-semibold"
            >
              Start an order here
            </button>
            {["Available", "Reserved", "Cleaning"]
              .filter((s) => s !== picked.status)
              .map((s) => (
                <button
                  key={s}
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ table: picked, status: s })}
                  className="py-2 rounded-lg bg-[var(--nav-bg)] text-[var(--text-color)] font-semibold disabled:opacity-60"
                >
                  {s === "Available" ? "Mark free" : `Mark ${s.toLowerCase()}`}
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FloorPlan;
