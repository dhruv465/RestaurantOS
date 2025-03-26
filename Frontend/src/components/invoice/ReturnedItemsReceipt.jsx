import React, { useRef } from "react";
import { motion } from "framer-motion";
import { FaCheck } from "react-icons/fa6";
import { Receipt, Shield, CheckCircle2, Clock, MapPin, PlusCircle } from "lucide-react";

const ReturnedItemsReceipt = ({ orderInfo, setShowReceipt }) => {
  const receiptRef = useRef(null);

  // Filter items based on their status (returned or newly added)
  const returnedItems = orderInfo.items.filter(item => item.returned);
  const newlyAddedItems = orderInfo.items.filter(item => item.newlyAdded && !item.returned);
  
  // Determine which items to display and what receipt type to show
  const displayItems = newlyAddedItems.length > 0 ? newlyAddedItems : returnedItems;
  const isNewItemsReceipt = newlyAddedItems.length > 0;
  
  // Get table information for display at the top
  const tableInfo = orderInfo.customerDetails?.table?.tableNo 
    ? `Table ${orderInfo.customerDetails.table.tableNo}` 
    : orderInfo.table ? `Table ${orderInfo.table}` : "Takeaway";

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4">
      <div
        className="w-full max-w-[380px] mx-auto shadow-lg bg-white rounded-lg overflow-hidden print:w-full print:max-w-none print:shadow-none"
        ref={receiptRef}
      >
        <div className="p-4">
          <div className="space-y-4 px-4 py-4 text-center">
            <div className="flex flex-col items-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4 text-gray-700" />
                <span className="font-bold text-gray-800">{tableInfo}</span>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring", stiffness: 150 }}
                  className="w-12 h-12 border-8 border-blue-500 rounded-full flex items-center justify-center shadow-lg bg-blue-500"
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
              <p className="text-xs text-gray-500">
                {isNewItemsReceipt ? "Newly added items" : "Items for your service"}
              </p>
              <span className="bg-blue-200 text-blue-700 px-2 py-1 rounded-md text-xs mt-2">
                {isNewItemsReceipt ? "New Items Receipt" : "Service Receipt"}
              </span>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 justify-center">
              <Receipt className="h-3 w-3 text-primary" />
              <span className="font-medium">
                #{Math.floor(new Date().getTime())}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-center mt-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-gray-600">
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
          <div className="space-y-4 px-4 mt-4">
            <div className="space-y-2">
              <h2 className="text-xs font-semibold flex items-center gap-2">
                <Receipt className="h-3 w-3" /> Order Items
              </h2>
              <div className="space-y-1">
                {displayItems.length > 0 ? (
                  displayItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="flex items-center gap-1">
                        {isNewItemsReceipt ? (
                          <PlusCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-red-500" />
                        )}{" "}
                        {isNewItemsReceipt ? (
                          <>{item.quantity}x {item.name}</>
                        ) : (
                          <>{item.returned}x {item.name}</>
                        )}
                      </span>
                      <span className="font-medium">
                        ₹{isNewItemsReceipt
                          ? (item.price).toFixed(2)
                          : ((item.pricePerQuantity || (item.price / item.quantity)) * item.returned).toFixed(2)
                        }
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-2">
                    No items to display
                  </div>
                )}
              </div>
            </div>



            <div className="space-y-2">
              <h3 className="text-xs font-medium">Order Details</h3>
              <div className="bg-gray-50 p-2 rounded-lg text-xs">
                
                <p className="flex items-center gap-1 mt-1">
                  <span className="font-semibold">Customer Name:</span>{" "}
                  {orderInfo.customerDetails?.name || "Guest"}
                </p>
                <p className="flex items-center gap-1 mt-1">
                  <span className="font-semibold">Date:</span>{" "}
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex gap-2 justify-center">
              <button
                className="border border-gray-300  py-2 px-4 rounded-md text-sm font-bold"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button 
                className="border border-gray-300 py-2 px-4 rounded-md text-sm font-bold"
                onClick={() => setShowReceipt(false)}
              >
                Close
              </button>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-700">
                <Shield className="h-3 w-3" /> RestOS
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

export default ReturnedItemsReceipt;