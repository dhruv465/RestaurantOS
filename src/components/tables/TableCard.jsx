import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";

const TableCard = ({ key, name, status, initials, seats }) => {

  const navigate = useNavigate();
  const handleClick = () => {
    if(status === "Booked") return; {
      navigate("/menu");
    }
  }
  return (
    <div
      onClick={handleClick}
      key={key}
      className="w-full md:w-[300px] bg-[var(--card-bg)] p-4 rounded-lg mb-4 cursor-pointer shadow-lg"
    >
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[var(--text-color)] text-xl font-semibold">
          {name}
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
          style={{ backgroundColor: getRandomColor() }}
          className="text-white rounded-full p-5 text-xl"
        >
          {initials}
        </h1>
      </div>
    </div>
  );
};

export default TableCard;
