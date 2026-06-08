import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck, faCamera, faTimes } from "@fortawesome/free-solid-svg-icons";
import { Users } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;

const CreateGroupSlider = ({ isOpen, onClose, selectedUsers, onCreateGroup }) => {
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [popupMsg, setPopupMsg] = useState("");
  const storedSession = localStorage.getItem("session_id");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setPopupMsg("Please enter a group name!");
      return;
    }

    const formData = new FormData();
    formData.append("group_name", groupName);
    if (groupImage) formData.append("group_image", groupImage);
    formData.append("members", JSON.stringify(selectedUsers.map((u) => u.id)));
    formData.append("session_id", storedSession);

    try {
      const res = await fetch(`${API_URL}/create_group`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setPopupMsg("✅ Group created successfully!");
        setTimeout(() => {
          onCreateGroup(data.group);
          onClose();
          window.location.reload();
        }, 1000);
      } else {
        setPopupMsg("❌ Failed to create group.");
      }
    } catch (err) {
      console.error("Error creating group:", err);
      setPopupMsg("❌ Error connecting to server.");
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"></div>}

      {/* Slider */}
      <div
        className={`fixed top-0 left-0 h-full w-[296px] bg-white shadow-[0_0_20px_rgba(0,0,0,0.08)] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } font-['Plus_Jakarta_Sans',sans-serif]`}
      >
        {/* Header */}
        <div className="flex items-center gap-[15px] pt-[20px] px-[14px] pb-[15px] border-b border-[#f2ede8]">
          <button onClick={onClose} className="text-[#9a9290] hover:text-[#f47f7f] transition cursor-pointer">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h2 className="text-[18px] font-bold text-[#181818] font-['Outfit',sans-serif]">Create Group</h2>
        </div>

        {/* Content */}
        <div className="p-[14px]">
          {/* Group Image Upload */}
          <div className="flex flex-col items-center mb-[20px] mt-[10px]">
            <label className="cursor-pointer relative group">
              <div className="w-[80px] h-[80px] rounded-full bg-[#f6f2ee] flex items-center justify-center text-[#c0b8b0] border-2 border-dashed border-[#ede5e0] overflow-hidden">
                {preview ? (
                  <img src={preview} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8" />
                )}
                {/* Camera Icon Overlay */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <FontAwesomeIcon icon={faCamera} className="text-white text-lg"/>
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <p className="text-[11px] text-[#9a9290] mt-[8px]">Upload Group Icon</p>
          </div>

          {/* Group Name Input */}
          <input
            type="text"
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full py-[10px] px-[14px] bg-[#f6f2ee] border-[1.5px] border-transparent rounded-[11px] text-[13px] text-[#333] outline-none transition-all focus:bg-white focus:border-[#f8b0b0] placeholder:text-[#bab0a8] mb-[15px]"
          />

          {/* Selected Members */}
          <div className="mb-[20px]">
            <p className="text-[12px] font-semibold text-[#181818] mb-[8px]">Selected Members</p>
            <div className="flex flex-wrap gap-[8px]">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-[6px] pl-[4px] pr-[10px] py-[4px] text-[11px] font-medium rounded-full bg-[#fff1f1] text-[#f47f7f] border border-[#ffdede]"
                >
                  <div className="w-[20px] h-[20px] rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] flex items-center justify-center text-white text-[9px] font-bold">
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        (user.username || "U").substring(0, 2).toUpperCase()
                    )}
                  </div>
                  {user.username}
                  <FontAwesomeIcon 
                    icon={faTimes} 
                    className="ml-2 cursor-pointer hover:text-red-700" 
                    onClick={() => { /* assume parent component handles removal */ }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-[10px] rounded-[11px] bg-gradient-to-r from-[#f47f7f] to-[#d95f5f] text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(243,124,124,0.30)] hover:shadow-[0_6px_16px_rgba(243,124,124,0.40)] transition-all cursor-pointer"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Popup */}
      {popupMsg && (
        <>
           <div className="fixed inset-0 bg-[#2e2e2e69] bg-opacity-30 z-[140] transition-opacity h-full blur-[2px]"></div>
           <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-[16px] z-[150] flex flex-col items-center min-w-[300px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] font-['Plus_Jakarta_Sans',sans-serif]">
            <h2 className="text-[#181818] text-[20px] font-bold mb-2">Message</h2>
            <div className="text-[#d95f5f] bg-[#fff5f5] px-4 py-3 rounded-[10px] text-[14px] my-3 font-medium text-center">
              {popupMsg}
            </div>
            <button
              onClick={() => setPopupMsg("")}
              className="bg-[#f47f7f] text-white py-[6px] px-[20px] rounded-[10px] hover:bg-[#d95f5f] transition-all font-medium mt-2"
            >
              OK
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default CreateGroupSlider;