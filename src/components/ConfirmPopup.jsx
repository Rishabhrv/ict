import React from "react";

const ConfirmPopup = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[300px] p-4 rounded-xl shadow-lg animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-300 text-gray-700 py-1 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 bg-[#f46c6c] text-white py-1 rounded-lg hover:bg-[#d85858]"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPopup;
