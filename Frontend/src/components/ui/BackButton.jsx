import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="back-button bg-[#f6b0006e] text-white rounded-full p-2 text-xl sm:p-4 shadow-lg hover:bg-[#f6b100]/90 transition-colors duration-200"
    >
      <span className="sr-only">Go Back</span>
      <ArrowLeft className="text-2xl sm:text-3xl" />
    </button>
  );
};

export default BackButton;
