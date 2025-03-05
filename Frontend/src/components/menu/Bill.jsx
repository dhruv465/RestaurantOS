import React, { useState } from "react";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import { useSelector } from "react-redux";
import {
  addOrder,
  createOrderRazorpay,
  updateTable,
  verifyPaymentRazorpay,
} from "../../https";
import { enqueueSnackbar } from "notistack";
import { useMutation } from "@tanstack/react-query";
import { removeCustomer } from "../../redux/slices/customerSlice";
import { useDispatch } from "react-redux";
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
  const total = useSelector(getTotalPrice);
  const taxRate = 5.25;
  const tax = (total * taxRate) / 100;
  const grandTotal = total + tax;

  const [paymentMethod, setPaymentMethod] = useState();
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderInfo, setOrderInfo] = useState();

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      enqueueSnackbar("Plase select a payment method!", { variant: "warning" });
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
            const verification = await verifyPaymentRazorpay(response);
            console.log(verification);
            enqueueSnackbar(verification.data.message, { variant: "success" });

            //Place Order
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
              paymentMethod: paymentMethod,
              paymentData: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
              },
            };

            setTimeout(() => {
              orderMutation.mutate(orderData);
            }, 1500);
          },
          prefill: {
            name: customerData.name,
            email: "",
            contact: customerData.phone,
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
        paymentMethod: paymentMethod,
      };
      orderMutation.mutate(orderData);
    }
  };

  const orderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      console.log(data);

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

      enqueueSnackbar("Order Placed!", {
        variant: "success",
      });
      setShowInvoice(true);
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const tableUpdateMutation = useMutation({
    mutationFn: (reqData) => updateTable(reqData),
    onSuccess: (resData) => {
      console.log(resData);
      // dispatch(removeCustomer());
      // dispatch(removeAllItems());
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
          className={`bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200 ${
            paymentMethod === "Cash" ? "bg-[var(--main-bg)]" : ""
          }`}
        >
          Cash
        </button>
        <button
          onClick={() => setPaymentMethod("Online")}
          className={`bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200 ${
            paymentMethod === "Online" ? "bg-[var(--main-bg)]" : ""
          }`}
        >
          Online
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 mt-4 mb-4">
        <button className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200">
          Print Receipt
        </button>
        <button
          onClick={handlePlaceOrder}
          className="bg-[var(--card-bg)] px-4 py-3 w-full rounded-lg text-[var(--text-color)] font-semibold border border-[var(--border-color)] hover:bg-[var(--card-bg)]/90 transition-colors duration-200"
        >
          Place Order
        </button>
      </div>
      {showInvoice && (
        <Invoice orderInfo={orderInfo} setShowInvoice={setShowInvoice} />
      )}
    </div>
  );
};

export default Bill;
