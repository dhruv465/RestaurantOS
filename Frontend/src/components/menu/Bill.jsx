import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addOrder,
  createOrderRazorpay,
  updateTable,
  verifyPaymentRazorpay,
  updateOrder,
} from "../../https";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";
import Invoice from "../invoice/Invoice";

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

const Bill = () => {
  const dispatch = useDispatch();
  const cartData = useSelector((state) => state.cart);
  const customerData = useSelector((state) => state.customer);
  console.log("Customer data from Redux store:", customerData);
  const total = useSelector(getTotalPrice);
  const taxRate = 5.25;
  const tax = (total * taxRate) / 100;
  const grandTotal = total + tax;

  const [paymentMethod, setPaymentMethod] = useState();
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState();

  // Check if we're updating an existing order
  const isExistingOrder = !!customerData.orderId;

  // Function to prepare the order data
  const prepareOrderData = (
    includePaymentData = false,
    paymentDetails = null
  ) => {
    const orderData = {
      customerDetails: {
        name: customerData.customerName,
        phone: customerData.customerPhone,
        guests: customerData.guests,
      },
      orderStatus: "In Progress",
      bills: {
        total: total,
        tax: tax,
        grandTotal: grandTotal,
      },
      items: cartData,
      table: customerData.table.tableId,
    };

    // Add payment method if specified
    if (paymentMethod) {
      orderData.paymentMethod = paymentMethod;
    }

    // Add payment data if provided
    if (includePaymentData && paymentDetails) {
      orderData.paymentData = paymentDetails;
    }

    // If updating an existing order, include the orderId
    if (isExistingOrder) {
      orderData.orderId = customerData.orderId;
    }

    return orderData;
  };

  const handleBookTable = () => {
    // Prepare the order data
    const orderData = prepareOrderData();

    // For Book Table, we handle both new orders and updates
    if (isExistingOrder) {
      bookTableUpdateMutation.mutate(orderData);
    } else {
      bookTableMutation.mutate(orderData);
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      enqueueSnackbar("Please select a payment method!", {
        variant: "warning",
      });
      return;
    }

    if (paymentMethod === "Online") {
      try {
        const res = await loadScript(
          "https://checkout.razorpay.com/v1/checkout.js"
        );

        if (!res) {
          enqueueSnackbar("Razorpay SDK failed to load. Are you online?", {
            variant: "warning",
          });
          return;
        }

        //create order
        const reqData = {
          amount: grandTotal.toFixed(2),
        };
        const { data } = await createOrderRazorpay(reqData);

        const options = {
          key: `${import.meta.env.VITE_RAZORPAY_KEY_ID}`,
          amount: data.order.amount,
          currency: data.order.currency,
          name: "RestOS",
          description: "Secure Payment for Your Meal",
          order_id: data.order.id,
          handler: async function (response) {
            try {
              // Add the orderId to the verification request
              const verificationData = {
                ...response,
                orderId: customerData.orderId || null, // Send the existing orderId if available
              };

              const verification = await verifyPaymentRazorpay(
                verificationData
              );
              console.log("Payment verification response:", verification);

              if (verification.data.success) {
                enqueueSnackbar(verification.data.message, {
                  variant: "success",
                });

                // If we've already saved payment details on the server, we can use the returned order
                if (verification.data.order) {
                  setOrderInfo(verification.data.order);
                  setShowInvoice(true);

                  // Update table status if needed
                  const tableData = {
                    status: "Booked",
                    orderId: verification.data.order._id,
                    tableId: verification.data.order.table,
                  };

                  setTimeout(() => {
                    tableUpdateMutation.mutate(tableData);
                  }, 1500);

                  // Clear cart and customer data
                  setTimeout(() => {
                    dispatch(removeCustomer());
                    dispatch(removeAllItems());
                  }, 2000);

                  return;
                }

                // For backward compatibility, continue with the existing flow
                // Prepare order data with payment details
                const paymentDetails = {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                };

                const orderData = prepareOrderData(true, paymentDetails);

                // If existing order, update it; otherwise create new order
                if (isExistingOrder) {
                  paymentUpdateMutation.mutate(orderData);
                } else {
                  orderMutation.mutate(orderData);
                }
              } else {
                enqueueSnackbar("Payment verification failed", {
                  variant: "error",
                });
              }
            } catch (error) {
              console.error("Payment handling error:", error);
              enqueueSnackbar("Payment processing failed!", {
                variant: "error",
              });
            }
          },
          prefill: {
            name: customerData.customerName,
            email: "",
            contact: customerData.customerPhone,
          },
          theme: { color: "#025cca" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        console.log(error);
        enqueueSnackbar("Payment Failed!", { variant: "error" });
      }
    } else {
      // Cash payment
      const orderData = prepareOrderData();

      // If existing order, update it; otherwise create new order
      if (isExistingOrder) {
        paymentUpdateMutation.mutate(orderData);
      } else {
        orderMutation.mutate(orderData);
      }
    }
  };

  // Book Table mutations - handle both new orders and updates
  const bookTableMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      console.log("Table booked with order:", data);

      // Update Table
      const tableData = {
        status: "Booked",
        orderId: data._id,
        tableId: data.table,
      };

      setTimeout(() => {
        tableUpdateMutation.mutate(tableData);
      }, 1500);

      enqueueSnackbar("Table Booked Successfully!", {
        variant: "success",
      });
      // No invoice display for book table
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar("Failed to book table!", { variant: "error" });
    },
  });

  const bookTableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      console.log("Table booking updated:", data);

      enqueueSnackbar("Table Booking Updated!", {
        variant: "success",
      });
      // No invoice display for table booking updates
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar("Failed to update table booking!", { variant: "error" });
    },
  });

  // Place Order mutation - only handles payment processing for new orders
  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      console.log("Order with payment created:", data);

      setOrderInfo(data);

      // Update Table
      const tableData = {
        status: "Booked",
        orderId: data._id,
        tableId: data.table,
      };

      setTimeout(() => {
        tableUpdateMutation.mutate(tableData);
      }, 1500);

      enqueueSnackbar("Payment Processed Successfully!", {
        variant: "success",
      });
      setShowInvoice(true); // Show invoice for payment
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar("Payment processing failed!", { variant: "error" });
    },
  });

  // Add this mutation for updating existing orders with payment
  const paymentUpdateMutation = useMutation({
    mutationFn: (reqData) => updateOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      console.log("Order updated with payment:", data);

      setOrderInfo(data);

      enqueueSnackbar("Payment Processed Successfully!", {
        variant: "success",
      });
      setShowInvoice(true); // Show invoice for payment

      // Update table if needed
      if (data.table) {
        const tableData = {
          status: "Booked",
          orderId: data._id,
          tableId: data.table,
        };

        setTimeout(() => {
          tableUpdateMutation.mutate(tableData);
        }, 1500);
      }
    },
    onError: (error) => {
      console.log(error);
      enqueueSnackbar("Payment processing failed!", { variant: "error" });
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
      <div className="flex items-center justify-between px-5 mt-2">
        <p className="text-xs text-[var(--text-color)] font-medium mt-2">
          Tax(5.25%)
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
      <div className="flex items-center gap-3 px-5 mt-4">
        <button
          onClick={() => setPaymentMethod("Cash")}
          className={`px-4 py-3 w-full rounded-lg font-semibold transition-colors duration-200 ${
            paymentMethod === "Cash"
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "bg-[var(--card-bg)] text-[var(--text-color)] border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90"
          }`}
        >
          Cash
        </button>
        <button
          onClick={() => setPaymentMethod("Online")}
          className={`px-4 py-3 w-full rounded-lg font-semibold transition-colors duration-200 ${
            paymentMethod === "Online"
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-[var(--card-bg)] text-[var(--text-color)] border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90"
          }`}
        >
          Online
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 mt-4 mb-4">
        <button
          onClick={handleBookTable}
          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 w-full rounded-lg font-semibold transition-colors duration-200"
        >
          {isExistingOrder ? "Update Order" : "Book Table"}
        </button>
        <button
          onClick={handlePlaceOrder}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 w-full rounded-lg font-semibold transition-colors duration-200"
        >
          Pay Now
        </button>
      </div>
      {showInvoice && (
        <Invoice orderInfo={orderInfo} setShowInvoice={setShowInvoice} />
      )}
    </div>
  );
};

export default Bill;
