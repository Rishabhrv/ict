import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPaperclip,
  // faCircleDown,
  // faFile,
  // faFilePdf,
  // faFileWord,
  // faFileExcel,
  // faFilePowerpoint,
  // faFileLines,
  // faFileZipper,
  // faTrash,
  // faShareFromSquare,
  // faReply,
  // faEllipsisVertical,
} from "@fortawesome/free-solid-svg-icons";
import { Smile, Send } from "lucide-react";
import { createSocket, getSocket } from "../socket";

const API_URL = process.env.REACT_APP_API_URL;

const HomePageGroupMsg = ({ token, conversation, user, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [popupMsg, setPopupMsg] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const messagesRef = useRef(null);

  const showErrorPopup = (message) => {
    setPopupMsg(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 4000);
  };

  // ✅ Initialize socket
  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);

    s.on("connect", () => console.log("✅ Group socket connected"));

    s.on("new_group_message", (msg) => {
      if (msg.group_id === conversation.id) {
        setMessages((prev) => [...prev, msg]);
        if (typeof onNewMessage === "function") {
          onNewMessage({
            group_id: msg.group_id,
            message: msg.message,
            message_type: msg.message_type,
            timestamp: msg.timestamp,
          });
        }
      }
    });

    return () => {
      s.off("new_group_message");
    };
  }, [token, conversation, onNewMessage]);

  // ✅ Fetch group messages
  useEffect(() => {
    if (!conversation) return;
    fetch(`${API_URL}/group_messages/${conversation.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setMessages(data))
      .catch((err) => console.error(err));

    const s = getSocket();
    if (s && conversation) s.emit("join_group", { token, group_id: conversation.id });

    return () => {
      if (s && conversation) s.emit("leave_group", { group_id: conversation.id });
    };
  }, [conversation, token]);

  // ✅ Scroll to bottom when messages update
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // ✅ Handle file upload
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

      if (res.ok && Array.isArray(data.urls)) {
        const s = getSocket();
        data.urls.forEach((url, i) => {
          const file = files[i];
          const payload = {
            token,
            group_id: conversation.id,
            message: url,
            message_type: file.type.startsWith("image/") ? "image" : "file",
          };
          s.emit("send_group_message", payload);
        });
      } else {
        showErrorPopup(data.error || "File upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showErrorPopup("Upload failed due to network error.");
    }
  };

  // ✅ Send text message
  const sendMessage = () => {
    if (!input.trim()) return;
    const s = getSocket();
    const payload = {
      token,
      group_id: conversation.id,
      message: input.trim(),
      message_type: "text",
    };
    s.emit("send_group_message", payload);
    setInput("");
  };

  // ✅ Convert timestamp → readable
  const formatTime = (ts) => {
    const date = new Date(ts);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hr = hours % 12 || 12;
    return `${hr}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  // ✅ Empty screen if no group selected
  if (!conversation)
    return (
      <div className="flex flex-col w-full items-center justify-center text-gray-500 h-full">
        <p className="text-lg font-semibold">No group selected</p>
        <p className="text-sm text-gray-400">Select a group to start chatting 💬</p>
      </div>
    );

  return (
    <div className="flex w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex border-b border-gray-200 py-4 px-6 justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src={
                conversation.group_image
                  ? `${API_URL}${conversation.group_image}`
                  : "/default-group.png"
              }
              alt="Group"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {conversation.group_name}
              </h3>
              <p className="text-xs text-gray-500">Group Chat</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:text-gray-600 text-gray-500"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        {/* Messages */}
        <div
          className="h-105 pt-4 overflow-y-auto p-4 px-8 hide-scrollbar"
          ref={messagesRef}
        >
          {showPopup && (
            <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
              {popupMsg}
            </div>
          )}

          {!messages.length ? (
            <p className="text-center text-gray-400">No messages yet</p>
          ) : (
            messages.map((msg, idx) => {
              const mine = msg.sender_id === user?.id;
              return (
                 <div
      key={idx}
      className={`flex ${mine ? "justify-end" : "justify-start"} mb-3`}
    >
      <div className="flex flex-col max-w-xs">
        {/* ✅ Show username for others */}
        {!mine && (
          <p className="text-xs text-gray-500 font-semibold mb-1 ml-1">
            {msg.sender_name || msg.username || "Unknown User"}
          </p>
        )}

        {/* ✅ Message bubble */}
        <div
          className={`w-fit px-3 py-2 rounded-2xl ${
            mine
              ? "bg-[#f37c7c] text-white rounded-br-sm self-end"
              : "bg-gray-100 text-gray-900 rounded-bl-sm"
          }`}
        >
          {msg.message_type === "image" ? (
            <img
              src={msg.message}
              alt="img"
              className="max-w-[200px] rounded-lg cursor-pointer"
              onClick={() => window.open(msg.message, "_blank")}
            />
          ) : (
            <p className="text-sm break-words">{msg.message}</p>
          )}
        </div>

        {/* ✅ Timestamp */}
        <p
          className={`text-[10px] mt-1 text-gray-500 ${
            mine ? "text-right pr-1" : "text-left pl-1"
          }`}
        >
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
              );
            })
          )}
        </div>

        {/* Input box */}
        <div className="flex gap-2 border-t border-gray-300 px-4 py-2">
          <div className="w-full rounded-lg bg-gray-100 pb-2 mt-2">
            <textarea
              className="w-full h-12 outline-none resize-none text-sm p-3"
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
            <div className="flex justify-between items-center mt-2 text-gray-600 px-2 pb-2">
              <label className="font-semibold text-lg px-1 text-gray-500 cursor-pointer">
                <FontAwesomeIcon icon={faPaperclip} />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                />
              </label>
              <Smile className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <div className="flex items-center mt-auto">
            <button
              onClick={sendMessage}
              className="w-12 h-12 bg-[#f37c7c] hover:bg-[#ef6061] rounded-xl flex items-center justify-center transition-colors"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="mt-2 z-10 w-72 bg-white border-l border-gray-200 shadow-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Group Info</h3>
          <p className="text-xs text-gray-600">Group Name: {conversation.group_name}</p>
          <p className="text-xs text-gray-600">Created By: {conversation.created_by}</p>
        </div>
      )}
    </div>
  );
};

export default HomePageGroupMsg;
