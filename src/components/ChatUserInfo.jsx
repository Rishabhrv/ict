import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faImages, 
  faFileAlt, 
  faCircleDown, 
  faFilePdf, 
  faFileWord, 
  faFileExcel, 
  faFilePowerpoint, 
  faFileLines, 
  faFileZipper, 
  faFile 
} from "@fortawesome/free-solid-svg-icons";
import { getSocket } from "../socket";
import ConfirmPopup from "./ConfirmPopup";
import ReactDOM from "react-dom";

const API_URL = process.env.REACT_APP_API_URL;

const ChatUserInfo = ({ token, conversation, user }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("docs");
  const [showConfirm, setShowConfirm] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, lastSeen: null });
  const storedSession = localStorage.getItem("session_id");
  const [previewImage, setPreviewImage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(12);



  // Format "Last Seen" logic
  const formatLastSeen = (dateString) => {
    if (!dateString) return "Last seen recently";
    const lastSeenDate = new Date(dateString.replace(" ", "T") + "+05:30");
    const now = new Date();
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes} minutes ago`;
    if (diffHours < 24) {
      const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: true };
      return lastSeenDate.getDate() === now.getDate() 
        ? `Last seen today at ${lastSeenDate.toLocaleTimeString("en-IN", timeOpts)}`
        : `Last seen yesterday`;
    }
    return `Last seen on ${lastSeenDate.toLocaleDateString("en-IN")}`;
  };

  const downloadImage = async (url) => {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = url.split("/").pop() || "image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
  }
};

  // 🔹 Fetch initial status
  useEffect(() => {
    if (!conversation?.other_user_id) return;
    
    fetch(`${API_URL}/user_status/${conversation.other_user_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setOtherUserStatus({ isOnline: data.is_online === 1, lastSeen: data.last_seen });
        }
      })
      .catch(console.error);
  }, [conversation, token]);

  const ModalPortal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body);
  };

  // 🔹 Listen for real-time status updates
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleStatusUpdate = (data) => {
      if (data.user_id === conversation.other_user_id) {
        setOtherUserStatus({ isOnline: data.is_online === 1, lastSeen: data.last_seen });
      }
    };

    s.on("user_status_update", handleStatusUpdate);
    return () => s.off("user_status_update", handleStatusUpdate);
  }, [conversation]);

  const handleRemove = async () => {
    setShowConfirm(false);
    if (!conversation?.id || !user?.id) return;
    try {
      const res = await fetch(`${API_URL}/delete_user_from_conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversation_id: conversation.id,
          user_id: user.id,
          session_id: storedSession,
        }),
      });
      const data = await res.json();
      if (data.success) window.location.reload();
    } catch (err) {
      console.error("Remove user error:", err);
    }
  };

  useEffect(() => {
    if (!conversation?.id) return;
    const fetchMediaFiles = async () => {
      try {
        const res = await fetch(`${API_URL}/get_conversation_media?conversation_id=${conversation.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) setMediaFiles(data);
      } catch (error) {
        console.error("❌ Error fetching media files:", error);
      }
    };
    fetchMediaFiles();
  }, [conversation, token]);

  const imageFiles = mediaFiles.filter((f) => f.message_type === "image");
  const docFiles = mediaFiles.filter((f) => f.message_type === "file");

  const hasMore = activeTab === "images" 
    ? visibleCount < imageFiles.length 
    : visibleCount < docFiles.length;

  const getFileIcon = (url) => {
    const ext = url.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return faFilePdf;
    if (["doc", "docx"].includes(ext)) return faFileWord;
    if (["xls", "xlsx", "csv"].includes(ext)) return faFileExcel;
    if (["zip", "rar", "7z"].includes(ext)) return faFileZipper;
    if (["ppt", "pptx"].includes(ext)) return faFilePowerpoint;
    if (["txt"].includes(ext)) return faFileLines;
    return faFile;
  };

  return (
    <div className="w-[280px] bg-white border-l border-[#f2ede8] h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* User Info Header */}
      <div className="flex flex-col items-center pt-[40px] pb-[20px] px-[20px]">
        <div className="relative mb-[16px] w-[80px] h-[80px] shrink-0">
          <div className={`w-full h-full rounded-[24px] flex items-center justify-center text-white text-[32px] font-bold shadow-[0_6px_18px_rgba(243,124,124,0.30)] overflow-hidden ${
              conversation?.isGroup || conversation?.type === "group"
                ? "bg-gradient-to-br from-[#9ca3af] to-[#6b7280]"
                : "bg-gradient-to-br from-[#f47f7f] to-[#d95f5f]"
            }`}
          >
            {conversation?.isGroup || conversation?.type === "group" ? (
              conversation.group_image ? (
                <img src={conversation.group_image} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              )
            ) : (
              conversation?.profile_image ? (
                <img src={conversation.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (conversation?.other_username || "U").substring(0, 2).toUpperCase()
              )
            )}
          </div>
          
          {/* Status dot in the corner of the avatar */}
          {!conversation?.isGroup && otherUserStatus.isOnline && (
            <div className="absolute -bottom-[2px] -right-[2px] w-[20px] h-[20px] bg-[#4ade80] rounded-full border-[3px] border-white z-10"></div>
          )}
        </div>
        
        <h6 className="text-[18px] font-bold text-[#181818] font-['Outfit',sans-serif]">
          {conversation.other_username}
        </h6>
        
        {/* Dynamic Status Display */}
        <p className={`text-[12px] font-medium ${otherUserStatus.isOnline ? "text-green-500" : "text-[#9a9290]"}`}>
          {otherUserStatus.isOnline ? "Online" : formatLastSeen(otherUserStatus.lastSeen)}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-[5px] px-[14px] mb-[15px]">
        <button
          onClick={() => setActiveTab("docs")}
          className={`flex-1 py-[6px] rounded-[16px] text-[12px] font-medium transition-all ${
            activeTab === "docs" ? "bg-[#f47f7f] text-white shadow-[0_3px_9px_rgba(243,124,124,0.30)]" : "bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1]"
          }`}
        >
          <FontAwesomeIcon icon={faFileAlt} className="mr-1" /> Docs
        </button>
        <button
          onClick={() => setActiveTab("images")}
          className={`flex-1 py-[6px] rounded-[16px] text-[12px] font-medium transition-all ${
            activeTab === "images" ? "bg-[#f47f7f] text-white shadow-[0_3px_9px_rgba(243,124,124,0.30)]" : "bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1]"
          }`}
        >
          <FontAwesomeIcon icon={faImages} className="mr-1" /> Images
        </button>
      </div>

     {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-[14px] custom-scrollbar">
        {activeTab === "images" && (
          <div className="grid grid-cols-3 gap-[8px]">
            {imageFiles.slice(0, visibleCount).map((file, i) => (
              <img
                key={i}
                src={file.file_url}
                alt="Media"
                className="w-full h-[75px] object-cover rounded-[10px] cursor-pointer hover:scale-105 transition"
                onClick={() => setPreviewImage(file.file_url)}
              />
            ))}
          </div>
        )}

        {activeTab === "docs" && (
          <div className="flex flex-col gap-[8px]">
            {docFiles.slice(0, visibleCount).map((file, i) => (
              <div key={i} className="flex items-center gap-[10px] bg-[#f6f2ee] rounded-[10px] p-[10px]">
                <div className="w-[34px] h-[34px] rounded-[8px] bg-white flex items-center justify-center text-[#9a9290]">
                  <FontAwesomeIcon className="text-red-400" icon={getFileIcon(file.file_url)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#181818] truncate">{file.file_url.split("/").pop()}</p>
                </div>
                <button onClick={() => window.open(file.file_url, "_blank")} className="text-[#bab0a8] hover:text-[#f47f7f] cursor-pointer">
                  <FontAwesomeIcon icon={faCircleDown} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ✅ Load More Button */}
        {hasMore && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 12)}
            className="w-full mt-4 py-2 text-[12px] text-[#f47f7f] font-bold bg-[#fff1f1] rounded-[10px] hover:bg-[#f47f7f] hover:text-white transition cursor-pointer"
          >
            Load More
          </button>
        )}
      </div>

      {/* Footer / Remove Button */}
      <div className="p-[20px] border-t border-[#f2ede8]">
        <button
          className="w-full py-[10px] rounded-[11px] bg-[#fff5f5] text-[#d95f5f] text-[13px] font-bold hover:bg-[#f47f7f] hover:text-white transition-all cursor-pointer"
          onClick={() => setShowConfirm(true)}
        >
          Remove Conversation
        </button>
      </div>

      <ConfirmPopup
        show={showConfirm}
        message="Are you sure you want to leave this conversation?"
        onConfirm={handleRemove}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Preview Modal */}
{previewImage && (
  <ModalPortal>
            <div 
              className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4" 
              onClick={() => setPreviewImage(null)}
            >
                <button 
                  onClick={() => setPreviewImage(null)} 
                  className="absolute top-5 right-5 text-white text-3xl cursor-pointer"
                >
                  ✕
                </button>
                <img 
                  src={previewImage} 
                  className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl" 
                  alt="Preview" 
                  onClick={(e) => e.stopPropagation()} 
                />
                <div className="mt-6 flex gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadImage(previewImage); }}
                    className="bg-[#f47f7f] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#d95f5f] cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faCircleDown} className="mr-2" /> Download
                  </button>
                </div>
            </div>
         </ModalPortal>
)}
    </div>
  );
};

export default ChatUserInfo;