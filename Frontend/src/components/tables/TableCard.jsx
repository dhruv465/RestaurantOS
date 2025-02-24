import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { getAvatarName, getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateTable } from "../../redux/slices/CustomerSlice";
import { FaLongArrowAltRight } from "react-icons/fa";

const TableCard = ({ name, status, initials, seats }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
    const handleClick = (table) => {
    if (status === "Booked") return;
    dispatch(updateTable({ tableNo: name }));
    navigate("/menu");
  };
  return (
    <div
      onClick={() => handleClick(name)}
      className="w-full md:w-[300px] bg-[var(--card-bg)] p-4 rounded-lg mb-4 cursor-pointer shadow-lg"
    >
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[var(--text-color)] text-xl font-semibold">
         Table <FaLongArrowAltRight className="text-[var(--text-color)] ml-2 inline"/> {name}
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
          style={{ backgroundColor:initials ? getRandomColor() : "var(--main-bg)" }}
          className="text-[var(--text-color)] rounded-full p-5 text-xl"
        >
         {getAvatarName(initials) || "N/A"}
        </h1>
      </div>
      <p className="text-[var(--text-color)] text-xs opacity-80">
        
        Seats: <span className="text-[var(--text-color)]">{seats}</span>
      </p>
    </div>
  );
};

export default TableCard;
