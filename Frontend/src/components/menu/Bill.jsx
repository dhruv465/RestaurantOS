import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addOrder,
  updateTable,
  updateOrder,
  previewOrderPrice,
} from "../../https";
import { newId, can } from "../../utils";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer, setCustomer } from "../../redux/slices/customerSlice";
import Invoice from "../invoice/Invoice";
import ReturnedItemsReceipt from "../invoice/ReturnedItemsReceipt";
import CheckoutModal from "../checkout/CheckoutModal";
import { showOnDisplay } from "../../utils/display";

const Bill = () => {
  const dispatch = useDispatch();
  const cartData = useSelector((state) => state.cart);
  const customerData = useSelector((state) => state.customer);
  const user = useSelector((state) => state.user);
  const cartTotal = useSelector(getTotalPrice);

  // Totals and tax come from the server (utils/pricing.js); the cart total is only a placeholder while loading.
  const priceLines = cartData.map(({ itemId, name, quantity, modifiers }) => ({
    itemId,
    name,
    quantity,
    modifiers: (modifiers || []).map(({ groupId, optionId }) => ({ groupId, optionId })),
  }));
  const zoneId = customerData.orderType === "Delivery" ? customerData.delivery?.zoneId : undefined;
  const { data: priceData } = useQuery({
    queryKey: ["price", priceLines, zoneId],
    queryFn: () => previewOrderPrice(priceLines, zoneId),
    enabled: priceLines.length > 0,
    placeholderData: keepPreviousData,
  });
  const bills = cartData.length ? priceData?.data?.data?.bills : null;
  const total = bills ? bills.total - (bills.deliveryFeePaise || 0) / 100 : cartTotal; // food only; fee has its own line
  const tax = bills?.tax ?? 0;
  const grandTotal = bills?.grandTotal ?? cartTotal;
  const taxLabel = bills ? `Tax (${bills.taxRatePercent}%${bills.taxInclusive ? " incl." : ""})` : "Tax";

  // Mirror the cart on the customer display (no-op when none is open).
  useEffect(() => {
    if (!cartData.length) return showOnDisplay({ type: "idle" });
    const lines = priceData?.data?.data?.items;
    showOnDisplay({
      type: "cart",
      items: cartData.map((l, i) => ({
        name: l.name,
        quantity: l.quantity,
        modifiers: (l.modifiers || []).map((m) => m.name),
        pricePaise: Math.round((lines?.[i]?.price ?? l.price) * 100),
      })),
      taxPaise: Math.round(tax * 100),
      totalPaise: Math.round(grandTotal * 100),
    });
  }, [cartData, priceData, tax, grandTotal]);

  const [checkoutId, setCheckoutId] = useState(null);
  // Same id for repeated taps on one new order, so the server creates it (and its KOT) once.
  const requestIdRef = useRef(newId());
  const nextRequest = () => (requestIdRef.current = newId());
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReturnedItemsReceipt, setShowReturnedItemsReceipt] = useState(false);
  const [orderInfo, setOrderInfo] = useState();

  // Check if we're updating an existing order
  const isExistingOrder = !!customerData.orderId;

  // Function to prepare the order data
  const prepareOrderData = () => {
    const orderData = {
      customerDetails: {
        name: customerData.customerName,
        phone: customerData.customerPhone,
        guests: customerData.guests,
        table: customerData.table, // Include the full table object with tableNo
      },
      orderStatus: "In Progress",
      bills: {
        total: total,
        tax: tax,
        grandTotal: grandTotal,
      },
      items: cartData,
      table: customerData.table?.tableId,
      orderType: customerData.orderType,
      delivery: customerData.orderType === "Delivery" && customerData.delivery ? { zoneId: customerData.delivery.zoneId, address: customerData.delivery.address, note: customerData.delivery.note } : undefined,
      scheduledFor: customerData.scheduledFor || undefined,
      clientRequestId: requestIdRef.current,
    };

    // If updating an existing order, include the orderId
    if (isExistingOrder) {
      orderData.orderId = customerData.orderId;
    }

    return orderData;
  };

  // Dine-in books the table (its success clears the cart); takeaway/delivery has no table, so clear now.
  const bookTableFor = (order) => {
    if (!order?.table) {
      dispatch(removeCustomer());
      dispatch(removeAllItems());
      return;
    }
    setTimeout(() => {
      tableUpdateMutation.mutate({ status: "Booked", orderId: order._id, tableId: order.table });
    }, 1500);
  };

  const canSubmit = () => {
    if (cartData.length === 0) {
      enqueueSnackbar("Add at least one item", { variant: "warning" });
      return false;
    }
    if (customerData.orderType === "Delivery" && !customerData.delivery?.zoneId) {
      enqueueSnackbar("Start a new delivery order and pick its zone and address", { variant: "warning" });
      return false;
    }
    if (customerData.orderType === "Dine-in" && !customerData.table?.tableId) {
      enqueueSnackbar("Pick a table first", { variant: "warning" });
      return false;
    }
    return true;
  };

  const handleBookTable = () => {
    if (!canSubmit()) return;
    // Prepare the order data
    const orderData = prepareOrderData();

    // Check if this is a new order or an update to an existing order
    if (isExistingOrder) {
    
      const newlyAddedItems = cartData.filter(item => item.newlyAdded);
      
      const receiptOrderData = {
        ...orderData,
        items: newlyAddedItems
      };
      
      // Set the order info for receipt generation
      setOrderInfo(receiptOrderData);
    } else {
      const cartWithReturnedItems = cartData.map(item => ({
        ...item,
        returned: item.quantity 
      }));

      const receiptOrderData = {
        ...orderData,
        items: cartWithReturnedItems
      };

      // Set the order info for receipt generation
      setOrderInfo(receiptOrderData);
    }
    
    // For Book Table, we handle both new orders and updates
    if (isExistingOrder) {
      bookTableUpdateMutation.mutate(orderData);
    } else {
      bookTableMutation.mutate(orderData);
    }
  };

  // Pay Now: save the cart as an order (sends new items to the kitchen), then open checkout.
  const handlePay = async () => {
    if (!canSubmit()) return;
    try {
      let orderId = customerData.orderId;
      if (orderId) {
        await updateOrder(prepareOrderData());
      } else {
        const { data } = await addOrder(prepareOrderData());
        nextRequest();
        orderId = data.data._id;
        dispatch(setCustomer({ orderId }));
        if (customerData.table?.tableId) {
          await updateTable({ tableId: customerData.table.tableId, status: "Booked", orderId });
        }
      }
      setCheckoutId(orderId);
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || "Could not save the order", { variant: "error" });
    }
  };

  const handlePaid = (order) => {
    setCheckoutId(null);
    setOrderInfo(order);
    setShowInvoice(true);
    dispatch(removeCustomer());
    dispatch(removeAllItems());
  };

  // Book Table mutations - handle both new orders and updates
  const bookTableMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      nextRequest();
      const { data } = resData.data;
      bookTableFor(data);
      // Show the kitchen ticket only once the server has the order, with its real number.
      setOrderInfo((info) => ({ ...info, orderNo: data.orderNo }));
      setShowReturnedItemsReceipt(true);

      enqueueSnackbar("Table Booked Successfully & Order Sent to Kitchen!", {
        variant: "success",
      });
      // No invoice display for book table
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar(error.response?.data?.message || "Could not send the order", { variant: "error" });
    },
  });

  const bookTableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      setOrderInfo((info) => ({ ...info, orderNo: data.orderNo }));
      setShowReturnedItemsReceipt(true);

      // Check if there are any returned items in the cart
      const hasReturnedItems = cartData.some(item => item.returned);

      enqueueSnackbar("Table Booking Updated!", {
        variant: "success",
      });
      
      // Set order info for returned items receipt if needed
      if (hasReturnedItems) {
        setOrderInfo(data);
      }
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar(error.response?.data?.message || "Could not update the order", { variant: "error" });
    },
  });

  const tableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateTable(reqData),
    onSuccess: (resData) => {
      console.log(resData);
      dispatch(removeCustomer());
      dispatch(removeAllItems());
    },
    onError: (error) => {
      console.log(error);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">
          Items({cartData.length})
        </p>
        <h1 className="text-[var(--text-color)] text-md font-bold">
          ₹{total.toFixed(2)}
        </h1>
      </div>
      {bills?.deliveryFeePaise > 0 && (
        <div className="flex items-center justify-between px-5 mt-2">
          <p className="text-xs text-[var(--text-color)] font-medium mt-2">Delivery ({customerData.delivery?.zoneName})</p>
          <h1 className="text-[var(--text-color)] text-md font-bold">₹{(bills.deliveryFeePaise / 100).toFixed(2)}</h1>
        </div>
      )}
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">
            {taxLabel}
        </p>
        <h1 className="text-[var(--text-color)] text-md font-bold">
          ₹{tax.toFixed(2)}
        </h1>
      </div>
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">
          Grand Total
        </p>
        <h1 className="text-[var(--text-color)] text-md font-bold">
          ₹{grandTotal.toFixed(2)}
        </h1>
      </div>
      <div className="flex items-center gap-3 px-5 mt-4 mb-4">
        <button
          onClick={handleBookTable}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 w-full rounded-lg flex gap-2 font-semibold transition-colors duration-200"
        >
        🧾 {isExistingOrder ? "Update Order" : "KOT & Print"}
        </button>
        {can(user, "payments.collect") && <button
          onClick={handlePay}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 w-full gap-2 rounded-lg font-semibold transition-colors duration-200"
        >
          
          ₹ Pay Now
        </button>}
      </div>
      {checkoutId && (
        <CheckoutModal orderId={checkoutId} onClose={() => setCheckoutId(null)} onPaid={handlePaid} />
      )}
      {showInvoice && (
        <Invoice orderInfo={orderInfo} setShowInvoice={setShowInvoice} />
      )}
      {showReturnedItemsReceipt && (
        <ReturnedItemsReceipt orderInfo={orderInfo} setShowReceipt={setShowReturnedItemsReceipt} />
      )}
    </div>
  );
};

export default Bill;
