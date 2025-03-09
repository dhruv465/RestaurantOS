import React, { useState } from "react";
import { getAvatarName, getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateTable, removeCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { FaLongArrowAltRight } from "react-icons/fa";
import { Trash2 } from "lucide-react";
import { deleteTable, getOrderById } from "../../https";
import { enqueueSnackbar } from "notistack";

const TableCard = ({
  id,
  name,
  status,
  initials,
  seats,
  currentOrder,
  isAdmin,
  onDelete,
}) => {
  const userData = useSelector((state) => state.user);
  const customerData = useSelector((state) => state.customer);  // Add this line to get customer data
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClick = async (name) => {
    // Clear previous cart and customer data when selecting a new table
    dispatch(removeAllItems());
    
    let orderDetails = null;
  
    if (currentOrder && currentOrder._id) {
      try {
        console.log("Fetching order details for order ID:", currentOrder._id);
        const response = await getOrderById(currentOrder._id);
        console.log("Order details response:", response);
        
        // Make sure we're getting the full data structure we expect
        orderDetails = {
          _id: response.data.data._id,
          customerDetails: response.data.data.customerDetails,
          items: response.data.data.items,
          bills: response.data.data.bills,
          paymentMethod: response.data.data.paymentMethod,
          orderStatus: response.data.data.orderStatus
        };
      } catch (error) {
        console.error("Error fetching order details:", error);
        enqueueSnackbar("Error loading order details", { variant: "error" });
        return;
      }
    }
  
    const table = {
      tableId: id,
      tableNo: name,
      currentOrder: orderDetails ? { data: orderDetails } : null,
      // Add current customer info to table object if available
      customerName: customerData.customerName || null,
      customerPhone: customerData.customerPhone || null,
      guests: customerData.guests || null
    };
  
    console.log("Navigating with full order data:", table);
    
    // Using removeCustomer to ensure we start with a clean state
    dispatch(removeCustomer());
    
    // Then update with the new table data
    dispatch(updateTable({ table }));
    
    navigate("/menu", { state: { table } });
  };
  
  const handleConfirmDelete = async (e) => {
    e.stopPropagation();
    try {
      await onDelete(id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting table:", error);
    }
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };
  
  return (
    <div
      onClick={() => handleClick(name)}
      key={id}
      className="w-full md:w-[300px] bg-[var(--card-bg)] p-4 rounded-lg mb-4 cursor-pointer shadow-lg relative"
    >
      {showDeleteConfirm ? (
        <div className="absolute inset-0 rounded-lg p-4 bg-[var(--card-bg)] flex flex-col items-center justify-center z-10">
          <p className="text-[var(--text-color)] mb-6 text-center text-base">
            Are you sure you want to delete table {name}?
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded font-medium"
            >
              Delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-6 rounded font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <h1 className="text-[var(--text-color)] text-xl font-semibold">
              Table →{name}
            </h1>
            <p
              className={`${
                status === "Booked"
                  ? "text-green-600 bg-green-100 dark:bg-[#2e4a40]"
                  : "text-red-600 bg-red-100 dark:bg-[#4a2e2e]"
              } rounded-full px-3 py-1 text-sm font-semibold`}
            >
              {status}
            </p>
          </div>
          <div className="flex items-center justify-center mt-5 mb-7">
  <h1
    style={{
      backgroundColor: initials ? getRandomColor() : "var(--main-bg)",
    }}
    className="text-[var(--text-color)] rounded-full p-5 text-xl"
  >
    {getAvatarName(initials) || "N/A"}
  </h1>
</div>
          <div className="flex items-center text-[var(--text-color)] text-xs opacity-80">
            <span>Seats:</span>
            <span className="ml-1">{seats}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default TableCard;