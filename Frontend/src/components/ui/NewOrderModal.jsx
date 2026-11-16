/* eslint-disable react/prop-types -- the app does not use PropTypes */
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCustomer } from "../../redux/slices/customerSlice";
import { removeAllItems } from "../../redux/slices/cartSlice";
import Modal from "./Modal";

const field =
  "w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]";

// "New order": dine-in picks a table next, takeaway goes straight to the menu. No guest name or phone is asked.
const NewOrderModal = ({ onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [orderType, setOrderType] = useState("Dine-in");
  const [guestCount, setGuestCount] = useState(1);
  const [later, setLater] = useState(""); // datetime-local, takeaway only
  const isDineIn = orderType === "Dine-in";

  const start = () => {
    if (isDineIn) {
      dispatch(setCustomer({ customerName: "", customerPhone: "", guests: guestCount, orderType }));
      navigate("/tables");
    } else {
      dispatch(removeAllItems());
      dispatch(setCustomer({
        orderId: "", table: null, customerName: "", customerPhone: "", guests: 1, orderType,
        scheduledFor: later ? new Date(later).toISOString() : "",
      }));
      navigate("/menu");
    }
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="New order">
      <div role="radiogroup" aria-label="Order type" className="flex gap-1 p-1 mb-4 bg-[var(--input-bg)] rounded-lg">
        {["Dine-in", "Takeaway"].map((type) => (
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
      {isDineIn ? (
        <div>
          <p className="mb-1 text-sm font-medium text-[#ababab]">Guests</p>
          <div className="flex items-center justify-between bg-[var(--input-bg)] px-4 py-2 rounded-lg border border-[var(--border-color)]">
            <button onClick={() => setGuestCount((n) => Math.max(1, n - 1))} aria-label="One guest less" title="One guest less" className="text-[var(--text-color)] text-2xl px-2">
              &minus;
            </button>
            <span className="text-[var(--text-color)]">{guestCount} {guestCount === 1 ? "Person" : "People"}</span>
            <button onClick={() => setGuestCount((n) => n + 1)} aria-label="One guest more" title="One guest more" className="text-[var(--text-color)] text-2xl px-2">
              &#43;
            </button>
          </div>
          <p className="text-xs text-[#ababab] mt-2">Next, pick the table.</p>
        </div>
      ) : (
        <label className="block text-[#ababab] text-sm font-medium">
          Ready for (leave empty for now)
          <input type="datetime-local" value={later} onChange={(e) => setLater(e.target.value)} className={`mt-1 ${field}`} />
        </label>
      )}
      <button onClick={start} className="bg-[#F6b100] text-white font-semibold rounded-lg py-3 w-full mt-6 hover:bg-[#F6b100]/90 transition-colors">
        Start order
      </button>
    </Modal>
  );
};

export default NewOrderModal;
