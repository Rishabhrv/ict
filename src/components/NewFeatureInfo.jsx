import React from "react";

const NewFeatureInfo = ({ isOpen, onClose, user, token }) => {
  if (!isOpen) return null;

  const API_URL = process.env.REACT_APP_API_URL;
  const popup_id = 1;

  const saveFeatureInfo = async () => {
    try {
      await fetch(`${API_URL}/save_feature_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          popup_id: popup_id,
        }),
      });
    } catch (err) {
      console.error("Failed to save feature popup:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[40%] rounded-2xl shadow-xl p-6 relative animate-fadeIn">

        <h2 className="text-xl font-semibold text-gray-800">
          🚀 New Improvement Update
        </h2>

        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          We’ve added a set of powerful new features to enhance your experience:
          <br /><br />
          <strong>Improved message formatting</strong> — your text now appears exactly as you type it.
          <br />
          <strong>Multi-select actions</strong> — share or delete multiple messages in chats and groups with a simple right-click.
          <br />
          <strong>Enhanced file sharing</strong> — drag & drop, copy & paste (Ctrl+C / Ctrl+V), and send multiple files at once (up to 25MB each).
          <br />
          <strong>Smart notifications</strong> — receive instant alerts for new messages by enabling browser notifications.
        </p>

        <button
          onClick={() => {
            saveFeatureInfo();
            onClose();
          }}
          className="w-full cursor-pointer mt-2 bg-[#f37c7c] hover:bg-[#e46b6b] text-white py-2 rounded-xl font-semibold transition"
        >
          OK, Got it!
        </button>

        <button
          onClick={onClose}
          className="absolute cursor-pointer top-3 right-4 text-gray-400 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NewFeatureInfo;
