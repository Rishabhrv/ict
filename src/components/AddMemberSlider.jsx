import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import CreateGroupSlider from "./CreateGroupSlider";

const AddMemberSlider = ({ isOpen, onClose, token, user, API_URL, onAddMembers }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showGroupSlider, setShowGroupSlider] = useState(false);

  // 🔹 Fetch all users on open
  useEffect(() => {
  if (isOpen) {
    fetch(`${API_URL}/all_users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const users = Array.isArray(data) ? data : [];

        // ✅ Filter out logged-in user
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
      allUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term)
      )
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
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-40 "></div>}

      {/* Main Slider */}
      <div
        className={`fixed top-0 left-0 h-full w-90 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-17" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 py-2 pt-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-500">Add Members</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 relative">
          {/* Selected users */}
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center bg-[#f37c7c]/10 text-[#f37c7c] px-2 py-1 rounded-full text-sm"
              >
                {user.username}
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search by Name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 rounded-full px-3 py-2 focus:ring-2 focus:ring-[#f37c7c] outline-none"
          />

          {/* Users List */}
          <div className="rounded-lg overflow-y-auto max-h-[65vh] z-50 tiny-scrollbar mt-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="px-3 py-2 hover:bg-[#f37c7c]/10 cursor-pointer flex rounded-lg my-2"
                >
                  <p className="bgcolor rounded-full text-white p-2 px-[3%]">
                    {user.username ? user.username.slice(0, 2).toUpperCase() : ""}
                  </p>
                  <p className="text-gray-500 ml-5 mt-1">{user.username}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center mt-4">No users found</p>
            )}
          </div>

          {/* Proceed to group slider */}
          <button
            onClick={() => {
              if (selectedUsers.length === 0) {
                alert("Select at least one member!");
                return;
              }
              setShowGroupSlider(true);
            }}
            className="fixed bottom-10 left-40 bg-[#f37c7c] text-white mt-6 p-3 rounded-full hover:bg-[#ef6061] transition"
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
          console.log("✅ Final group data:", data);
          onAddMembers(data);
          setShowGroupSlider(false);
          onClose();
        }}
      />
    </>
  );
};

export default AddMemberSlider;
