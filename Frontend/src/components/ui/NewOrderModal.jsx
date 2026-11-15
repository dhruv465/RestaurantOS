/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import { getDeliveryZones } from "../../https";
import { setCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import Modal from "./Modal";

const field = (bad) =>
  `w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border ${bad ? "border-red-500" : "border-[var(--border-color)]"}`;

// "New order": who it is for, then dine-in goes to Tables, takeaway/delivery straight to the menu.
const NewOrderModal = ({ onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [orderType, setOrderType] = useState("Dine-in");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [zoneId, setZoneId] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [later, setLater] = useState(""); // datetime-local, takeaway/delivery only
  const [errors, setErrors] = useState({});
  const isDineIn = orderType === "Dine-in";
  const isDelivery = orderType === "Delivery";
  const { data: zoneData } = useQuery({ queryKey: ["deliveryZones"], queryFn: () => getDeliveryZones(), enabled: isDelivery });
  const zones = zoneData?.data?.data || [];

  const handleCreateOrder = () => {
    const newErrors = {
      name: !name.trim(),
      phone: !phone.trim(),
      guests: isDineIn && guestCount <= 0,
      zone: isDelivery && !zoneId,
      address: isDelivery && !address.trim(),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      enqueueSnackbar(isDelivery ? "Name, phone, zone and address are required" : "All fields are required", { variant: "error" });
      return;
    }
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
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Create New Order">
      <div role="radiogroup" aria-label="Order type" className="flex gap-1 p-1 mb-4 bg-[var(--input-bg)] rounded-lg">
        {["Dine-in", "Takeaway", "Delivery"].map((type) => (
          <button
            key={type}
            role="radio"
            aria-checked={orderType === type}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-2 rounded-md text-sm ${orderType === type ? "bg-[#F6b100] text-white" : "text-[var(--text-color)]"}`}
          >
            {type}
          </button>
        ))}
      </div>
      <label className="block text-[#ababab] text-sm font-medium">
        Customer Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter Customer Name"
          className={`mt-1 ${field(errors.name)}`}
        />
      </label>
      {errors.name && <p className="text-red-500 text-xs mt-1">Customer name is required</p>}
      <label className="block text-[#ababab] text-sm font-medium mt-3">
        Customer Phone
        <input
          type="number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter Customer Phone Number"
          className={`mt-1 ${field(errors.phone)}`}
        />
      </label>
      {errors.phone && <p className="text-red-500 text-xs mt-1">Phone number is required</p>}
      {isDineIn && (
        <div className="mt-3">
          <p className="mb-1 text-sm font-medium text-[#ababab]">Guests</p>
          <div className={`flex items-center justify-between bg-[var(--input-bg)] px-4 py-2 rounded-lg border ${errors.guests ? "border-red-500" : "border-[var(--border-color)]"}`}>
            <button onClick={() => setGuestCount((n) => Math.max(0, n - 1))} aria-label="One guest less" title="One guest less" className="text-[var(--text-color)] text-2xl px-2">
              &minus;
            </button>
            <span className="text-[var(--text-color)]">{guestCount} {guestCount === 1 ? "Person" : "People"}</span>
            <button onClick={() => setGuestCount((n) => n + 1)} aria-label="One guest more" title="One guest more" className="text-[var(--text-color)] text-2xl px-2">
              &#43;
            </button>
          </div>
          {errors.guests && <p className="text-red-500 text-xs mt-1">At least 1 guest is required</p>}
        </div>
      )}
      {isDelivery && (
        <div className="mt-3 space-y-2">
          <label className="block text-[#ababab] text-sm font-medium">
            Delivery zone
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={`mt-1 ${field(errors.zone)}`}>
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
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={300} className={`mt-1 ${field(errors.address)}`} />
          </label>
          <input
            aria-label="Note for the rider"
            placeholder="Note for the rider (optional)"
            value={deliveryNote}
            maxLength={200}
            onChange={(e) => setDeliveryNote(e.target.value)}
            className={field(false)}
          />
        </div>
      )}
      {!isDineIn && (
        <label className="block text-[#ababab] text-sm font-medium mt-3">
          Ready for (leave empty for now)
          <input type="datetime-local" value={later} onChange={(e) => setLater(e.target.value)} className={`mt-1 ${field(false)}`} />
        </label>
      )}
      <button onClick={handleCreateOrder} className="bg-[#F6b100] text-white font-semibold rounded-lg py-3 w-full mt-6 hover:bg-[#F6b100]/90 transition-colors">
        Create Order
      </button>
    </Modal>
  );
};

export default NewOrderModal;
