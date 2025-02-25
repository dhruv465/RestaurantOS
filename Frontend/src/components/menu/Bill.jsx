import React, { useState } from "react";
import { getTotalPrice } from "../../redux/slices/CartSlice";
import { useSelector } from "react-redux";
import { createOrderRazorpay, verifyPaymentRazorpay } from "../../https";
import { enqueueSnackbar } from "notistack";


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
  const cartData = useSelector((state) => state.cart);
  const customerData = useSelector((state) => state.customer);
  const total = useSelector(getTotalPrice);
  const taxRate = 5.25;
  const tax = (total * taxRate) / 100;
  const grandTotal = total + tax;

  const [paymentMethod, setPaymentMethod] = useState();
  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      enqueueSnackbar("Plase select a payment method!", { variant: "warning" });
      return;
    }
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
  };

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
    </div>
  );
};

export default Bill;
