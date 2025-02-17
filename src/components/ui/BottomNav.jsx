import React from "react";
import { BiSolidDish } from "react-icons/bi";
import { CiCircleMore } from "react-icons/ci";
import { FaHome } from "react-icons/fa";
import { IoReorderFour } from "react-icons/io5";
import { MdTableBar } from "react-icons/md";
import { useNavigate } from "react-router-dom";

const BottomNav = () => {

  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] p-2 flex justify-around items-center gap-1 sm:gap-2 md:gap-4 border-t border-[var(--border-color)]">
      <button onClick={() => navigate("/")} className="text-[var(--text-color)] bg-[var(--card-bg)] w-full sm:w-[150px] md:w-[200px] rounded-[20px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg-[var(--card-bg-hover)] transition-colors duration-200">
        <FaHome className="inline mr-2 text-lg sm:text-xl" /> Home
      </button>
      <button onClick={() => navigate("/orders")} className="text-[var(--text-color)] w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg-[var(--card-bg)] rounded-[20px] transition-colors duration-200">
        <IoReorderFour className="inline mr-2 text-lg sm:text-xl" /> Orders
      </button>
      
      {/* Central Floating Button */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <button className="bg-[#F6b100] text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-[#F6b100]/90 transition-colors duration-200">
          <BiSolidDish className="text-2xl sm:text-3xl" />
        </button>
      </div>

      <button onClick={() => navigate("/tables")} className="text-[var(--text-color)] w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg-[var(--card-bg)] rounded-[20px] transition-colors duration-200">
        <MdTableBar className="inline mr-2 text-lg sm:text-xl" /> Tables
      </button>
      <button className="text-[var(--text-color)] w-full sm:w-[150px] md:w-[200px] flex items-center justify-center text-sm sm:text-base px-2 sm:px-4 py-2 hover:bg-[var(--card-bg)] rounded-[20px] transition-colors duration-200">
        <CiCircleMore className="inline mr-2 text-lg sm:text-xl" /> More
      </button>
    </div>
  );
};

export default BottomNav;
