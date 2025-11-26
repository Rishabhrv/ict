import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

const ShareMessageModal = ({
  isOpen,
  onClose,
  token,
  API_URL,
  currentUser,
  onShare,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // 🔹 Fetch all users
  useEffect(() => {
    if (!isOpen) return;

    fetch(`${API_URL}/all_users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const users = Array.isArray(data) ? data : [];
        const others = users.filter((u) => u.id !== currentUser.id);
        setAllUsers(others);
        setFilteredUsers(others);
      })
      .catch((err) => console.error("Error fetching users:", err));
  }, [isOpen, API_URL, token, currentUser]);

  // 🔹 Filter users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredUsers(
      allUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, allUsers]);

  // 🔹 Select or deselect user
  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed top-0 left-0 h-full w-[370px] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">Share Message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f37c7c]"
          />
        </div>

        {/* Users List */}
        <div className="overflow-y-auto max-h-[75vh] tiny-scrollbar p-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const initials = user.username
                ? user.username.slice(0, 2).toUpperCase()
                : "U";
              const isSelected = selectedUsers.includes(user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer mb-1 transition ${
                    isSelected ? "bg-[#f37c7c]/10" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-white font-semibold text-sm mr-3 ${
                      isSelected
                        ? "bg-[#f37c7c]"
                        : "bg-[#f37c7c]/80 text-white"
                    }`}
                  >
                    {initials}
                  </div>
                  <div className="text-gray-700 text-sm font-medium">
                    {user.username}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-400 text-sm mt-4">
              No users found
            </p>
          )}
        </div>

        {/* Floating Share Button */}
        <button
          onClick={() => onShare(selectedUsers)}
          disabled={selectedUsers.length === 0}
          className={`fixed bottom-10 left-[165px] bg-[#f37c7c] text-white p-3 rounded-full shadow-lg transition-all cursor-pointer ${
            selectedUsers.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#ef6061]"
          }`}
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </>
  );
};

export default ShareMessageModal;
