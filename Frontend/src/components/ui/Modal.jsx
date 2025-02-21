import React from "react";

const Modal = ({ title, onClose, isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--card-bg)] shadow-lg w-full max-w-lg mx-4 rounded-lg p-4">
        <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl text-[var(--text-color)] font-semibold">{title}</h2>
          <button
            className="text-[var(--text-color)]/50 text-2xl hover:text-[var(--text-color)]/70"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
