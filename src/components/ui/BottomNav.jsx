import React, { useState, useEffect } from "react";
import { BiSolidDish } from "react-icons/bi";
import { CiCircleMore } from "react-icons/ci";
import { FaHome } from "react-icons/fa";
import { BiFoodMenu } from "react-icons/bi";
import { MdTableBar } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/animations.css";
import Modal from "./Modal";
import { useDispatch } from "react-redux";
import { setCustomer } from "../../redux/slices/CustomerSlice";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch()
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const isActive = (path) => location.pathname === path;
  const [guestCount, setGuestCount] = useState(0);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const toggleSpeedDial = () => setIsSpeedDialOpen(!isSpeedDialOpen);
  const [phone, setPhone] = useState("");
  const [name , setName] = useState("");
  

  const increment = () => setGuestCount((prev) => prev + 1);
  const decrement = () => {
    if (guestCount > 0) setGuestCount((prev) => prev - 1);
  };

  const handleCreateOrder = () => {
    //send data to store
    dispatch(setCustomer({name, phone, guests: guestCount}));
    navigate("/tables");
  }

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
        <button className="text-[var(--text-color)] w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg-[var(--card-bg)] rounded-[20px] transition-colors duration-200">
          <CiCircleMore className="inline mr-2 text-lg sm:text-xl" /> More
        </button>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Create New Order">
        <div className="flex flex-col gap-4">
          <label className="block text-[#ababab] text-sm font-medium">
            Customer Name
          </label>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Customer Name"
              className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
              id=""
            />
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
              onChange={(e) => setPhone(e.target.value)}
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
              onClick={increment}
              className="text-[var(--text-color)] text-2xl hover:text-[var(--text-color)]/70"
            >
              &#43;
            </button>
          </div>
        </div>
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
