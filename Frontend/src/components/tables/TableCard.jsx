import React, { useState } from "react";
import { getAvatarName, getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateTable, removeCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import { Users, Utensils, Clock, User, Info } from "lucide-react";
import { getOrderById } from "../../https";
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
  shape = "square", // Default shape
}) => {
  const userData = useSelector((state) => state.user);
  const customerData = useSelector((state) => state.customer);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async (name) => {
    // Clear previous cart and customer data when selecting a new table
    dispatch(removeCustomer());
    dispatch(removeAllItems());

    let orderDetails = null;

    if (currentOrder && currentOrder._id) {
      try {
        console.log("Fetching order details for order ID:", currentOrder._id);
        const response = await getOrderById(currentOrder._id);
        console.log("Order details response:", response);

        orderDetails = {
          _id: response.data.data._id,
          customerDetails: response.data.data.customerDetails,
          items: response.data.data.items,
          bills: response.data.data.bills,
          paymentMethod: response.data.data.paymentMethod,
          orderStatus: response.data.data.orderStatus,
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
      customerName: customerData.customerName || null,
      customerPhone: customerData.customerPhone || null,
      guests: customerData.guests || null,
    };

    console.log("Navigating with full order data:", table);

    dispatch(removeCustomer());
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

  // Table shape classes
  const tableShapeClasses = {
    round: "rounded-full w-24 h-24",
    square: "rounded-md w-24 h-24",
    rectangle: "rounded-md w-36 h-24",
  };

  // Get chairs based on shape and capacity
  const getChairs = () => {
    const chairs = [];
    const chairCount = seats || 4;

    // Determine if the table is occupied to style the chairs
    const isOccupied = status === "Booked";
    const chairClass = isOccupied
      ? "absolute w-8 h-8 bg-red-100 border-red-400 border rounded-full flex items-center justify-center"
      : "absolute w-8 h-8 bg-gray-200 rounded-full border border-gray-300 flex items-center justify-center";

    if (shape === "round") {
      // For round tables, place chairs closer to the edge (35% instead of 45%)
      for (let i = 0; i < chairCount; i++) {
        const angle = ((i * 360) / chairCount) * (Math.PI / 180);
        const x = 50 + 35 * Math.cos(angle);
        const y = 50 + 35 * Math.sin(angle);
        chairs.push(
          <div
            key={i}
            className={chairClass}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {isOccupied && i === 0 && <User className="h-3 w-3 text-red-700" />}
          </div>
        );
      }
    } else if (shape === "square") {
      // For square tables, place chairs closer to each side
      const positions = [
        { left: "50%", top: "6%", transform: "translate(-50%, -50%)" }, // Top
        { left: "75%", top: "50%", transform: "translate(-50%, -50%)" }, // Right
        { left: "50%", top: "100%", transform: "translate(-50%, -50%)" }, // Bottom
        { left: "25%", top: "50%", transform: "translate(-50%, -50%)" }, // Left
      ];

      for (let i = 0; i < Math.min(chairCount, positions.length); i++) {
        chairs.push(
          <div key={i} className={chairClass} style={positions[i]}>
            {isOccupied && i === 0 && <User className="h-3 w-3 text-red-700" />}
          </div>
        );
      }
    } else if (shape === "rectangle") {
      // For rectangular tables, place chairs closer to all sides
      const positions = [
        { left: "40%", top: "6%", transform: "translate(-50%, -50%)" }, // Top left
        { left: "60%", top: "6%", transform: "translate(-50%, -50%)" }, // Top right
        { left: "80%", top: "50%", transform: "translate(-50%, -50%)" }, // Right
        { left: "40%", top: "95%", transform: "translate(-50%, -50%)" }, // Bottom left
        { left: "60%", top: "95%", transform: "translate(-50%, -50%)" }, // Bottom right
        { left: "20%", top: "50%", transform: "translate(-50%, -50%)" }, // Left
      ];

      for (let i = 0; i < Math.min(chairCount, positions.length); i++) {
        chairs.push(
          <div key={i} className={chairClass} style={positions[i]}>
            {isOccupied && i === 0 && <User className="h-3 w-3 text-red-700" />}
          </div>
        );
      }
    }

    return chairs;
  };

  // Map status from your system to the visual design
  const mappedStatus =
    status === "Booked"
      ? "occupied"
      : status === "Available"
      ? "available"
      : status === "Reserved"
      ? "reserved"
      : "maintenance";

  const visualStatus =
    status === "Booked" ? "Occupied" : status === "Free" ? "Available" : status;

  // Format time since order start (if there's an order)
  const getOrderTime = () => {
    if (!currentOrder || !currentOrder.createdAt) return null;

    try {
      const orderDate = new Date(currentOrder.createdAt);
      const now = new Date();
      const diffMs = now - orderDate;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 60) {
        return `${diffMins}m`;
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hours}h ${mins}m`;
      }
    } catch (error) {
      return null;
    }
  };

  const orderTime = getOrderTime();

  return (
    <div
      onClick={() => handleClick(name)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      key={id}
      className="shadow-lg border border-[var(--border-color)] rounded-lg p-4 cursor-pointer transition-all hover:shadow-md bg-[var(--card-bg)] relative h-48 overflow-hidden "
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
          <div className="absolute top-2 left-2 z-10">
            <span className="text-sm font-bold bg-white px-2 py-1 rounded-full border">
              {name}
            </span>
          </div>

          {/* Hover panel - only visible on hover */}
          {isHovered && (
            <div className="absolute right-2 top-2 flex flex-col gap-1 z-20">
              {status === "Booked" && (
                <button
                  className="bg-white p-1 rounded-full shadow-sm border hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Info className="h-4 w-4 text-blue-600" />
                </button>
              )}
              <button
                className="bg-white p-1 rounded-full shadow-sm border hover:bg-gray-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-red-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center h-full relative">
            {/* Chairs */}
            {getChairs()}

            {/* Table */}
            <div
              className={`flex items-center justify-center border-2 border-gray-700 ${
                tableShapeClasses[shape]
              } ${
                mappedStatus === "occupied"
                  ? "bg-red-500"
                  : mappedStatus === "available"
                  ? "bg-green-500"
                  : mappedStatus === "reserved"
                  ? "bg-amber-500"
                  : "bg-gray-500"
              }`}
            >
              <div className="bg-white bg-opacity-80 px-2 py-1 rounded text-xs font-medium">
                {seats} <Users className="h-3 w-3 inline" />
              </div>
            </div>

            {/* Occupied table indicators */}
            {status === "Booked" && (
              <div className="absolute top-0 right-0 mt-1 mr-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                    <Utensils className="h-3 w-3 text-red-600" />
                  </div>

                  {orderTime && (
                    <div className="flex items-center justify-center h-6 bg-blue-100 rounded-full px-2">
                      <Clock className="h-3 w-3 text-blue-600 mr-1" />
                      <span className="text-xs text-blue-600 font-medium">
                        {orderTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status indicator with customer initials if available */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                mappedStatus === "available"
                  ? "bg-green-100 text-green-800"
                  : mappedStatus === "occupied"
                  ? "bg-red-100 text-red-800"
                  : mappedStatus === "reserved"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-800"
              } flex items-center justify-center`}
            >
              {visualStatus}
              {initials && (
                <>
                  <span className="mx-1">•</span>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center mr-1">
                      <span className="text-[10px] text-white">
                        {initials.charAt(0)}
                      </span>
                    </div>
                    <span>{initials}</span>
                  </div>
                </>
              )}
            </span>
          </div>

          {/* Hover information panel - Details that appear on hover */}
          {isHovered && status === "Booked" && currentOrder && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center transition-opacity duration-200 z-5">
              <div className="text-center p-2">
                {currentOrder.customerDetails && (
                  <div className="mb-2">
                    <p className="font-medium text-gray-800">
                      {currentOrder.customerDetails.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {currentOrder.customerDetails.phone || "No phone"}
                    </p>
                  </div>
                )}
                {currentOrder.items && (
                  <div className="text-xs text-gray-700">
                    <p className="font-medium">
                      Order items: {currentOrder.items.length}
                    </p>
                    {orderTime && (
                      <p className="flex items-center justify-center mt-1">
                        <Clock className="h-3 w-3 mr-1" /> {orderTime}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TableCard;
