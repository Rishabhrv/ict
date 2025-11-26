import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faFileAlt, faCircleDown, faUserGroup, faPlus } from "@fortawesome/free-solid-svg-icons";
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


  useEffect(() => {
    if (!conversation?.id) return;

    // ✅ Fetch group media (images, files)
    const fetchMediaFiles = async () => {
      try {
        const res = await fetch(
          `${API_URL}/get_group_media?group_id=${conversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) setMediaFiles(data);
      } catch (err) {
        console.error("❌ Media fetch error:", err);
      }
    };

    // ✅ Fetch group members
    const fetchMembers = async () => {
      try {
        const res = await fetch(
          `${API_URL}/get_group_members?group_id=${conversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (Array.isArray(data)) setGroupMembers(data);
      } catch (err) {
        console.error("❌ Member fetch error:", err);
      }
    };

    fetchMediaFiles();
    fetchMembers();

  }, [conversation, token]);

  const imageFiles = mediaFiles.filter((f) => f.message_type === "image");
  const docFiles = mediaFiles.filter((f) => f.message_type === "file");


const openAddMemberModal = async () => {
  try {
    const res = await fetch(`${API_URL}/all_users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (Array.isArray(data)) {
      const filtered = data.filter(
        u => !groupMembers.some(m => Number(m.user_id) === Number(u.id))
      );

      setAllUsers(filtered);
      setShowAddModal(true);
    }
  } catch (err) {
    console.error("❌ User fetch error:", err);
  }
};





const addMemberToGroup = async (user_id) => {
  try {
    const res = await fetch(`${API_URL}/add_group_member`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        group_id: conversation.id,
        session_id: storedSession,
        user_id
      })
    });

    const data = await res.json();

    if (data.success) {
      setGroupMembers([...groupMembers, data.user]);

      // Update UI: mark user as added
      setAllUsers(prev =>
        prev.map(u =>
          u.id === user_id ? { ...u, added: true } : u
        )
      );
    }
  } catch (err) {
    console.error("❌ Add member error:", err);
  }
};




const handleLeave  = async () => {
  setShowConfirm(false);

  try {
    const res = await fetch(`${API_URL}/leave_group`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        group_id: conversation.id,
        session_id: storedSession,
        user_id: user.id, // OR user.id (depends on your props)
      }),
    });

    const data = await res.json();

    if (data.success) {
      setAlertMessage("You have left the group.");
      setShowAlert(true);
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setAlertMessage("Failed to leave group: ");
      setShowAlert(true);
    }
  } catch (err) {
    setAlertMessage("❌ Leave group error:");
    setShowAlert(true);
  }
};




  return (
    <div className="w-[45%] p-3 px-5 pt-10 text-center h-screen overflow-y-auto hide-scrollbar shadow-sm">

      {/* ✅ Group Avatar */}
      <div className="flex items-center justify-center">
        <div className="text-4xl bg-gray-100 rounded-full p-7 text-center px-6 text-gray-600">
          <FontAwesomeIcon icon={faUserGroup} />
        </div>
      </div>

      {/* ✅ Group Name */}
      <h6 className="text-lg my-2 font-semibold text-gray-500">
        {conversation.group_name || "Group Name"}
      </h6>

      {/* ✅ Member Count */}
      <p className="text-sm text-gray-400 mb-2">{groupMembers.length} participants</p>

      {/* ✅ Tab Switch */}
      <div className="flex justify-around my-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("docs")}
          className={`flex items-center gap-1 px-3 py-1 text-sm font-medium cursor-pointer ${
            activeTab === "docs"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          <FontAwesomeIcon icon={faFileAlt} /> Docs
        </button>

        <button
          onClick={() => setActiveTab("images")}
          className={`flex items-center gap-1 px-3 py-1 text-sm font-medium cursor-pointer ${
            activeTab === "images"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          <FontAwesomeIcon icon={faImages} /> Images
        </button>
      </div>

      {/* ✅ Images Tab */}
      {activeTab === "images" && (
        <div className="border-b border-gray-200 pb-4 grid grid-cols-3 gap-1 justify-center max-h-40 overflow-y-auto hide-scrollbar">
          {imageFiles.length ? (
            imageFiles.map((file, i) => (
              <img
                key={i}
                src={file.file_url}
                alt="img"
                onClick={() => window.open(file.file_url, "_blank")}
                className="w-20 h-20 object-cover rounded-md cursor-pointer hover:opacity-80"
              />
            ))
          ) : (
            <p className="text-gray-400 text-sm col-span-3">No images yet</p>
          )}
        </div>
      )}

      {/* ✅ Docs Tab */}
      {activeTab === "docs" && (
        <div className="border-b border-gray-200 pb-4 grid grid-cols-1 gap-2 justify-center text-left max-h-40 overflow-y-auto hide-scrollbar">
          {docFiles.length ? (
            docFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-gray-50 rounded-md p-2 hover:bg-gray-100 transition"
              >
                <FontAwesomeIcon icon={faFileAlt} className="text-gray-500" />
                <p className="text-xs font-medium text-gray-700 truncate w-40">
                  {file.file_url.split("/").pop()}
                </p>
                <button
                  onClick={() => window.open(file.file_url, "_blank")}
                  className="text-lg text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faCircleDown} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm text-center">No documents yet</p>
          )}
        </div>
      )}

       <button
        onClick={openAddMemberModal}
        className="w-full flex items-center gap-2 text-[#faa1a1ff] text-sm font-medium py-2 px-2 rounded-lg transition mb-3 cursor-pointer"
      >
        <div className="w-9 h-9 bg-[#f46c6c] text-white rounded-full flex items-center justify-center text-xs ">
          <FontAwesomeIcon icon={faPlus} />
        </div>
        Add Member
      </button>

      {/* ✅ Group Members List */}
      {/* ✅ Group Members List (WhatsApp Style) */}
<div className="text-left mb-3 mt-2 max-h-40 overflow-y-auto hide-scrollbar">
  {groupMembers.map((m, i) => (
    <div
      key={i}
      className="flex items-center justify-between px-2 py-2 hover:bg-gray-100 rounded-md transition"
    >
      <div className="flex items-center gap-3 cursor-pointer">
        {/* Avatar */}
        <div className="w-9 h-9 bg-[#f46c6c] text-white font-semibold rounded-full flex items-center justify-center text-sm">
          {m.username?.charAt(0).toUpperCase()}
        </div>

        {/* Name + Admin Badge */}
        <div className="flex gap-3">
          <span className="text-sm text-gray-800 font-medium">{m.username}</span>
          {m.role === "admin" && (
            <div>
             <span className="text-[9px] text-red-600 font-semibold border b-red-600 rounded-lg px-1 pb-[1px] mt-auto ">Group admin</span>
            </div>
          )}
        </div>
      </div>

      {/* Optional: You can add menu dots or actions here later */}
    </div>
  ))}
</div>



      {showAddModal && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    <div className="bg-white w-[300px] max-h-[400px] rounded-xl p-4 shadow-lg animate-fade-in">

      <h3 className="text-lg font-semibold text-gray-700 mb-3">Add Members</h3>

      <div className="max-h-[300px] overflow-y-auto">
        {allUsers.length === 0 && (
          <p className="text-sm text-gray-500 text-center">No users available</p>
        )}

        {allUsers.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg transition"
          >
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f46c6c] text-white rounded-full flex items-center justify-center text-sm">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{u.username}</span>
            </div>

            {/* Add Button */}
            {u.added ? (
              <span className="text-green-600 text-xs font-semibold">Added ✓</span>
            ) : (
              <button
                onClick={() => addMemberToGroup(u.id)}
                className="text-xs px-2 py-1 bg-[#f46c6c] text-white rounded-md hover:bg-[#d85a5a] transition cursor-pointer"
              >
                Add
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddModal(false)}
        className="w-full mt-3 text-sm text-gray-600 border border-gray-300 rounded-md py-1 hover:bg-gray-100 cursor-pointer"
      >
        Close
      </button>

    </div>
  </div>
)}


<div className="text-left w-full hover:bg-red-100 py-2 rounded-lg">
  <button
    onClick={() => setShowConfirm(true)}
    className="flex text-red-500 font-medium  rounded-lg  transition px-3 cursor-pointer"
  >
    <LogOut className="mr-2" />
    Exit Group
  </button>
</div>


<AlertPopup
  show={showAlert}
  message={alertMessage}
  onClose={() => setShowAlert(false)}
/>

<ConfirmPopup
  show={showConfirm}
  message="Are you sure you want to leave this group?"
  onConfirm={handleLeave}
  onCancel={() => setShowConfirm(false)}
/>



    </div>
  );
};

export default GroupChatInfo;
