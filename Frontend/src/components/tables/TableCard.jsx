import React, { useState } from "react";
import { getAvatarName, getRandomColor } from "../../utils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { updateTable } from "../../redux/slices/customerSlice";
import { FaLongArrowAltRight } from "react-icons/fa";
import { Trash2 } from 'lucide-react';

const TableCard = ({ id, name, status, initials, seats, isAdmin, onDelete }) => {
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const handleClick = (name) => {
    if (status === "Booked" || showDeleteConfirm) return;

    const table = { tableId: id, tableNo: name }
    dispatch(updateTable({ table }));
    navigate("/menu");
  };
  
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };
  
  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
    setShowDeleteConfirm(false);
  };
  
  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };
  
  return (
    <div
      onClick={() => handleClick(name)} key={id}
      className="w-full md:w-[300px] bg-[var(--card-bg)] p-4 rounded-lg mb-4 cursor-pointer shadow-lg relative"
    >
      {showDeleteConfirm ? (
        <div className="absolute inset-0 rounded-lg p-4 bg-[var(--card-bg)] flex flex-col items-center justify-center z-10">
          <p className="text-[var(--text-color)] mb-6 text-center text-base">
            Are you sure you want to delete table {name}?
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-6 rounded font-medium"
            >
              Delete
            </button>
            <button
              onClick={handleCancelDelete}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-6 rounded font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
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
              style={{ backgroundColor: initials ? getRandomColor() : "var(--main-bg)" }}
              className="text-[var(--text-color)] rounded-full p-5 text-xl"
            >
              {getAvatarName(initials) || "N/A"}
            </h1>
          </div>
          <div className="flex items-center text-[var(--text-color)] text-xs opacity-80">
            <span>Seats:</span>
            <span className="ml-1">{seats}</span>
            <div className="flex-grow"></div>
            {userData.role === "Admin" ? (
              <Trash2 
                onClick={handleDeleteClick} 
                className="cursor-pointer hover:bg-[var(--main-bg)] rounded p-1" 
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default TableCard;