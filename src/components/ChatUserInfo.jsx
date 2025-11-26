import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faFileAlt, faCircleDown } from "@fortawesome/free-solid-svg-icons";
import ConfirmPopup from "./ConfirmPopup";


const API_URL = process.env.REACT_APP_API_URL; 

const ChatUserInfo = ({ token, conversation, user }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("docs"); // 🔹 tab control
  const [showConfirm, setShowConfirm] = useState(false);
  const storedSession = localStorage.getItem("session_id");




  const handleRemove = async () => {
  setShowConfirm(false);

  if (!conversation?.id || !user?.id) {
    alert("Missing conversation or user");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/delete_user_from_conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: conversation.id,
        user_id: user.id,
        session_id: storedSession,
      }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.reload();
    } else {
      console.error(data.error || "Failed to remove user");
    }
  } catch (err) {
    console.error("Remove user error:", err);
    alert("Something went wrong");
  }
};


  useEffect(() => {
    if (!conversation?.id) return;

    const fetchMediaFiles = async () => {
      try {
        const res = await fetch(
          `${API_URL}/get_conversation_media?conversation_id=${conversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) setMediaFiles(data);
      } catch (error) {
        console.error("❌ Error fetching media files:", error);
      }
    };

    fetchMediaFiles();
  }, [conversation, token, user]);

  // 🔹 Separate images and docs
  const imageFiles = mediaFiles.filter((f) => f.message_type === "image");
  const docFiles = mediaFiles.filter((f) => f.message_type === "file");

  return (
    <div className="w-70 p-3  pt-10 text-center overflow-y-auto max-h-screen hide-scrollbar shadow-sm">
      {/* User Info Header */}
      <div className="flex items-center justify-center">
        <h1 className="text-5xl bg-gray-100 rounded-full p-7 text-center px-6">
          {(conversation?.other_username || "U").substring(0, 2).toUpperCase()}
        </h1>
      </div>

      <h6 className="text-lg my-2 font-medium text-gray-500">
        {conversation.other_username}
      </h6>

      {/* 🔹 Tab Switch */}
      <div className="flex justify-around my-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("docs")}
          className={`flex items-center gap-1 px-3 py-1 text-sm font-medium cursor-pointer ${
            activeTab === "docs"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          <FontAwesomeIcon icon={faFileAlt} />
          Docs
        </button>
        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-1 px-3 py-1 text-sm font-medium cursor-pointer ${
            activeTab === "images"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          <FontAwesomeIcon icon={faImages} />
          Images
        </button>
        
      </div>

      {/* 🔹 Tab Content */}
      {activeTab === "images" && (
        <div className="border-b border-gray-200 pb-4 grid grid-cols-3 gap-1 justify-center h-95 hide-scrollbar overflow-y-auto">
          {imageFiles.length > 0 ? (
            imageFiles.map((file, index) => (
              <div
                key={index}
                className="relative group cursor-pointer hover:opacity-80 transition"
                onClick={() => window.open(file.file_url, "_blank")}
              >
                <img
                  src={file.file_url}
                  alt="Media"
                  className="w-20 h-20 object-cover rounded-md"
                />
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm text-center col-span-3">
              No images yet
            </p>
          )}
        </div>
      )}

      {activeTab === "docs" && (
        <div className="border-b border-gray-200 pb-4 grid grid-cols-1 gap-2 justify-center text-left h-95 hide-scrollbar overflow-y-auto">
          {docFiles.length > 0 ? (
            docFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-gray-50 rounded-md p-2 hover:bg-gray-100 transition"
              >
                <FontAwesomeIcon icon={faFileAlt} className="text-gray-500" />
                <div className="">
                  <p className="text-xs font-medium text-gray-700 truncate w-40">
                    {file.file_url.split("/").pop()}
                  </p>
                </div>
                <div>
                    <button
                    onClick={() => window.open(file.file_url, "_blank")}
                    className="text-lg text-gray-400 hover:underline cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faCircleDown} />
                  </button>

                  </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm text-center">No documents yet</p>
          )}
          
        </div>
      )}


        <button
          className="bg-red-100 py-1 px-20 rounded-lg mt-2 text-red-400 font-semibold hover:bg-red-400 hover:text-white hover:shadow-lg cursor-pointer"
          onClick={() => setShowConfirm(true)}
        >
          Remove
        </button>

        <ConfirmPopup
          show={showConfirm}
          message="Are you sure you want to leave this conversation?"
          onConfirm={handleRemove}
          onCancel={() => setShowConfirm(false)}
        />

   </div>
  );
};

export default ChatUserInfo;
