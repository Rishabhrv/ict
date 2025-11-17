import React from "react";

const AlertPopup = ({ show, message, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[300px] p-4 rounded-xl shadow-lg animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Alert</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        <button
          onClick={onClose}
          className="w-full bg-[#f46c6c] text-white py-1 rounded-lg hover:bg-[#d85858]"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default AlertPopup;
