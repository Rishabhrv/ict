// src/components/AddMemberSlider.jsx
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faTimes } from "@fortawesome/free-solid-svg-icons";
import CreateGroupSlider from "./CreateGroupSlider";


const AddMemberSlider = ({ isOpen, onClose, token, user, API_URL, onAddMembers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showGroupSlider, setShowGroupSlider] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");

  // 🔹 Fetch all users
  useEffect(() => {
    if (isOpen) {
      fetch(`${API_URL}/all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const users = Array.isArray(data) ? data : [];
          const filtered = users.filter((u) => u.id !== user?.id);
          setAllUsers(filtered);
          setFilteredUsers(filtered);
        })
        .catch((err) => console.error("Error fetching users:", err));
    }
  }, [isOpen, API_URL, token, user?.id]);

  // 🔹 Filter users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredUsers(
      allUsers.filter((u) => u.username?.toLowerCase().includes(term))
    );
  }, [searchTerm, allUsers]);

  const handleSelectUser = (user) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm("");
  };

  const handleRemoveUser = (id) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== id));
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
          <h2 className="text-[18px] font-bold text-[#181818] font-['Outfit',sans-serif]">Add Members</h2>
        </div>

        {/* Content */}
        <div className="p-[14px]">
          {/* Selected users chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-[6px] mb-[15px]">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="flex items-center px-[10px] py-[4px] text-[11px] font-medium rounded-[8px] bg-[#fff1f1] text-[#f47f7f]"
                >
                  {user.username}
                  <FontAwesomeIcon 
                    icon={faTimes} 
                    className="ml-2 cursor-pointer hover:text-red-700" 
                    onClick={() => handleRemoveUser(user.id)}
                  />
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <input
            type="text"
            placeholder="Search by name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-[10px] px-[14px] bg-[#f6f2ee] border-[1.5px] border-transparent rounded-[11px] text-[13px] text-[#333] outline-none transition-all focus:bg-white focus:border-[#f8b0b0] placeholder:text-[#bab0a8] mb-[10px]"
          />

          {/* Users List */}
          <div className="overflow-y-auto custom-scrollbar max-h-[70vh] mt-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`px-[10px] py-[8px] cursor-pointer flex items-center rounded-[10px] my-1 transition-colors ${
                    selectedUsers.find(u => u.id === user.id) ? "bg-[#fff1f1]" : "hover:bg-[#fdf8f7]"
                  }`}
                >
                  {/* ✅ Avatar with Image Support */}
                  <div className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white font-bold text-[11px] bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] overflow-hidden shrink-0">
                    {user.profile_image ? (
                      <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user.username ? user.username.slice(0, 2).toUpperCase() : "??"
                    )}
                  </div>
                  <p className="text-[14px] font-medium text-[#181818] ml-[12px]">{user.username}</p>
                </div>
              ))
            ) : (
              <p className="text-[#9a9290] text-[12px] text-center mt-4">No users found</p>
            )}
          </div>

          {/* Proceed Button */}
          <button
            onClick={() => {
              if (selectedUsers.length === 0) {
                setPopupMsg("Please select at least one member!");
                return;
              }
              setShowGroupSlider(true);
            }}
            className="absolute bottom-6 right-6 w-[50px] h-[50px] flex items-center justify-center rounded-full bg-gradient-to-r from-[#f47f7f] to-[#d95f5f] text-white shadow-[0_4px_12px_rgba(243,124,124,0.30)] hover:scale-105 transition-all cursor-pointer"
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </div>

      {/* Group Creation Slider */}
      <CreateGroupSlider
        isOpen={showGroupSlider}
        onClose={() => setShowGroupSlider(false)}
        selectedUsers={selectedUsers}
        onCreateGroup={(data) => {
          onAddMembers(data);
          setShowGroupSlider(false);
          onClose();
          window.location.reload();
        }}
      />

      {/* Popup */}
      {popupMsg && (
        <>
           <div className="fixed inset-0 bg-[#2e2e2e69] bg-opacity-30 z-[140] transition-opacity h-full blur-[2px]"></div>
           <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-[16px] z-[150] flex flex-col items-center min-w-[300px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
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

export default AddMemberSlider;