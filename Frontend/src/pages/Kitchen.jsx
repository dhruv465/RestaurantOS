import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { Flame, Printer } from "lucide-react";
import { kotHtml, printHtml } from "../utils/print";
import { getKots, getSettings, setKotPriority, updateKotStatus } from "../https";
import BackButton from "../components/ui/BackButton";

const COLUMNS = ["New", "Preparing", "Ready"];
const NEXT = { New: "Preparing", Preparing: "Ready", Ready: "Served" };
const ACTION = { New: "Start", Preparing: "Ready", Ready: "Picked up" };
// Warn after the ticket's longest item prep time, or this default when items have none.
const LATE_MINUTES = 15;
const STATION_KEY = "kds.station";

// A ticket that only cancels food needs one tap to acknowledge, not cooking.
const isCancelOnly = (t) => t.items.every((i) => i.quantity <= 0); // cancels and note changes
const nextStatus = (t) => (isCancelOnly(t) ? "Served" : NEXT[t.status]);

const readStation = () => {
  try {
    return localStorage.getItem(STATION_KEY) || "";
  } catch {
    return "";
  }
};

const minutesSince = (date, now) => Math.floor((now - new Date(date)) / 60000);

const TicketCard = ({ ticket, now, onMove, onPriority, busy }) => {
  const age = minutesSince(ticket.createdAt, now);
  const late = ticket.status !== "Ready" && age >= (ticket.prepMinutes || LATE_MINUTES);
  const where = ticket.orderType === "Dine-in" || !ticket.orderType ? `Table ${ticket.tableNo ?? "?"}` : ticket.orderType;

  return (
    <div
      className={`bg-[var(--card-bg)] rounded-lg p-3 border-2 ${
        late ? "border-red-500" : ticket.isPriority ? "border-[#F6b100]" : "border-[var(--border-color)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[var(--text-color)] font-bold text-lg">#{ticket.ticketNo}</p>
          <p className="text-xs text-[#ababab]">
            {where} · {ticket.orderNo}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${late ? "text-red-500" : "text-[var(--text-color)]"}`}>{age} min</p>
          <button
            onClick={() => onPriority(ticket)}
            aria-label={ticket.isPriority ? "Remove rush" : "Mark as rush"}
            aria-pressed={ticket.isPriority}
            className={`mt-1 p-1 rounded ${ticket.isPriority ? "text-[#F6b100]" : "text-[#ababab]"}`}
          >
            <Flame size={18} />
          </button>
          <button
            onClick={() => printHtml(`KOT ${ticket.ticketNo}`, kotHtml(ticket))}
            aria-label="Print ticket"
            className="mt-1 ml-1 p-1 rounded text-[#ababab]"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      <ul className="my-3 space-y-1">
        {ticket.items.map((item, i) => (
          <li key={i} className={item.quantity < 0 ? "text-red-500 line-through" : "text-[var(--text-color)]"}>
            <span className="font-bold">
              {item.quantity < 0 ? `Cancel ${-item.quantity}` : item.quantity === 0 ? "Note change:" : `${item.quantity}×`}
            </span>{" "}
            {item.name}
            {item.modifiers?.length > 0 && <p className="text-xs text-[#ababab]">{item.modifiers.join(", ")}</p>}
            {item.instructions && <p className="text-xs text-[#F6b100] no-underline">Note: {item.instructions}</p>}
          </li>
        ))}
      </ul>

      <button
        disabled={busy}
        onClick={() => onMove(ticket)}
        className="w-full py-2 rounded-lg bg-[#F6b100] text-white font-semibold hover:bg-[#F6b100]/90 disabled:opacity-60"
      >
        {isCancelOnly(ticket) ? "Got it" : ACTION[ticket.status]}
      </button>
    </div>
  );
};

const Kitchen = () => {
  const queryClient = useQueryClient();
  const [station, setStation] = useState(readStation);
  const [now, setNow] = useState(Date.now());
  const seen = useRef(null);
  const chime = useRef(new Audio("/notification-sound.mp3"));

  const { data: settingsRes } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const stations = settingsRes?.data?.data?.stations || [];
  const { data, isLoading } = useQuery({
    queryKey: ["kots", station],
    queryFn: () => getKots({ station: station || undefined }),
  });
  const tickets = data?.data?.data || [];

  useEffect(() => {
    document.title = "RestOS | Kitchen";
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Chime when a ticket we haven't seen arrives (not on first load or a station switch).
  useEffect(() => {
    seen.current = null;
  }, [station]);
  useEffect(() => {
    const list = data?.data?.data;
    if (!list) return;
    if (seen.current && list.some((t) => !seen.current.has(t._id))) {
      chime.current.play().catch(() => {});
    }
    seen.current = new Set(list.map((t) => t._id));
  }, [data]);

  const pickStation = (name) => {
    setStation(name);
    try {
      localStorage.setItem(STATION_KEY, name);
    } catch {
      // per-screen convenience only
    }
  };

  const onError = (error) => {
    enqueueSnackbar(error.response?.data?.message || "Could not update ticket", { variant: "error" });
    queryClient.invalidateQueries({ queryKey: ["kots"] });
  };
  const moveMutation = useMutation({
    mutationFn: (ticket) => updateKotStatus({ id: ticket._id, from: ticket.status, to: nextStatus(ticket) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kots"] }),
    onError,
  });
  const priorityMutation = useMutation({
    mutationFn: (ticket) => setKotPriority({ id: ticket._id, isPriority: !ticket.isPriority }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kots"] }),
    onError,
  });

  return (
    <div className="bg-[var(--main-bg)] min-h-screen px-2 sm:px-4 md:px-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Kitchen</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {["", ...stations].map((name) => (
            <button
              key={name || "all"}
              onClick={() => pickStation(name)}
              aria-pressed={station === name}
              className={`px-3 py-1.5 rounded-full text-sm ${
                station === name ? "bg-[#F6b100] text-white" : "bg-[var(--card-bg)] text-[var(--text-color)]"
              }`}
            >
              {name || "All stations"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-[var(--text-color)]">Loading tickets…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((column) => {
            const list = tickets.filter((t) => t.status === column);
            return (
              <section key={column} className="bg-[var(--nav-bg)] rounded-lg p-3 min-h-[200px]">
                <h2 className="text-[var(--text-color)] font-semibold mb-3">
                  {column} <span className="text-[#ababab]">({list.length})</span>
                </h2>
                <div className="space-y-3">
                  {list.map((ticket) => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      now={now}
                      busy={moveMutation.isPending}
                      onMove={moveMutation.mutate}
                      onPriority={priorityMutation.mutate}
                    />
                  ))}
                  {list.length === 0 && <p className="text-sm text-[#ababab]">Nothing here.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Kitchen;
