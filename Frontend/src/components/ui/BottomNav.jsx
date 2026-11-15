import { Settings } from "lucide-react";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDeliveryZones } from "../../https";
import { BiFoodMenu, BiSolidDish } from "react-icons/bi";
import { FaHome } from "react-icons/fa";
import { MdTableBar } from "react-icons/md";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { setCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import "../../styles/animations.css";
import Modal from "./Modal";
import { enqueueSnackbar } from "notistack";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const isActive = (path) => location.pathname === path;
  const [guestCount, setGuestCount] = useState(1);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const toggleSpeedDial = () => setIsSpeedDialOpen(!isSpeedDialOpen);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [orderType, setOrderType] = useState("Dine-in");
  const isDineIn = orderType === "Dine-in";
  const isDelivery = orderType === "Delivery";
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [later, setLater] = useState(""); // datetime-local, takeaway/delivery only
  const { data: zoneData } = useQuery({ queryKey: ["deliveryZones"], queryFn: () => getDeliveryZones(), enabled: isModalOpen && isDelivery });
  const zones = zoneData?.data?.data || [];
  // Add state for validation errors
  const [errors, setErrors] = useState({
    name: false,
    phone: false,
    guests: false
  });

  const increment = () => setGuestCount((prev) => prev + 1);
  const decrement = () => {
    if (guestCount > 0) setGuestCount((prev) => prev - 1);
  };

  const validateForm = () => {
    const newErrors = {
      name: !name.trim(),
      phone: !phone.trim(),
      guests: isDineIn && guestCount <= 0,
      zone: isDelivery && !zoneId,
      address: isDelivery && !address.trim(),
    };
    
    setErrors(newErrors);
    
    // Return true if no errors (all fields are filled)
    return !Object.values(newErrors).some(error => error);
  };

  const handleCreateOrder = () => {
    // Validate form before submitting
    if (validateForm()) {
      // Send data to store with proper field names
      if (isDineIn) {
        dispatch(setCustomer({ customerName: name, customerPhone: phone, guests: guestCount, orderType }));
        navigate("/tables");
      } else {
        // Takeaway / delivery: no table, straight to the menu with an empty cart.
        dispatch(removeAllItems());
        const zone = zones.find((z) => z._id === zoneId);
        dispatch(setCustomer({
          orderId: "", table: null, customerName: name, customerPhone: phone, guests: 1, orderType,
          delivery: isDelivery ? { zoneId, zoneName: zone?.name, feePaise: zone?.feePaise, minOrderPaise: zone?.minOrderPaise, address: address.trim(), note: deliveryNote.trim() } : null,
          scheduledFor: later ? new Date(later).toISOString() : "",
        }));
        navigate("/menu");
      }
      // Reset form fields
      setName("");
      setPhone("");
      setGuestCount(0);
      setAddress("");
      setDeliveryNote("");
      setLater("");
      setErrors({ name: false, phone: false, guests: false });
      closeModal();
    } else {
      // Show error message
      enqueueSnackbar(isDelivery ? "Name, phone, zone and address are required" : "All fields are required", { variant: "error" });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0">
      {/* Speed Dial for Mobile */}
      <div className="sm:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={toggleSpeedDial}
          className="bg-[#F6b100] text-white rounded-full p-4 shadow-lg hover:bg-[#F6b100]/90 transition-all duration-200 animate-glow"
        >
          <BiSolidDish className="text-2xl" />
        </button>
        <div
          className={`absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300 ${
            isSpeedDialOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <button
            onClick={() => {
              navigate("/");
              toggleSpeedDial();
            }}
            className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-full p-3 shadow-lg hover:bg-[var(--card-bg)]/90 transition-all duration-200 animate-glow"
          >
            <FaHome className="text-xl" />
          </button>
          <button
            onClick={() => {
              navigate("/orders");
              toggleSpeedDial();
            }}
            className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-full p-3 shadow-lg hover:bg-[var(--card-bg)]/90 transition-all duration-200 animate-glow"
          >
            <BiFoodMenu className="text-xl" />
          </button>
          <button
            onClick={() => {
              navigate("/tables");
              toggleSpeedDial();
            }}
            className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-full p-3 shadow-lg hover:bg-[var(--card-bg)]/90 transition-all duration-200 animate-glow"
          >
            <MdTableBar className="text-xl" />
          </button>
          <button
            onClick={openModal}
            aria-label="New order"
            className="bg-[var(--card-bg)] text-[var(--text-color)] rounded-full p-3 shadow-lg hover:bg-[var(--card-bg)]/90 transition-all duration-200 animate-glow"
          >
            <BiSolidDish className="text-xl" />
          </button>
        </div>
      </div>

      {/* Regular Navigation for Desktop */}
      <div className="hidden sm:flex bg-[var(--nav-bg)] p-2 justify-around items-center gap-1 sm:gap-2 md:gap-4 border-t border-[var(--border-color)]">
        <button
          onClick={() => navigate("/")}
          className={`text-[var(--text-color)] ${
            location.pathname === "/"
              ? "bg-[var(--card-bg)]"
              : "hover:bg-[var(--card-bg)]"
          } w-full sm:w-[150px] md:w-[200px] rounded-[20px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 transition-colors duration-200`}
        >
          <FaHome className="inline mr-2 text-lg sm:text-xl" /> Home
        </button>
        <button
          onClick={() => navigate("/orders")}
          className={`text-[var(--text-color)] ${
            location.pathname === "/orders"
              ? "bg-[var(--card-bg)]"
              : "hover:bg-[var(--card-bg)]"
          } w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 rounded-[20px] transition-colors duration-200`}
        >
          <BiFoodMenu className="inline mr-2 text-lg sm:text-xl" /> Orders
        </button>

        {/* Central Floating Button for Desktop */}
        <div className="hidden sm:block absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <button
            disabled={isActive("/tables") || isActive("/menu")}
            onClick={openModal}
            aria-label="New order"
            className="bg-[#F6b100] text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-[#F6b100]/90 transition-colors duration-200 animate-glow"
          >
            <BiSolidDish className="text-2xl sm:text-3xl" />
          </button>
        </div>

        <button
          onClick={() => navigate("/tables")}
          className={`text-[var(--text-color)] ${
            location.pathname === "/tables"
              ? "bg-[var(--card-bg)]"
              : "hover:bg-[var(--card-bg)]"
          } w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 rounded-[20px] transition-colors duration-200`}
        >
          <MdTableBar className="inline mr-2 text-lg sm:text-xl" /> Tables
        </button>
        <button
          onClick={() => navigate("/settings")}
          className={`text-[var(--text-color)] ${
            location.pathname === "/settings"
              ? "bg-[var(--card-bg)]"
              : "hover:bg-[var(--card-bg)]"
          } w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 rounded-full transition-colors duration-200`}
        >
          <Settings size={20} className="inline mr-2 text-lg sm:text-xl" /> Settings
        </button>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Create New Order">
        <div role="radiogroup" aria-label="Order type" className="flex gap-1 p-1 mb-4 bg-[var(--input-bg)] rounded-lg">
          {["Dine-in", "Takeaway", "Delivery"].map((type) => (
            <button
              key={type}
              role="radio"
              aria-checked={orderType === type}
              onClick={() => setOrderType(type)}
              className={`flex-1 py-2 rounded-md text-sm ${
                orderType === type ? "bg-[#F6b100] text-white" : "text-[var(--text-color)]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <label className="block text-[#ababab] text-sm font-medium">
            Customer Name
          </label>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) {
                  setErrors({...errors, name: false});
                }
              }}
              placeholder="Enter Customer Name"
              className={`w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border ${
                errors.name ? "border-red-500" : "border-[var(--border-color)]"
              }`}
              id=""
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">Customer name is required</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[#ababab] text-sm font-medium mt-3 mb-2">
            Customer Phone
          </label>
          <div>
            <input
              type="number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (e.target.value.trim()) {
                  setErrors({...errors, phone: false});
                }
              }}
              placeholder="Enter Customer Phone Number"
              className={`w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border ${
                errors.phone ? "border-red-500" : "border-[var(--border-color)]"
              }`}
              id=""
            />
            {errors.phone && (
              <p className="text-red-500 text-xs mt-1">Phone number is required</p>
            )}
          </div>
        </div>
        {isDineIn && <div>
          <label className="block mb-2 mt-3 text-sm font-medium text-[#ababab]">
            Guest
          </label>
          <div className={`flex items-center justify-between bg-[var(--input-bg)] px-4 py-3 rounded-lg border ${
            errors.guests ? "border-red-500" : "border-[var(--border-color)]"
          }`}>
            <button
              onClick={decrement}
              className="text-[var(--text-color)] text-2xl hover:text-[var(--text-color)]/70"
            >
              &minus;
            </button>
            <span className="text-[var(--text-color)]">
              {guestCount} Person
            </span>
            <button
              onClick={() => {
                increment();
                if (guestCount + 1 > 0) {
                  setErrors({...errors, guests: false});
                }
              }}
              className="text-[var(--text-color)] text-2xl hover:text-[var(--text-color)]/70"
            >
              &#43;
            </button>
          </div>
          {errors.guests && (
            <p className="text-red-500 text-xs mt-1">At least 1 guest is required</p>
          )}
        </div>}
        {isDelivery && (
          <div className="mt-3 space-y-2">
            <label className="block text-[#ababab] text-sm font-medium">
              Delivery zone
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className={`mt-1 w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border ${errors.zone ? "border-red-500" : "border-[var(--border-color)]"}`}
              >
                <option value="">Pick a zone</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name} · fee ₹{(z.feePaise / 100).toFixed(0)}{z.minOrderPaise ? ` · min ₹${(z.minOrderPaise / 100).toFixed(0)}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {zones.length === 0 && <p className="text-xs text-[#ababab]">No zones yet. Add them on the Deliveries page.</p>}
            <label className="block text-[#ababab] text-sm font-medium">
              Address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                maxLength={300}
                className={`mt-1 w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border ${errors.address ? "border-red-500" : "border-[var(--border-color)]"}`}
              />
            </label>
            <input
              aria-label="Note for the rider"
              placeholder="Note for the rider (optional)"
              value={deliveryNote}
              maxLength={200}
              onChange={(e) => setDeliveryNote(e.target.value)}
              className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)]"
            />
          </div>
        )}
        {!isDineIn && (
          <label className="block text-[#ababab] text-sm font-medium mt-3">
            Ready for (leave empty for now)
            <input
              type="datetime-local"
              value={later}
              onChange={(e) => setLater(e.target.value)}
              className="mt-1 w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 border border-[var(--border-color)]"
            />
          </label>
        )}
        <button
          onClick={handleCreateOrder}
          className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-8 hover:bg-[#F6b100]/90 transition-colors duration-200"
        >
          Create Order
        </button>
      </Modal>
    </div>
  );
};

export default BottomNav;
