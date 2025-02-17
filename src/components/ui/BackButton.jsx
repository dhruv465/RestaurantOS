import React from "react";
import { IoArrowBack } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="back-button bg-[#f6b0006e] text-white rounded-lg p-3 text-xl sm:p-4 shadow-lg hover:bg-[#f6b100]/90 transition-colors duration-200"
    >
      <span className="sr-only">Go Back</span>
      <IoArrowBack className="text-2xl sm:text-3xl" />
    </button>
  );
};

export default BackButton;
