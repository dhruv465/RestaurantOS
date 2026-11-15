import React, { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { can } from "../utils";

// Server pushes "X changed" over Server-Sent Events; we refetch the matching queries.
const QUERIES_BY_EVENT = {
  order: [["orders"], ["tables"], ["dashboard"]],
  table: [["tables"], ["orders"], ["dashboard"]],
  menu: [["items"], ["categories"]],
  settings: [["settings"], ["price"]],
  kot: [["kots"], ["dashboard"]],
  reservation: [["reservations"], ["waitlist"]],
  request: [["tableRequests"]],
  delivery: [["deliveryBoard"], ["myDeliveries"], ["orders"]],
  inventory: [["ingredients"], ["movements"], ["shoppingList"], ["purchaseOrders"]],
};

const where = (e) => (e.tableNo ? `Table ${e.tableNo}` : `Order ${e.orderNo}`);
const ALERTS = {
  waiter: (e) => ({ text: `${where(e)} is calling a waiter. Go now.`, variant: "warning" }),
  bill: (e) => ({ text: `${where(e)} is asking for the bill.`, variant: "warning" }),
  preparing: (e) => ({ text: `Kitchen started ${e.tableNo ? `Table ${e.tableNo} · ` : ""}order ${e.orderNo}.`, variant: "info", brief: true }),
  ready: (e) => ({ text: `${where(e)} food is ready (order ${e.orderNo}). Pick it up now.`, variant: "success" }),
};
// Floor staff take orders and serve; the kitchen and riders don't need table calls.
const isFloor = (user) => can(user, "orders.manage") && user.role !== "Chef";

const chime = typeof Audio !== "undefined" ? new Audio("/notification-sound.mp3") : null;
const shout = (text, variant, brief) => {
  chime?.play().catch(() => {}); // browsers block sound until the user has clicked once on the page
  enqueueSnackbar(text, {
    variant,
    persist: !brief, // calls and ready food stay on screen until someone taps OK
    autoHideDuration: brief ? 6000 : undefined,
    action: (key) => React.createElement("button", { onClick: () => closeSnackbar(key), className: "px-2 font-semibold underline" }, "OK"),
  });
};

const useRealtime = (enabled) => {
  const queryClient = useQueryClient();
  const user = useSelector((state) => state.user);
  const userRef = useRef(user);
  userRef.current = user; // read inside the stream handler without reconnecting on every change

  useEffect(() => {
    if (!enabled) return;
    // EventSource reconnects by itself (server sends retry: 3000).
    const source = new EventSource(`${import.meta.env.VITE_BACKEND_URL}/api/events`, {
      withCredentials: true,
    });
    source.onmessage = (e) => {
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      (QUERIES_BY_EVENT[event.type] || []).forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      );
      const me = userRef.current;
      if (event.type === "order" && event.guest && isFloor(me)) shout("New table QR order waiting. Open Orders to accept it.", "info");
      const alert = event.type === "alert" && ALERTS[event.kind]?.(event);
      if (!alert || event.actorId === me._id) return;
      // Kitchen progress goes to the waiter who took the order; table calls and unowned orders go to all floor staff.
      if (event.waiterId ? event.waiterId === me._id : isFloor(me)) shout(alert.text, alert.variant, alert.brief);
      // Managers get a short heads-up for ready food, in case that waiter isn't looking at a screen.
      else if (event.kind === "ready" && isFloor(me) && can(me, "dashboard.view")) shout(alert.text, "success", true);
    };
    return () => source.close();
  }, [enabled, queryClient]);
};

export default useRealtime;
