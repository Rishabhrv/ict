import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck } from "@fortawesome/free-solid-svg-icons";

const API_URL = process.env.REACT_APP_API_URL;

const CreateGroupSlider = ({ isOpen, onClose, selectedUsers, onCreateGroup }) => {
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
  if (!groupName.trim()) {
    alert("Please enter a group name.");
    return;
  }

  const formData = new FormData();
  formData.append("group_name", groupName);
  if (groupImage) formData.append("group_image", groupImage);
  formData.append("members", JSON.stringify(selectedUsers.map((u) => u.id)));

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
      alert("✅ Group created successfully!");
      onCreateGroup(data.group);
      onClose();
    } else {
      alert("❌ Failed to create group.");
    }
  } catch (err) {
    console.error("Error creating group:", err);
  }
};



  return (
    <>
      {/* Overlay */}
      {isOpen && <div onClick={onClose} className="fixed inset-0 z-40"></div>}

      {/* Slider */}
      <div
        className={`fixed top-0 left-0 h-full w-90 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-17" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h2 className="text-lg font-semibold text-gray-700">Create Group</h2>
          <div></div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Group Image Upload */}
          <div className="flex flex-col items-center mb-4">
            <label className="cursor-pointer">
              {preview ? (
                <img
                  src={preview}
                  alt="Group"
                  className="w-20 h-20 rounded-full object-cover mb-2 border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mb-2">
                  +
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            <p className="text-xs text-gray-500">Click to upload group image</p>
          </div>

          {/* Group Name Input */}
          <input
            type="text"
            placeholder="Enter group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-[#f37c7c] outline-none"
          />

          {/* Show Selected Members */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2 font-medium">Members:</p>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span
                  key={user.id}
                  className="px-2 py-1 text-sm rounded-full bg-[#f37c7c]/10 text-[#f37c7c]"
                >
                  {user.username}
                </span>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="bg-[#f37c7c] w-full text-white py-2 rounded-full hover:bg-[#ef6061] transition"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            Create Group
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateGroupSlider;
