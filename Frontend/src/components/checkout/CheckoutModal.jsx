import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import { QRCodeSVG } from "qrcode.react";
import Modal from "../ui/Modal";
import { newId, buildUpiUri } from "../../utils";
import { showOnDisplay } from "../../utils/display";
import { checkoutOrder, createOrderRazorpay, getCustomers, getOrderById, getSettings, setOrderCustomer, verifyPaymentRazorpay } from "../../https";

const METHODS = ["Cash", "Card", "UPI", "Online"];
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const rupees = (paise) => `₹${((paise || 0) / 100).toFixed(2)}`;
const newRequestId = () => newId();

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const inputClass =
  "w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--border-color)]";

const Row = ({ label, value, strong }) => (
  <div className={`flex justify-between text-[var(--text-color)] ${strong ? "font-bold text-lg" : "text-sm"}`}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

// Attach a known customer to the order so they can earn and spend points.
const CustomerPicker = ({ orderId, onAttached }) => {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["customers", q], queryFn: () => getCustomers(q), enabled: q.trim().length >= 2 });
  const attach = useMutation({
    mutationFn: (customerId) => setOrderCustomer({ orderId, customerId }),
    onSuccess: onAttached,
    onError: (e) => enqueueSnackbar(e.response?.data?.message || "Could not attach customer", { variant: "error" }),
  });
  const results = q.trim().length >= 2 ? data?.data?.data || [] : [];
  return (
    <div className="space-y-1">
      <input aria-label="Find customer" className={inputClass} placeholder="Customer: search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {results.slice(0, 5).map((c) => (
        <button
          key={c._id}
          onClick={() => attach.mutate(c._id)}
          className="w-full text-left text-sm p-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)]"
        >
          {c.name} · {c.phone} · {c.loyaltyPoints} pts
        </button>
      ))}
    </div>
  );
};

