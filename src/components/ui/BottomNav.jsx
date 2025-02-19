import React, { useState, useEffect } from "react";
import { BiSolidDish } from "react-icons/bi";
import { CiCircleMore } from "react-icons/ci";
import { FaHome } from "react-icons/fa";
import { IoReorderFour } from "react-icons/io5";
import { MdTableBar } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const increment = () => setGuestCount((prev) => prev + 1);
  const decrement = () => {
    if (guestCount > 0) setGuestCount((prev) => prev - 1);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] p-2 flex justify-around items-center gap-1 sm:gap-2 md:gap-4 border-t border-[var(--border-color)]">
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
            ? "bg[var(--card-bg)]"
            : "hover:bg[var(--card-bg)]"
        } w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 rounded-[20px] transition-colors duration-200`}
      >
        <IoReorderFour className="inline mr-2 text-lg sm:text-xl" /> Orders
      </button>

      {/* Central Floating Button */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <button
          onClick={openModal}
          className="bg-[#F6b100] text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-[#F6b100]/90 transition-colors duration-200"
        >
          <BiSolidDish className="text-2xl sm:text-3xl" />
        </button>
      </div>

      <button
        onClick={() => navigate("/tables")}
        className={`text-[var(--text-color)] ${
          location.pathname === "/tables"
            ? "bg[var(--card-bg)]"
            : "hover:bg[var(--card-bg)]"
        } w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 rounded-[20px] transition-colors duration-200`}
      >
        <MdTableBar className="inline mr-2 text-lg sm:text-xl" /> Tables
      </button>
      <button className="text-[var(--text-color)] w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg[var(--card-bg)] rounded-[20px] transition-colors duration-200">
        <CiCircleMore className="inline mr-2 text-lg sm:text-xl" /> More
      </button>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Create New Order">
        <div className="flex flex-col gap-4">
          <label className="block text-[#ababab]  text-sm font-medium">
            Customer Name
          </label>
          <div>
            <input
              type="text"
              placeholder="Enter Customer Name"
              className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              id=""
            />
          </div>
        </div>
        <div>
          <label className="block text-[#ababab]  text-sm font-medium mt-3 mb-2 ">
            Customer Phone
          </label>
          <div>
            <input
              type="number"
              placeholder="Enter Customer Phone Number"
              className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              id=""
            />
          </div>
        </div>
        <div>
          <label className="block mb-2 mt-3 text-sm font-medium text-[#ababab]">
            Guest
          </label>
          <div className="flex items-center justify-between bg-[var(--input-bg)] px-4 py-3 rounded-lg border border-[var(--border-color)]">
            <button onClick={decrement} className="text-[var(--text-color)] text-2xl hover:text-[var(--text-color)]/70">
              &minus;
            </button>
            <span className="text-[var(--text-color)]">{guestCount} Person</span>
            <button onClick={increment} className="text-[var(--text-color)] text-2xl hover:text-[var(--text-color)]/70">
              &#43;
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            navigate("/tables");
            closeModal();
          }}
          className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-8 hover:bg-[#F6b100]/90 transition-colors duration-200"
        >
          Create Order
        </button>
      </Modal>
    </div>
  );
};

export default BottomNav;
