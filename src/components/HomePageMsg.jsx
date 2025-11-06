// src/components/HomePageMsg.jsx
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPaperclip,
  faCircleDown,
  faFile,
  faFilePdf,
  faFileWord,
  faFileExcel,
  faFilePowerpoint,
  faFileLines,
  faFileZipper,
  faTrash,
  faShareFromSquare,
  faReply,
  faEllipsisVertical,
} from "@fortawesome/free-solid-svg-icons";
import {
  Smile,
  Send,
  CheckCheck,
} from "lucide-react";
import { createSocket, getSocket } from "../socket";
import ChatUserInfo from "./ChatUserInfo";
import EmojiPicker from "emoji-picker-react";
import BackImage from "../components/Images/1211.jpg";
import ShareMessageModal from "./ShareMessageModal";


const API_URL = process.env.REACT_APP_API_URL;

const HomePageMsg = ({ token, conversation, user, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const socketRef = useRef(null);
  const messagesRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [popupMsg, setPopupMsg] = useState(""); // ✅ popup message state
const [showPopup, setShowPopup] = useState(false); // ✅ visibility state
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [messageToShare, setMessageToShare] = useState(null);
const [replyingTo, setReplyingTo] = useState(null);
const [selectedShareUsers, setSelectedShareUsers] = useState([])


const sendShareMessage = async () => {
  if (!selectedShareUsers.length || !messageToShare) return;

  try {
    const s = getSocket();

    // ✅ Loop over all selected users
    for (const targetUserId of selectedShareUsers) {
      // Step 1: Create or find conversation
      const res = await fetch(`${API_URL}/createConversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: targetUserId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error("Failed to create conversation");

      const newConv = data.conversation;

      // Step 2: Send message via socket
      if (s) {
        const payload = {
          token,
          conversation_id: newConv.id,
          message: messageToShare.message,
          message_type: messageToShare.message_type,
        };
        s.emit("send_message", payload);

        // Optional: notify UI
        if (typeof onNewMessage === "function") {
          onNewMessage({
            conversationId: newConv.id,
            message: messageToShare.message,
            message_type: messageToShare.message_type,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // ✅ Success cleanup
    setShowShareModal(false);
    setMessageToShare(null);
    setSelectedShareUsers([]);
    showErrorPopup("Message shared successfully ✅");
  } catch (err) {
    console.error("Share error:", err);
    showErrorPopup("Failed to share message ❌");
  }
};







 


const showErrorPopup = (message) => {
  setPopupMsg(message);
  setShowPopup(true);
  setTimeout(() => setShowPopup(false), 4000); // auto close after 4 sec
};

   // ✅ Initialize socket
  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);
    socketRef.current = s;

    s.on("connect", () => {
      // console.log("Socket connected");
    });

    // ✅ Handle new messages safely
    s.on("new_message", (msg) => {
      if (conversation && msg.conversation_id === conversation.id) {
        setMessages((prev) => {
          const exists = prev.some((m) => {
            const mIST = toIST(m.timestamp);
            const msgIST = toIST(msg.timestamp);
            return (
              m.message === msg.message &&
              m.sender_id === msg.sender_id &&
              Math.abs(mIST - msgIST) < 2000
            );
          });
          return exists ? msg : [...prev, msg];
        });

        // 🔹 Notify parent about last message update
    if (typeof onNewMessage === "function") {
      onNewMessage({
        conversationId: msg.conversation_id,
        message: msg.message,
        message_type: msg.message_type,
        timestamp: msg.timestamp,
      });
    }
      }
    });

    s.on("auth_error", (d) => {
      console.error("socket auth error", d);
    });

    return () => {
      if (s) s.off("new_message");
    };
  }, [token, conversation, onNewMessage]);

  



const handleFileChange = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));
  formData.append("username", user.username);

  try {
    const res = await fetch(`${API_URL}/upload_file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();

   if (res.ok && (data.urls || data.uploads)) {
  const s = getSocket();
  const uploaded = data.uploads || data.urls.map((u, i) => ({
    url: u,
    original_name: files[i]?.name,
  }));

 uploaded.forEach((item, i) => {
  const url = item.url || item;
  const originalName = item.original_name || files[i]?.name || "File";
  const file = files[i];

  const payload = {
    token,
    conversation_id: conversation.id,
    message: url,
    message_type: file.type.startsWith("image/") ? "image" : "file",
    original_name: originalName, // 👈 add this
  };
  s.emit("send_message", payload);
});

}


  } catch (err) {
    console.error("Upload error:", err);
    showErrorPopup("Upload failed due to network error.");
  }
};





  // ✅ Helper to convert UTC → IST
  const toIST = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(new Date(dateStr).getTime() - 5.5 * 60 * 60 * 1000);
  };

  // ✅ Fetch messages when conversation changes
  useEffect(() => {
    if (!conversation) {
      setMessages([]);
      return;
    }

    fetch(`${API_URL}/messages/${conversation.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch((err) => console.error(err));

    const s = getSocket();
    if (s && conversation) s.emit("join", { token, conversation_id: conversation.id });

    return () => {
      if (s && conversation) s.emit("leave", { conversation_id: conversation.id });
    };
  }, [conversation, token]);

  // ✅ Auto-scroll when new messages arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);


  // ✅ Send message
  const sendMessage = () => {
  if (!input.trim() || !conversation) return;
  const s = getSocket();

  const payload = {
    token,
    conversation_id: conversation.id,
    message: input.trim(),
    message_type: "text",
    reply_to: replyingTo ? replyingTo.id : null,  // ✅ Add this
  };

  if (s) {
    s.emit("send_message", payload);
    setInput("");
    setReplyingTo(null); // ✅ Clear after sending
  } else {
    console.error("Socket not connected");
  }
};


  useEffect(() => {
  if (showShareModal) {
    fetch(`${API_URL}/all_users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .catch((err) => console.error("User fetch error:", err));
  }
}, [showShareModal, token]);


    // ✅ If no conversation selected, show empty state
  if (!conversation) {
    return (
      <div className="flex flex-col w-full items-center justify-center text-gray-500 text-center h-full my-auto py-auto">
        <p className="text-lg font-semibold">No conversation selected</p>
        <p className="text-sm text-gray-400">
          Select a user from the left to start chatting 💬
        </p>
      </div>
    );
  }

  

  return (
    <div className="flex w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex border-b border-gray-200 py-4 px-6 justify-between">
          <div className="flex">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold bg-gradient-to-br from-[#f37c7c] to-[#ef6061] text-white">
              <h1 className="font-semibold text-lg">
                {conversation
                  ? (conversation.other_username || conversation.username || "U")[0].toUpperCase()
                  : "U"}
              </h1>
            </div>
                  <div className="absolute bottom-0 left-8 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              
            </div>
            
            <div className="pl-3 pt-[4px]">
              <h3 className="text-lg font-semibold text-gray-900">
                {conversation
                  ? conversation.other_username || conversation.username || "No conversation selected"
                  : "No conversation selected"}
              </h3>
              {/* <p className="text-xs mt-1">Online</p> */}
            </div>
          </div>
          <div
        className="p-2 cursor-pointer hover:text-gray-600"
        onClick={() => setShowInfo(!showInfo)}
      >
        <FontAwesomeIcon icon={faBars} className="text-gray-500"/>
      </div>
        </div>



      {/* Messages */}
        <div
          style={{
    backgroundImage: `url(${BackImage})`,
    backgroundRepeat: "repeat",       // ✅ Tile the image in all directions
    backgroundSize: "300px 300px",           // ✅ Keep original size for true repeat
    backgroundPosition: "top left",   // ✅ Start from top-left
    width: "100%",
  }}
          className=" pt-4 overflow-y-auto p-4 px-8 hide-scrollbar height-of-msg"
          ref={messagesRef}
        >


          {showPopup && (
  <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
    {popupMsg}
  </div>
)}
        {(() => {
          if (!messages.length) return <p className="text-center text-gray-400">No messages yet</p>;
      
          // ✅ Group messages by date
          const grouped = messages.reduce((acc, msg) => {
            const date = new Date(msg.timestamp);
            const dateKey = date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(msg);
            return acc;
          }, {});

          // ✅ Helper to show "Today", "Yesterday", or date
          const formatDateHeader = (dateStr) => {
            const today = new Date();
            const msgDate = new Date(dateStr);
            const diffDays = Math.floor(
              (today.setHours(0, 0, 0, 0) - msgDate.setHours(0, 0, 0, 0)) /
                (1000 * 60 * 60 * 24)
            );
      
            if (diffDays === 0) return "Today";
            if (diffDays === 1) return "Yesterday";
            return msgDate.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
          };

          return Object.keys(grouped).map((dateKey) => (
            <div key={dateKey}>
              {/* 📅 Date header */}
              <div className="flex justify-center my-3">
                <span className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-sm">
                  {formatDateHeader(dateKey)}
                </span>
              </div>
      
              {/* 💬 Messages for this date */}
              {grouped[dateKey].map((msg, idx) => {
                const mine = msg.sender_id === user?.id;
                return (
                  <div
                    key={idx}
                    className={`flex ${mine ? "justify-end" : "justify-start"} mb-2 group relative`}
                  >
                  <div>
                    <div className="flex">
                      <div>
                      <div
                        className={`w-fit max-w-xs px-[5px] py-[4px] rounded-xl  ${
                          mine
                            ? "bg-[#f37c7c] text-white rounded-br-sm ml-15"
                            : "bg-gray-300 text-gray-900 rounded-bl-sm"
                        }`}
                      >
                        
        {msg.reply_to && (
  <div
    className={`text-xs mb-1 p-1 rounded-md  ${
      mine ? "border-white bg-white text-red-700" : "border-gray-400 bg-white text-red-700"
    }`}
  >
    {/* 🧍 Username */}
    <p className="truncate font-semibold">
      {msg.reply_to_user || "User"}
    </p>

    {/* 🧠 Auto-detect message type */}
    {(() => {
      const replyText = msg.reply_to_text || "";

      // 🖼️ IMAGE DETECTION
      if (
        replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i) ||
        (replyText.startsWith("http") &&
          replyText.includes("/uploads/") &&
          replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i))
      ) {
        return (
          <div
            className="flex items-center gap-2 mt-1 cursor-pointer"
          >
            <img
              src={replyText}
              alt="reply-img"
              className="w-[100%] h-8 rounded"
            />
            
          </div>
        );
      }

      // 📎 FILE DETECTION (with file-type icons)
      if (
        replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i) ||
        (replyText.startsWith("http") &&
          replyText.includes("/uploads/") &&
          replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i))
      ) {
        const fileName = replyText.split("/").pop();
        const ext = fileName.split(".").pop().toLowerCase();

        let fileIcon = "📎";
        if (["pdf"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePdf} />; // PDF
        else if (["doc", "docx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileWord} />; // Word
        else if (["xls", "xlsx", "csv"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileExcel} />; // Excel
        else if (["ppt", "pptx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePowerpoint} />; // PowerPoint
        else if (["zip", "rar", "7z"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileZipper} />; // Compressed
        else if (["txt"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFile} />; // Text file

        return (
          <div
            className="flex items-center gap-2 mt-1 cursor-pointer"
          >
            <span className="text-[13px]">{fileIcon}</span>
            <span className="truncate max-w-[120px]">{fileName}</span>
          </div>
        );
      }

      // 💬 TEXT fallback
      return (
        <p className="truncate text-red-700 text-[12px] mt-1">
          {replyText.length > 70
            ? replyText.slice(0, 70) + "..."
            : replyText}
        </p>
      );
    })()}
  </div>
)}



                       {(() => {
  const fileUrl = msg.message;
  const fileName = fileUrl.split("/").pop();
  const fileOriginalName = msg.original_name;
  let isImage = false;
  let isFile = false;

  if (msg.message_type === "text") {
    isImage = false;
    isFile = false;
  } else if (
    msg.message_type === "image" ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl)
  ) {
    isImage = true;
  } else if (
    msg.message_type === "file" ||
    /\.(pdf|docx?|txt|zip|rar)$/i.test(fileUrl)
  ) {
    isFile = true;
  }

  if (isImage) {
    return (
      <div className="relative group">
        <img
          src={fileUrl}
          alt="sent"
          className="max-w-[200px] rounded-lg cursor-pointer transition-transform duration-200 group-hover:scale-[1.03]"
          onClick={() => window.open(fileUrl, "_blank")}
        />
        <button
          onClick={async () => {
            try {
              const response = await fetch(fileUrl, { mode: "cors" });
              const blob = await response.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = blobUrl;
              link.download = fileOriginalName || fileName || "image";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
            } catch (error) {
              console.error("Download failed:", error);
            }
          }}
          className="absolute bottom-1 right-1 text-gray-500 rounded-md text-lg opacity-0 group-hover:opacity-100 transition"
        >
          <FontAwesomeIcon icon={faCircleDown} />
        </button>
      </div>
    );
  } else if (isFile) {
    const ext = fileName.split(".").pop().toLowerCase();
    let fileIcon = faFile;
    let iconColor = "text-gray-500";
    if (["pdf"].includes(ext)) {
      fileIcon = faFilePdf;
      iconColor = "text-red-300";
    } else if (["doc", "docx"].includes(ext)) {
      fileIcon = faFileWord;
      iconColor = "text-blue-300";
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
      fileIcon = faFileExcel;
      iconColor = "text-green-300";
    } else if (["zip", "rar", "7z"].includes(ext)) {
      fileIcon = faFileZipper;
      iconColor = "text-yellow-300";
    } else if (["ppt", "pptx"].includes(ext)) {
      fileIcon = faFilePowerpoint;
      iconColor = "text-orange-300";
    } else if (["txt"].includes(ext)) {
      fileIcon = faFileLines;
      iconColor = "text-gray-300";
    }
   function cleanDisplayName(filename) {
  if (!filename) return "";
  return filename.replaceAll("_", " ");
}


    return (
      <div className="bg-white flex items-center space-x-3 border border-gray-300 rounded-lg p-2">
        <div className="bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full text-sm">
          <FontAwesomeIcon icon={fileIcon} className={iconColor} />
        </div>
        <div className="flex-1">
    <p className="text-xs font-semibold text-gray-800 w-44 break-words whitespace-normal">
      {/* Prefer clean name returned by backend */}
      {fileOriginalName || cleanDisplayName(fileName)}
    </p>

    <button
      onClick={() => {
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = fileOriginalName || cleanDisplayName(fileName);
        a.click();
      }}
      className="text-[10px] text-blue-600"
    >
      Download
    </button>
  </div>
      </div>
    );
  } else {
    return <p className="text-sm break-words ml-1 text-right">{msg.message}</p>;
  }
})()}
</div>
                  <div className={`flex  ${mine ? "justify-end" : ""}`}>
                    <p className={`text-[11px] pt-1 text-gray-500 ${mine ? "text-right" : "text-left"}`}>
                      {(() => {
                        const ts = msg.timestamp;
                        const match = ts?.match(/\d{2}:\d{2}:\d{2}/);
                        if (!match) return "";
                        const [h, m] = match[0].split(":").map(Number);
                        let hours = h;
                        const ampm = hours >= 12 ? "PM" : "AM";
                        hours = hours % 12 || 12;
                        return `${hours.toString().padStart(2, "0")}:${m
                          .toString()
                          .padStart(2, "0")} ${ampm}`;
                      })()}
                    </p>
                    {mine ? 
                    <p className="mt-auto">
                      <CheckCheck className={`w-[70%] h-[60%] pl-1 ${
                        msg.seen === 1 ? "text-blue-500 " : "text-gray-400"
                      }`}/>
                    </p>
                    : ""}
                  </div>
                      </div>
                      {/* 🕹 Three-dot menu (visible on hover) */}
                        <button
                          className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                          onClick={() => setShowMenu(showMenu === idx ? null : idx)}
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>
                      {/* 📋 Popup Menu */}
                        {showMenu === idx && (
                          <div
                            className={`absolute ${
                              mine ? "left-0" : "right-0"
                            } -top-0  bg-white border border-gray-200 rounded-lg shadow-md z-20 flex `}
                          >
                            <button
                            title="Reply"
  onClick={() => {
    
    setReplyingTo(msg);  // ✅ Store the message being replied to
    setShowMenu(null);   // Close menu
  }}
  className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
>
  <FontAwesomeIcon icon={faReply} className="mr-1" />
</button>

                            <button
                              title="Share"
                              onClick={() => {
                                setMessageToShare(msg);   
                                setShowShareModal(true);  
                              }}
                              className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                            >
                              <FontAwesomeIcon icon={faShareFromSquare} /> 
                            </button>
                            {mine ? 
                            <button
                                title="Delete"
                                onClick={async () => {   // ✅ add async here
                                  if (!window.confirm("Delete this message?")) return;
                                  try {
                                    const res = await fetch(`${API_URL}/delete_message/${msg.id}`, {
                                      method: "DELETE",
                                      headers: { Authorization: `Bearer ${token}` },
                                    });
                                    if (res.ok) {
                                      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                                      const s = getSocket();
                                      if (s) s.emit("delete_message", { id: msg.id, conversation_id: conversation.id });
                                    }
                                  } catch (err) {
                                    console.error("Delete error:", err);
                                  }
                                }}
                                className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            : ""}
                            
                          </div>
                        )}
                    </div>
                    
                  </div>
                </div>
                );
              })}
            </div>
          ));
        })()}
      </div>


        {/* Input Box */}
        <div className="flex gap-2 border-t border-gray-300 px-4 py-2  mt-auto">
          <div className="w-full rounded-lg bg-gray-100 pb-0 mt-2 textarea-height ">
            {replyingTo && (
  <div className="flex justify-between items-center bg-gray-200 rounded-t-lg p-2 px-3 border-l-4 border-[#f37c7c] mb-1">
    <div className="text-sm text-gray-800 w-[90%]">
      <p className="font-semibold text-gray-700">
        Replying to {replyingTo.sender_id === user.id ? "yourself" : replyingTo.sender_name || "User"}
      </p>
      <p className="truncate text-gray-600 text-xs">
        {replyingTo.message_type === "text"
          ? replyingTo.message
          : replyingTo.message_type === "image"
          ? "📷 Image"
          : "📎 File"}
      </p>
    </div>
    <button
      onClick={() => setReplyingTo(null)}
      className="text-gray-500 hover:text-gray-700"
    >
      ✖
    </button>
  </div>
)}

              <textarea
                className="w-full text-height outline-none resize-none text-sm p-3 "
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="flex justify-between items-center text-gray-600 px-2 pt-auto">
                <div className="flex space-x-3">
                  <label className=" font-semibold text-lg px-1 text-gray-500 cursor-pointer">
                    <FontAwesomeIcon icon={faPaperclip} />
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    />
                                      </label>
                                      <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="focus:outline-none"
                      >
                        <Smile className=" text-gray-600 cursor-pointer" />
                      </button>

                        {showEmojiPicker && (
                          <div className="absolute bottom-10 left-0 z-50">
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                setInput((prev) => prev + emojiData.emoji);
                                setShowEmojiPicker(false);
                              }}
                              theme="light"
                            />
                          </div>
                        )}
                      </div>

                </div>
              </div>
          </div>
            <div className="flex items-center space-x-2 mt-auto pt-auto">
              <button
                onClick={sendMessage}
                className="w-12 h-12 bgcolor-500 hover:bg-[#f37c7c] rounded-xl flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
        </div>
      </div>
      {showInfo && (
        <div className="mt-2 z-10">
          <ChatUserInfo
            token={token}
            conversation={conversation}
            user={user}
          />
        </div>
      )}


  <ShareMessageModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  token={token}
  API_URL={API_URL}
  currentUser={user}
  onShare={(selectedUserIds) => {
    setSelectedShareUsers(selectedUserIds);
    sendShareMessage(); // or handle your logic here
  }}
/>


    </div>
  );
};

export default HomePageMsg;