// Take payment for a saved order: discount, tip, one or more payments (split), cash change, or Razorpay.
const CheckoutModal = ({ orderId, onClose, onPaid }) => {
  const queryClient = useQueryClient();
  const { data: orderRes } = useQuery({ queryKey: ["order", orderId], queryFn: () => getOrderById(orderId) });
  const order = orderRes?.data?.data;
  const { data: settingsRes } = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const settings = settingsRes?.data?.data;
  const saved = order?.adjustments || {};

  const [discountType, setDiscountType] = useState(null); // null = keep what the order has
  const [discountInput, setDiscountInput] = useState("");
  const [reason, setReason] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [method, setMethod] = useState("Cash");
  const [amountInput, setAmountInput] = useState("");
  const [tenderedInput, setTenderedInput] = useState("");
  const [reference, setReference] = useState("");
  const [splitWays, setSplitWays] = useState(1);
  // One id per payment attempt: a retry after a network error can't charge twice. New id after each success.
  const [requestId, setRequestId] = useState(newRequestId);

  const type = discountType ?? saved.discountType ?? "percent";
  const discountShown =
    discountInput !== "" ? discountInput : saved.discountValue ? String(type === "flat" ? saved.discountValue / 100 : saved.discountValue) : "";
  const reasonShown = reason || saved.discountReason || "";
  const tipShown = tipInput !== "" ? tipInput : saved.tipPaise ? String(saved.tipPaise / 100) : "";

  const adjustments = useMemo(() => {
    const value = Number(discountShown) || 0;
    return {
      ...(value > 0 && {
        discountType: type,
        discountValue: type === "flat" ? toPaise(value) : value,
        discountReason: reasonShown,
      }),
      tipPaise: toPaise(tipShown),
    };
  }, [discountShown, type, reasonShown, tipShown]);
  const needsReason = !!adjustments.discountType && !reasonShown.trim();

  const { data: previewRes, error: previewError } = useQuery({
    queryKey: ["checkout-preview", orderId, adjustments],
    queryFn: () => checkoutOrder({ orderId, dryRun: true, adjustments: needsReason ? undefined : adjustments }),
    enabled: !!order,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const preview = previewRes?.data?.data;
  const bills = preview?.bills;
  const due = preview?.duePaise ?? 0;
  const perPerson = Math.ceil(due / Math.max(splitWays, 1));
  const customer = preview?.customer;
  const pointPaise = preview?.loyaltyPointPaise || 100;
  const pointsCapPaise = Math.min(due, (customer?.loyaltyPoints || 0) * pointPaise);
  const methods = customer?.loyaltyPoints > 0 ? [...METHODS, "Points"] : METHODS;
  const defaultAmount = method === "Points" ? pointsCapPaise : Math.min(perPerson, due);
  const amountPaise = amountInput !== "" ? toPaise(amountInput) : defaultAmount;
  const changePaise = method === "Cash" && tenderedInput !== "" ? toPaise(tenderedInput) - amountPaise : 0;

  const upiUri =
    method === "UPI" && settings?.upiVpa
      ? buildUpiUri({ vpa: settings.upiVpa, payeeName: settings.upiPayeeName || settings.restaurantName, amountPaise, note: `Order ${order?.orderNo || ""}` })
      : null;
  useEffect(() => {
    if (bills && due > 0) showOnDisplay({ type: "pay", amountPaise: method === "Online" ? due : amountPaise, upiUri });
  }, [bills, due, amountPaise, method, upiUri]);

  const finish = (updated) => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    setRequestId(newRequestId());
    setAmountInput("");
    setTenderedInput("");
    setReference("");
    if (updated.paymentStatus === "Paid") {
      showOnDisplay({ type: "thanks" });
      onPaid(updated);
    }
    else enqueueSnackbar(`Received. Still due: ${rupees(updated.bills.totalPaise - updated.paidPaise)}`, { variant: "info" });
  };
  const onError = (error) =>
    enqueueSnackbar(error.response?.data?.message || "Payment failed", { variant: "error" });

  const tillMutation = useMutation({
    mutationFn: () =>
      checkoutOrder({
        orderId,
        requestId,
        adjustments,
        payments: [
          {
            method,
            amountPaise,
            ...(method === "Cash" && tenderedInput !== "" && { tenderedPaise: toPaise(tenderedInput) }),
            ...(reference.trim() && { reference: reference.trim() }),
          },
        ],
      }),
    onSuccess: (res) => finish(res.data.data),
    onError,
  });

  const payOnline = async () => {
    try {
      if (!(await loadRazorpay())) {
        enqueueSnackbar("Razorpay failed to load. Are you online?", { variant: "warning" });
        return;
      }
      // Save the discount/tip first: the server charges the amount due, not a number from this screen.
      await checkoutOrder({ orderId, requestId: newRequestId(), adjustments, payments: [] });
      const { data } = await createOrderRazorpay({ orderId });
      const rzp = new window.Razorpay({
        key: `${import.meta.env.VITE_RAZORPAY_KEY_ID}`,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "RestOS",
        description: `Order ${order.orderNo || ""}`,
        order_id: data.order.id,
        prefill: { name: order.customerDetails?.name, contact: order.customerDetails?.phone },
        theme: { color: "#025cca" },
        handler: async (response) => {
          try {
            const verification = await verifyPaymentRazorpay({ ...response, orderId });
            finish(verification.data.order);
          } catch (error) {
            onError(error);
          }
        },
      });
      rzp.open();
    } catch (error) {
      onError(error);
    }
  };

  const submit = () => {
    if (needsReason) return enqueueSnackbar("Give a reason for the discount", { variant: "warning" });
    if (method === "Online") return payOnline();
    if (amountPaise <= 0 || amountPaise > due) return enqueueSnackbar("Amount must be between ₹0.01 and the amount due", { variant: "warning" });
    if (method === "Points" && amountPaise > pointsCapPaise) return enqueueSnackbar("Not enough points for that amount", { variant: "warning" });
    if (changePaise < 0) return enqueueSnackbar("Cash given is less than the amount", { variant: "warning" });
    tillMutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Checkout ${order?.orderNo ? `#${order.orderNo}` : ""}`}>
      {!order || !bills ? (
        <p className="text-[var(--text-color)]">{previewError?.response?.data?.message || "Loading bill…"}</p>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <Row label="Items" value={rupees(bills.subtotalPaise)} />
            {bills.discountPaise > 0 && <Row label="Discount" value={`− ${rupees(bills.discountPaise)}`} />}
            <Row label={`Tax (${bills.taxRatePercent}%${bills.taxInclusive ? " incl." : ""})`} value={rupees(bills.taxPaise)} />
            {bills.tipPaise > 0 && <Row label="Tip" value={rupees(bills.tipPaise)} />}
            <Row label="Total" value={rupees(bills.totalPaise)} strong />
            {preview.paidPaise > 0 && <Row label="Already paid" value={rupees(preview.paidPaise)} />}
            <Row label="Due" value={rupees(due)} strong />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              aria-label="Discount type"
              className={inputClass}
              value={type}
              onChange={(e) => {
                setDiscountType(e.target.value);
                setDiscountInput("");
              }}
            >
              <option value="percent">Discount %</option>
              <option value="flat">Discount ₹</option>
            </select>
            <input
              aria-label="Discount"
              type="number"
              min="0"
              className={inputClass}
              placeholder="0"
              value={discountShown}
              onChange={(e) => setDiscountInput(e.target.value)}
            />
            <input
              aria-label="Tip in rupees"
              type="number"
              min="0"
              className={inputClass}
              placeholder="Tip ₹"
              value={tipShown}
              onChange={(e) => setTipInput(e.target.value)}
            />
          </div>
          {Number(discountShown) > 0 && (
            <input
              aria-label="Discount reason"
              className={inputClass}
              placeholder="Reason for discount (required)"
              value={reasonShown}
              onChange={(e) => setReason(e.target.value)}
            />
          )}

          {customer ? (
            <div className="flex justify-between items-center text-sm text-[var(--text-color)] bg-[var(--input-bg)] rounded-lg p-2">
              <span>
                {customer.name} · {customer.phone}
              </span>
              <span className="font-semibold">{customer.loyaltyPoints} pts</span>
            </div>
          ) : (
            <CustomerPicker
              orderId={orderId}
              onAttached={() => {
                queryClient.invalidateQueries({ queryKey: ["checkout-preview", orderId] });
                queryClient.invalidateQueries({ queryKey: ["order", orderId] });
              }}
            />
          )}

          <div role="radiogroup" aria-label="Payment method" className={`grid gap-2 ${methods.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
            {methods.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={method === m}
                onClick={() => {
                  setMethod(m);
                  setAmountInput("");
                }}
                className={`py-2 rounded-lg text-sm font-semibold ${
                  method === m ? "bg-[#F6b100] text-white" : "bg-[var(--input-bg)] text-[var(--text-color)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {method !== "Online" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-[#ababab]">
                  Amount (₹)
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={amountInput !== "" ? amountInput : (amountPaise / 100).toFixed(2)}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                </label>
                <label className="text-xs text-[#ababab]">
                  Split between
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={inputClass}
                    value={splitWays}
                    onChange={(e) => {
                      setSplitWays(Math.max(1, parseInt(e.target.value, 10) || 1));
                      setAmountInput("");
                    }}
                  />
                </label>
              </div>
              {splitWays > 1 && (
                <p className="text-sm text-[var(--text-color)]">
                  {rupees(perPerson)} each. Take one payment at a time.
                </p>
              )}
              {method === "Cash" && (
                <label className="text-xs text-[#ababab] block">
                  Cash given (₹)
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={tenderedInput}
                    onChange={(e) => setTenderedInput(e.target.value)}
                  />
                </label>
              )}
              {changePaise > 0 && <Row label="Change to give" value={rupees(changePaise)} strong />}
              {method === "Points" && (
                <p className="text-sm text-[var(--text-color)]">
                  Uses {Math.ceil(amountPaise / pointPaise)} of {customer.loyaltyPoints} points (1 point = {rupees(pointPaise)}).
                </p>
              )}
              {method === "UPI" &&
                (settings?.upiVpa ? (
                  <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg">
                    <QRCodeSVG
                      value={upiUri}
                      size={180}
                      aria-label={`UPI QR for ${rupees(amountPaise)}`}
                    />
                    <p className="text-xs text-gray-700">Scan to pay {rupees(amountPaise)} to {settings.upiVpa}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#ababab]">Add a UPI ID in Settings → General to show a QR here.</p>
                ))}
              {(method === "Card" || method === "UPI") && (
                <input
                  aria-label="Payment reference"
                  className={inputClass}
                  placeholder={method === "UPI" ? "UPI reference / UTR (optional)" : "Card slip number (optional)"}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              )}
            </div>
          )}

          <button
            onClick={submit}
            disabled={tillMutation.isPending || due <= 0}
            className="w-full py-3 rounded-lg bg-[#F6b100] text-white font-semibold hover:bg-[#F6b100]/90 disabled:opacity-60"
          >
            {method === "Online"
              ? `Pay ${rupees(due)} online`
              : method === "UPI"
                ? `UPI received: ${rupees(amountPaise)}`
                : `Take ${rupees(amountPaise)}`}
          </button>
        </div>
      )}
    </Modal>
  );
};

export default CheckoutModal;
