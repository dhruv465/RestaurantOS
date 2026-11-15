import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";
import { addToWaitlist, createReservation, getReservations, getWaitlist, updateReservation, updateWaitlist } from "../https";
import { setCustomer } from "../redux/slices/customerSlice";
import { removeAllItems } from "../redux/slices/cartSlice";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";
const today = () => new Date().toLocaleDateString("en-CA");
const time = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const EMPTY_RES = { name: "", phone: "", partySize: 2, time: "19:30", notes: "" };
const EMPTY_WAIT = { name: "", phone: "", partySize: 2, quotedMinutes: 15 };

const Reservations = () => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [date, setDate] = useState(today);
  const [resForm, setResForm] = useState(EMPTY_RES);
  const [waitForm, setWaitForm] = useState(EMPTY_WAIT);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.title = "RestOS | Reservations";
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const { data: resData } = useQuery({ queryKey: ["reservations", date], queryFn: () => getReservations(date) });
  const { data: waitData } = useQuery({ queryKey: ["waitlist"], queryFn: getWaitlist });
  const reservations = resData?.data?.data || [];
  const waitlist = waitData?.data?.data || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["reservations"] });
    queryClient.invalidateQueries({ queryKey: ["waitlist"] });
  };
  const onError = (e) => enqueueSnackbar(e.response?.data?.message || "Could not save", { variant: "error" });
  const save = useMutation({ mutationFn: (fn) => fn(), onSuccess: refresh, onError });

  // Seating starts a dine-in order for the guest; the Tables page then asks for a free table.
  const seat = (guest, update) =>
    save.mutate(() => update(), {
      onSuccess: () => {
        dispatch(removeAllItems());
        dispatch(setCustomer({ orderId: "", table: null, customerName: guest.name, customerPhone: guest.phone || "", guests: guest.partySize, orderType: "Dine-in" }));
        navigate("/tables");
      },
    });

  return (
    <section className="bg-[var(--main-bg)] min-h-screen pb-24 px-2 sm:px-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">Reservations</h1>
        </div>
        <input type="date" aria-label="Day" className={`${inputClass} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const { time: t, ...rest } = resForm;
              save.mutate(() => createReservation({ ...rest, partySize: Number(rest.partySize), at: new Date(`${date}T${t}`).toISOString() }), {
                onSuccess: () => {
                  setResForm(EMPTY_RES);
                  enqueueSnackbar("Reservation added", { variant: "success" });
                },
              });
            }}
            className="bg-[var(--card-bg)] rounded-lg p-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end"
          >
            <input required aria-label="Guest name" placeholder="Name" className={`${inputClass} col-span-2`} value={resForm.name} onChange={(e) => setResForm({ ...resForm, name: e.target.value })} />
            <input aria-label="Phone" placeholder="Phone" type="tel" className={inputClass} value={resForm.phone} onChange={(e) => setResForm({ ...resForm, phone: e.target.value })} />
            <input aria-label="Party size" type="number" min="1" className={inputClass} value={resForm.partySize} onChange={(e) => setResForm({ ...resForm, partySize: e.target.value })} />
            <input aria-label="Time" type="time" required className={inputClass} value={resForm.time} onChange={(e) => setResForm({ ...resForm, time: e.target.value })} />
            <button type="submit" className="bg-[#F6b100] text-white rounded-lg px-4 py-2">Book</button>
            <input aria-label="Notes" placeholder="Notes (birthday, high chair…)" className={`${inputClass} col-span-2 md:col-span-6`} value={resForm.notes} onChange={(e) => setResForm({ ...resForm, notes: e.target.value })} />
          </form>

          {reservations.length === 0 && <p className="text-[#ababab]">No reservations for this day.</p>}
          {reservations.map((r) => {
            const late = r.status === "Booked" && new Date(r.at).getTime() < now - 15 * 60000;
            return (
              <div key={r._id} className={`bg-[var(--card-bg)] rounded-lg p-4 flex flex-wrap justify-between gap-3 border ${late ? "border-red-500" : "border-transparent"}`}>
                <div className="text-[var(--text-color)]">
                  <p className="font-semibold">
                    {time(r.at)} · {r.name} · {r.partySize} {r.partySize === 1 ? "guest" : "guests"}
                  </p>
                  <p className="text-sm text-[#ababab]">
                    {r.phone}
                    {r.notes && ` · ${r.notes}`} · <span className={late ? "text-red-500" : ""}>{late ? "Late" : r.status}</span>
                  </p>
                </div>
                {r.status === "Booked" && (
                  <div className="flex gap-3 text-sm items-center">
                    <button className="bg-[#F6b100] text-white rounded-lg px-3 py-1" onClick={() => seat(r, () => updateReservation(r._id, { status: "Seated" }))}>
                      Seat
                    </button>
                    <button className="underline text-[var(--text-color)]" onClick={() => save.mutate(() => updateReservation(r._id, { status: "No-show" }))}>
                      No-show
                    </button>
                    <button className="underline text-red-500" onClick={() => save.mutate(() => updateReservation(r._id, { status: "Cancelled" }))}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <aside className="space-y-3">
          <h2 className="text-[var(--text-color)] font-semibold">Waitlist ({waitlist.length})</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(() => addToWaitlist({ ...waitForm, partySize: Number(waitForm.partySize), quotedMinutes: Number(waitForm.quotedMinutes) }), {
                onSuccess: () => setWaitForm(EMPTY_WAIT),
              });
            }}
            className="bg-[var(--card-bg)] rounded-lg p-4 grid grid-cols-2 gap-2"
          >
            <input required aria-label="Walk-in name" placeholder="Name" className={`${inputClass} col-span-2`} value={waitForm.name} onChange={(e) => setWaitForm({ ...waitForm, name: e.target.value })} />
            <input aria-label="Walk-in phone" placeholder="Phone" type="tel" className={`${inputClass} col-span-2`} value={waitForm.phone} onChange={(e) => setWaitForm({ ...waitForm, phone: e.target.value })} />
            <label className="text-xs text-[#ababab]">
              Guests
              <input type="number" min="1" className={inputClass} value={waitForm.partySize} onChange={(e) => setWaitForm({ ...waitForm, partySize: e.target.value })} />
            </label>
            <label className="text-xs text-[#ababab]">
              Quoted wait (min)
              <input type="number" min="0" className={inputClass} value={waitForm.quotedMinutes} onChange={(e) => setWaitForm({ ...waitForm, quotedMinutes: e.target.value })} />
            </label>
            <button type="submit" className="col-span-2 bg-[#F6b100] text-white rounded-lg px-4 py-2">Add to waitlist</button>
          </form>
          {waitlist.map((w) => {
            const waited = Math.floor((now - new Date(w.createdAt)) / 60000);
            const over = w.quotedMinutes && waited > w.quotedMinutes;
            return (
              <div key={w._id} className="bg-[var(--card-bg)] rounded-lg p-3 flex justify-between gap-2">
                <div className="text-[var(--text-color)]">
                  <p className="font-semibold">
                    {w.name} · {w.partySize}
                  </p>
                  <p className={`text-xs ${over ? "text-red-500" : "text-[#ababab]"}`}>
                    waiting {waited} min{w.quotedMinutes ? ` (quoted ${w.quotedMinutes})` : ""}
                  </p>
                </div>
                <div className="flex gap-2 text-sm items-center">
                  <button className="bg-[#F6b100] text-white rounded-lg px-3 py-1" onClick={() => seat(w, () => updateWaitlist(w._id, { status: "Seated" }))}>
                    Seat
                  </button>
                  <button className="underline text-[var(--text-color)]" onClick={() => save.mutate(() => updateWaitlist(w._id, { status: "Left" }))}>
                    Left
                  </button>
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </section>
  );
};

export default Reservations;
