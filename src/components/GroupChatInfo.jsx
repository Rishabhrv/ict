import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faImages, faFileAlt, faCircleDown, faUserGroup, 
   faFilePdf, faFileWord, faFileExcel, 
  faFilePowerpoint, faFileLines, faFileZipper, faFile, faTimes
} from "@fortawesome/free-solid-svg-icons";
import { LogOut } from "lucide-react";
import AlertPopup from "./AlertPopup";
import ConfirmPopup from "./ConfirmPopup";

const API_URL = process.env.REACT_APP_API_URL;

const GroupChatInfo = ({ token, conversation, user }) => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [activeTab, setActiveTab] = useState("docs");
  const [allUsers, setAllUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const storedSession = localStorage.getItem("session_id");
  const [visibleCount, setVisibleCount] = useState(12);

  // ✅ Changed from just a URL string to an object to hold the name too
  const [previewData, setPreviewData] = useState(null); 

  // ✅ Updated to accept and enforce original name
  const downloadMedia = async (url, originalName) => {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = originalName || url.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) { console.error("❌ Download failed:", err); }
  };

  useEffect(() => {
    if (!conversation?.id) return;
    const fetchMediaFiles = async () => {
      try {
        const res = await fetch(`${API_URL}/get_group_media?group_id=${conversation.id}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const data = await res.json();
        if (Array.isArray(data)) setMediaFiles(data);
      } catch (err) { console.error("❌ Media fetch error:", err); }
    };
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${API_URL}/get_group_members?group_id=${conversation.id}`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        const data = await res.json();
        if (Array.isArray(data)) setGroupMembers(data);
      } catch (err) { console.error("❌ Member fetch error:", err); }
    };
    fetchMediaFiles();
    fetchMembers();
  }, [conversation, token]);

  const openAddMemberModal = async () => {
    try {
      const res = await fetch(`${API_URL}/all_users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        const filtered = data.filter(u => !groupMembers.some(m => Number(m.user_id) === Number(u.id)));
        setAllUsers(filtered);
        setShowAddModal(true);
      }
    } catch (err) { console.error("❌ User fetch error:", err); }
  };

  const addMemberToGroup = async (user_id) => {
    try {
      const res = await fetch(`${API_URL}/add_group_member`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group_id: conversation.id, session_id: storedSession, user_id })
      });
      const data = await res.json();
      if (data.success) {
        setGroupMembers([...groupMembers, data.user]);
        setAllUsers(prev => prev.map(u => u.id === user_id ? { ...u, added: true } : u));
      }
    } catch (err) { console.error("❌ Add member error:", err); }
  };

  const handleLeave = async () => {
    setShowConfirm(false);
    try {
      const res = await fetch(`${API_URL}/leave_group`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group_id: conversation.id, session_id: storedSession, user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setAlertMessage("You have left the group.");
        setShowAlert(true);
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) { setAlertMessage("❌ Error leaving group"); setShowAlert(true); }
  };

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

  // ✅ Clean name helper
  const cleanDisplayName = (filename) => {
    if (!filename) return "";
    return filename.replaceAll("_", " ");
  };

  return (
    <div className="w-[280px] min-w-[280px] bg-white border-l border-[#f2ede8] h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col items-center pt-[40px] pb-[20px] px-[20px]">
        <div className="relative mb-[16px] w-[80px] h-[80px] shrink-0">
          <div className="w-full h-full rounded-[24px] bg-gradient-to-br from-[#9ca3af] to-[#6b7280] flex items-center justify-center text-white text-[32px] font-bold shadow-xl overflow-hidden">
            {conversation?.group_image ? (
              <img src={conversation.group_image} alt="Group" className="w-full h-full object-cover" />
            ) : (
              <FontAwesomeIcon icon={faUserGroup} />
            )}
          </div>
        </div>
        <h6 className="text-[18px] font-bold text-[#181818] font-['Outfit',sans-serif] truncate max-w-full">
          {conversation.group_name || "Group"}
        </h6>
        <p className="text-[12px] text-[#9a9290]">{groupMembers.length} participants</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-[5px] px-[14px] mb-[15px]">
        <button onClick={() => setActiveTab("docs")} className={`flex-1 py-[6px] rounded-[16px] text-[12px] font-medium cursor-pointer transition-all ${activeTab === "docs" ? "bg-[#f47f7f] text-white shadow-[0_3px_9px_rgba(243,124,124,0.30)]" : "bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1]"}`}>
          <FontAwesomeIcon icon={faFileAlt} className="mr-1" /> Docs
        </button>
        <button onClick={() => setActiveTab("images")} className={`flex-1 py-[6px] rounded-[16px] text-[12px] font-medium cursor-pointer transition-all ${activeTab === "images" ? "bg-[#f47f7f] text-white shadow-[0_3px_9px_rgba(243,124,124,0.30)]" : "bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1]"}`}>
          <FontAwesomeIcon icon={faImages} className="mr-1" /> Images
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-[14px] custom-scrollbar">
        {activeTab === "images" && (
          <div className="grid grid-cols-3 gap-[8px]">
            {imageFiles.slice(0, visibleCount).map((file, i) => (
              <img 
                key={i} 
                src={file.file_url} 
                alt={file.original_name || "Media"} 
                className="w-full h-[75px] object-cover rounded-[10px] cursor-pointer hover:scale-105 transition" 
                onClick={() => setPreviewData({ url: file.file_url, name: file.original_name })} 
              />
            ))}
          </div>
        )}
        
        {activeTab === "docs" && (
          <div className="flex flex-col gap-[8px]">
            {docFiles.slice(0, visibleCount).map((file, i) => {
              // ✅ Determine display name
              const fallbackName = file.file_url.split("/").pop();
              const displayName = file.original_name || cleanDisplayName(fallbackName);

              return (
                <div key={i} className="flex items-center gap-[10px] bg-[#f6f2ee] rounded-[10px] p-[10px]">
                  <div className="w-[34px] h-[34px] rounded-[8px] bg-white flex items-center justify-center text-[#9a9290]">
                    <FontAwesomeIcon className="text-red-400" icon={getFileIcon(file.file_url)} />
                  </div>
                  <p className="text-[12px] font-medium text-[#181818] truncate flex-1 font-['Outfit',sans-serif]">
                    {displayName}
                  </p>
                  <button 
                    onClick={() => downloadMedia(file.file_url, file.original_name)} 
                    className="text-[#bab0a8] hover:text-[#f47f7f] cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faCircleDown} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <button 
            onClick={() => setVisibleCount(prev => prev + 12)}
            className="w-full mt-4 py-2 text-[12px] text-[#f47f7f] font-bold bg-[#fff1f1] rounded-[10px] hover:bg-[#f47f7f] hover:text-white transition cursor-pointer"
          >
            Load More
          </button>
        )}
        
        {/* Members List */}
        <div className="mt-[20px]">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-[#181818]">Members</p>
                <button onClick={openAddMemberModal} className="text-[#f47f7f] hover:text-[#d95f5f] text-[12px] font-bold cursor-pointer">
                    + Add
                </button>
            </div>
            {groupMembers.map((m, i) => (
                <div key={i} className="flex items-center gap-[10px] p-[8px] rounded-[10px] hover:bg-[#fdf8f7]">
                    <div className="w-[34px] h-[34px] shrink-0 bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] text-white font-semibold rounded-[10px] flex items-center justify-center text-[12px] overflow-hidden">
                        {m.profile_image ? (
                          <img src={m.profile_image} alt={m.username} className="w-full h-full object-cover" />
                        ) : (
                          m.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#181818]">{m.username}</p>
                        {m.role === "admin" && <span className="text-[9px] text-[#d95f5f] font-bold uppercase tracking-wider">Admin</span>}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-[20px] border-t border-[#f2ede8]">
        <button onClick={() => setShowConfirm(true)} className="w-full py-[10px] rounded-[11px] bg-[#fff5f5] text-[#d95f5f] text-[13px] font-bold hover:bg-[#f47f7f] hover:text-white transition-all cursor-pointer">
          <LogOut className="inline w-4 h-4 mr-2" /> Exit Group
        </button>
      </div>

      {/* ✅ Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4" onClick={() => setPreviewData(null)}>
            <button onClick={() => setPreviewData(null)} className="absolute top-5 right-5 text-white text-3xl cursor-pointer">✕</button>
            <img src={previewData.url} className="max-h-[75vh] max-w-[90vw] rounded-xl shadow-2xl" alt="Preview" onClick={(e) => e.stopPropagation()} />
            <button 
                onClick={(e) => { e.stopPropagation(); downloadMedia(previewData.url, previewData.name); }}
                className="mt-6 bg-[#f47f7f] text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-[#d95f5f] cursor-pointer"
            >
                <FontAwesomeIcon icon={faCircleDown} className="mr-2" /> Download
            </button>
        </div>
      )}

      {/* Modals & Popups */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex justify-center items-center z-50">
          <div className="bg-white w-[300px] rounded-[16px] p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[16px] font-bold text-[#181818]">Add Members</h3>
              <FontAwesomeIcon icon={faTimes} className="text-gray-400 cursor-pointer" onClick={() => setShowAddModal(false)} />
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {allUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#f6f2ee] rounded-[10px]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] text-white rounded-full flex items-center justify-center text-xs font-bold overflow-hidden">
                        {u.profile_image ? (
                          <img src={u.profile_image} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          u.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <span className="text-[13px] font-medium">{u.username}</span>
                  </div>
                  {u.added ? <span className="text-[11px] font-bold text-green-500">Added ✓</span> : (
                    <button onClick={() => addMemberToGroup(u.id)} className="text-[11px] px-3 py-1 bg-[#f47f7f] text-white rounded-[6px] hover:bg-[#d95f5f] cursor-pointer">Add</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AlertPopup show={showAlert} message={alertMessage} onClose={() => setShowAlert(false)} />
      <ConfirmPopup show={showConfirm} message="Are you sure you want to leave this group?" onConfirm={handleLeave} onCancel={() => setShowConfirm(false)} />
    </div>
  );
};

export default GroupChatInfo;