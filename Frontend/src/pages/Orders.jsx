import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import OrderCard from "../components/orders/OrderCard";
import GuestInbox from "../components/orders/GuestInbox";
import BackButton from "../components/ui/BackButton";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { getOrders, releaseOrder } from "../https/index";
import { FaKitchenSet } from "react-icons/fa6";
import CheckoutModal from "../components/checkout/CheckoutModal";
import Invoice from "../components/invoice/Invoice";
import OrderActionsModal from "../components/orders/OrderActionsModal";
import { can } from "../utils";

const Orders = () => {
  const user = useSelector((state) => state.user);
  const [status, setStatus] = useState("open");
  const [checkoutId, setCheckoutId] = useState(null);
  const [paidOrder, setPaidOrder] = useState(null);
  const [acting, setActing] = useState(null); // { order, mode }
  const queryClient = useQueryClient();
  const release = useMutation({
    mutationFn: releaseOrder,
    onSuccess: () => {
      enqueueSnackbar("Sent to the kitchen", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => enqueueSnackbar(e.response?.data?.message || "Could not send", { variant: "error" }),
  });
  const isOpen = (o) => !["Completed", "Cancelled"].includes(o.orderStatus);
  const unpaid = (o) => !(o.paidPaise > 0) && o.paymentStatus !== "Paid";

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

  // Three simple views. Guest QR orders waiting for staff live in GuestInbox, not the main list.
  const VIEWS = [
    ["open", "Open", isOpen],
    ["ready", "Ready to serve", (o) => o.orderStatus === "Ready"],
    ["done", "Done", (o) => !isOpen(o)],
  ];
  const listed = (resData?.data.data || []).filter((o) => o.acceptance !== "Pending");
  const countOf = (test) => listed.filter(test).length;
  const filteredOrders = listed.filter(VIEWS.find(([v]) => v === status)[2]);

  return (
    <section className="bg-[var(--main-bg)]">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 lg:px-10 py-4 gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <h1 className="text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
            Orders
          </h1>
        </div>
        <div role="tablist" aria-label="Which orders" className="flex items-center gap-1 p-1 bg-[var(--card-bg)] rounded-lg">
          {VIEWS.map(([v, label, test]) => (
            <button
              key={v}
              role="tab"
              aria-selected={status === v}
              onClick={() => setStatus(v)}
              className={`px-3 md:px-4 py-1.5 rounded-md text-sm md:text-base font-semibold ${
                status === v ? "bg-[#F6b100] text-white" : "text-[var(--text-color)]"
              }`}
            >
              {label} <span className="opacity-80">({countOf(test)})</span>
            </button>
          ))}
        </div>
      </div>
      <GuestInbox orders={resData?.data.data || []} canManage={can(user, "orders.manage")} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 px-4 md:px-8 lg:px-10 py-4">
        {filteredOrders?.length > 0 ? (
          filteredOrders.map((order) => {
            return (
              <OrderCard
                key={order._id}
                order={order}
                onTakePayment={can(user, "payments.collect") ? () => setCheckoutId(order._id) : undefined}
                actions={[
                  order.kitchenHeld && can(user, "orders.manage") && { label: "Send to kitchen now", mode: "release" },
                  order.paidPaise > 0 && (order.refundedPaise || 0) < order.paidPaise && can(user, "refunds.process") && { label: "Refund", mode: "refund" },
                  isOpen(order) && can(user, "orders.manage") && order.type === "Dine-in" && { label: "Move table", mode: "move" },
                  isOpen(order) && unpaid(order) && can(user, "orders.manage") && { label: "Merge in", mode: "merge" },
                  isOpen(order) && unpaid(order) && can(user, "orders.cancel") && { label: "Cancel", mode: "cancel" },
                ].filter(Boolean)}
                onAction={(mode) => (mode === "release" ? release.mutate(order._id) : setActing({ order, mode }))}
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
                  No orders
                </h2>
              </div>

              {/* Card Content */}
              <div className="px-6 py-4">
                <p className="text-[var(--text-color)] opacity-50">
                  {status === "open" ? "No open orders. Tap New order to start one." : "Nothing here yet."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {checkoutId && (
        <CheckoutModal
          orderId={checkoutId}
          onClose={() => setCheckoutId(null)}
          onPaid={(order) => {
            setCheckoutId(null);
            setPaidOrder(order);
          }}
        />
      )}
      {acting && (
        <OrderActionsModal
          order={acting.order}
          mode={acting.mode}
          openOrders={(resData?.data.data || []).filter((o) => o._id !== acting.order._id && isOpen(o) && unpaid(o))}
          onClose={() => setActing(null)}
        />
      )}
      {paidOrder && <Invoice orderInfo={paidOrder} setShowInvoice={() => setPaidOrder(null)} />}
    </section>
  );
};

export default Orders;
