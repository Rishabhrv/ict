import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faCheck } from "@fortawesome/free-solid-svg-icons";
import {
  Users,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL;

const CreateGroupSlider = ({ isOpen, onClose, selectedUsers, onCreateGroup }) => {
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [popupMsg, setPopupMsg] = useState("");


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
      onCreateGroup(data.group);
      onClose();
      window.location.reload();

    } else {
      setPopupMsg("❌ Failed to create group.");
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
                  <Users className="w-10 h-10"/>
                </div>
              )}
              <input
                type="file"
                accept=""
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
            <p className="text-xs text-gray-500">Enter Group Name</p>
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
            className="bg-[#f37c7c] w-full text-white py-2 rounded-full hover:bg-[#ef6061] transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {popupMsg && (
        <div className="fixed inset-0 bg-[#2e2e2e69] bg-opacity-30 z-140 transition-opacity h-full blur-3xl"></div>
      )}

      {popupMsg && (
  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                  bg-white p-6 rounded-xl z-150 flex flex-col space-y-1 min-w-80 shadow-lg text-center">
    <h2 className="text-gray-800 text-2xl font-semibold">Message</h2>

    <div className="text-red-600 bg-red-50 px-10  py-3 rounded-lg text-[16px] my-3">
      {popupMsg}
    </div>

    <button
      onClick={() => setPopupMsg("")}
      className="bg-[#f37c7c] text-white py-1 px-3 rounded-lg hover:bg-[#ef6061] w-30 mx-auto mt-2"
    >
      OK
    </button>
  </div>
)}

    </>
  );
};

export default CreateGroupSlider;
