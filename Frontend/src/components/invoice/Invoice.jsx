import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa6";
import { Receipt, Share2, Shield, CheckCircle2, Lock } from "lucide-react";

const Invoice = ({ orderInfo, setShowInvoice }) => {
  const invoiceRef = useRef(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
      <div
        className="w-full max-w-[380px] mx-auto shadow-lg bg-white rounded-lg overflow-hidden print:w-full print:max-w-none print:shadow-none"
        ref={invoiceRef}
      >
        <div className="p-4">
          <div className="space-y-4 px-4 py-4 text-center">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 150 }}
                  className="w-12 h-12 border-8 border-green-500 rounded-full flex items-center justify-center shadow-lg bg-green-500"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="text-2xl text-white"
                  >
                    <FaCheck />
                  </motion.span>
                </motion.div>
              </div>
              <h1 className="text-lg font-bold">Order Receipt</h1>
              <p className="text-xs text-gray-500">Thank you for your order!</p>
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs mt-2">
                Receipt
              </span>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 justify-center">
              <Receipt className="h-3 w-3 text-primary" />
              <span className="font-medium">
                #{Math.floor(new Date(orderInfo.orderDate).getTime())}
              </span>
            </div>
          </div>
          <div className="space-y-4 px-4 mt-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold flex items-center gap-2">
                <Receipt className="h-3 w-3" /> Order Details
              </h2>
              <div className="space-y-1">
                {orderInfo.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />{" "}
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">
                      ₹{(item.quantity * item.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-xs">
                <span>Subtotal</span>
                <span>₹{orderInfo.bills.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Tax</span>
                <span>₹{orderInfo.bills.tax.toFixed(2)}</span>
              </div>
              <hr className="my-1" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{orderInfo.bills.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium">Payment Details</h3>
              <div className="bg-gray-50 p-2 rounded-lg text-xs">
                <p className="flex items-center gap-1">
                  <span className="font-semibold">Method:</span>{" "}
                  {orderInfo.paymentMethod}
                </p>
                {orderInfo.paymentMethod !== "Cash" && (
                  <>
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Razorpay Order ID:</span>{" "}
                      {orderInfo.paymentData?.razorpay_order_id}
                    </p>
                    <p className="text-xs mt-1">
                      <span className="font-semibold">
                        Razorpay Payment ID:
                      </span>{" "}
                      {orderInfo.paymentData?.razorpay_payment_id}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4">
            <button
              onClick={() => setShowInvoice(false)}
              className="w-full bg-black text-white py-2 rounded-md flex items-center justify-center text-sm"
            >
              <Lock className="mr-2 h-3 w-3" /> Pay Now
            </button>
            <div className="flex gap-2 justify-center">
              <button
                className="border border-gray-300 py-2 px-4 rounded-md text-sm font-bold"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button className="border border-gray-300 py-2 px-4 rounded-md text-sm font-bold">
                <Share2 className="mr-1 h-3 w-3 inline" /> Share
              </button>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-700">
                <Shield className="h-3 w-3" /> Secure Payment
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Computer generated receipt
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;
