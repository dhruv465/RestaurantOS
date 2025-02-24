import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { updateTable } from "../../redux/slices/CustomerSlice";
import { FaLongArrowAltRight } from "react-icons/fa";

const TableCard = ({ id, name, status, initials, seats, currentOrders }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
    const handleClick = (table) => {
        if (status === "Booked") return;
        dispatch(updateTable({ table: { 
            _id: table._id,
            tableNo: table.tableNo,
            status: table.status,
            seats: table.seats
        }}));
        navigate("/menu");
    };

  return (
    <div
        onClick={() => handleClick({ _id: id, tableNo: name, status, seats })}

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
          style={{ backgroundColor: getRandomColor() }}
          className="text-white rounded-full p-5 text-xl"
        >
          {currentOrders?.customerDetails?.name 
            ? currentOrders.customerDetails.name.split(' ').map(n => n[0]).join('')
            : initials}
        </h1>
      </div>
      <p className="text-[var(--text-color)] text-xs opacity-80">
        Seats: <span className="text-[var(--text-color)]">{seats}</span>
        {currentOrders && (
          <>
            <br />
            Order ID: <span className="text-[var(--text-color)]">{currentOrders._id}</span>
            <br />
            Customer: <span className="text-[var(--text-color)]">{currentOrders.customerDetails.name}</span>
            <br />
            Phone: <span className="text-[var(--text-color)]">{currentOrders.customerDetails.phone}</span>
          </>
        )}
      </p>
    </div>
  );
};

export default TableCard;
