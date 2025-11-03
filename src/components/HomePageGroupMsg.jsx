// src/components/HomePageGroupMsg.jsx
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
import { Smile, Send } from "lucide-react";
import { createSocket, getSocket } from "../socket";

const API_URL = process.env.REACT_APP_API_URL;

const HomePageGroupMsg = ({ token, conversation, user, onNewMessage }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showMenu, setShowMenu] = useState(null);
  const [popupMsg, setPopupMsg] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const messagesRef = useRef(null);

  const showErrorPopup = (message) => {
    setPopupMsg(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 4000);
  };

  // ✅ Format date header like WhatsApp (Today, Yesterday, or full date)
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

  // ✅ Socket setup
  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);

    s.on("connect", () => console.log("✅ Group socket connected"));

    s.on("new_group_message", (msg) => {
      if (msg.group_id === conversation?.id) {
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

    return () => s.off("new_group_message");
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
    if (s && conversation)
      s.emit("join_group", { token, group_id: conversation.id });

    return () => {
      if (s && conversation)
        s.emit("leave_group", { group_id: conversation.id });
    };
  }, [conversation, token]);

  // ✅ Auto-scroll to bottom
  useEffect(() => {
    if (messagesRef.current)
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  // ✅ Handle file uploads
  const handleFileChange = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  if (!user.username) {
    showErrorPopup('Username not available. Please log in again.');
    return;
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));
  formData.append('username', user.username);

  try {
    const res = await fetch(`${API_URL}/upload_file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      const errMsg = data.error || 'File upload failed. Please try again.';
      showErrorPopup(errMsg);
      console.error('File upload failed:', data);
      return;
    }

    const data = await res.json();
    if (data.urls && Array.isArray(data.urls)) {
      const s = getSocket();
      data.urls.forEach((url, i) => {
        const file = files[i];
        const payload = {
          token,
          conversation_id: conversation.id,
          message: url,
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
        };
        s.emit('send_message', payload);
      });
    } else {
      showErrorPopup('Invalid response from server.');
      console.error('File upload failed:', data);
    }
  } catch (err) {
    console.error('Upload error:', err);
    showErrorPopup('Upload failed due to network error.');
  }
};

  // ✅ Send text message
  const sendMessage = () => {
    if (!input.trim()) return;
    const s = getSocket();
    s.emit("send_group_message", {
      token,
      group_id: conversation.id,
      message: input.trim(),
      message_type: "text",
    });
    setInput("");
  };

  if (!conversation)
    return (
      <div className="flex flex-col w-full items-center justify-center text-gray-500 h-full">
        <p className="text-lg font-semibold">No group selected</p>
        <p className="text-sm text-gray-400">
          Select a group to start chatting 💬
        </p>
      </div>
    );

  return (
    <div className="flex w-full">
      <div className="w-full">
        {/* Header */}
        <div className="flex border-b border-gray-200 py-4 px-6 justify-between">
          <div className="flex items-center">
            <img
              src={
                conversation.group_image
                  ? `${API_URL}${conversation.group_image}`
                  : "/default-group.png"
              }
              alt="Group"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div className="pl-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {conversation.group_name}
              </h3>
              <p className="text-xs mt-1">Group Chat</p>
            </div>
          </div>
          <div
            className="p-2 cursor-pointer hover:text-gray-600"
            onClick={() => setShowInfo(!showInfo)}
          >
            <FontAwesomeIcon icon={faBars} className="text-gray-500" />
          </div>
        </div>

        {/* Messages */}
        <div
          className="h-105 pt-4 overflow-y-auto p-4 px-8 hide-scrollbar"
          ref={messagesRef}
        >
          {showPopup && (
            <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
              {popupMsg}
            </div>
          )}

          {messages.length === 0 ? (
            <p className="text-center text-gray-400">No messages yet</p>
          ) : (
            messages.map((msg, idx) => {
              const mine = msg.sender_id === user?.id;
              const fileUrl = msg.message;
              const fileName = fileUrl.split("/").pop();
              const isImage =
                msg.message_type === "image" ||
                /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
              const isFile =
                msg.message_type === "file" ||
                /\.(pdf|docx?|xlsx?|pptx?|txt|zip)$/i.test(fileUrl);

              // ✅ Show date header when date changes
              const prevMsg = messages[idx - 1];
              const showDateHeader =
                !prevMsg ||
                new Date(prevMsg.timestamp).toDateString() !==
                  new Date(msg.timestamp).toDateString();

              return (
                <React.Fragment key={idx}>
                  {showDateHeader && (
                    <div className="flex justify-center my-3">
                      <div className="text-center text-gray-500 text-xs my-3 bg-gray-200 text-gray-700 px-3 py-1 rounded-full shadow-sm">
                        {formatDateHeader(msg.timestamp)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    } mb-2 group relative`}
                  >
                    <div>
                      <div className="flex">
                        <div
                          className={`w-fit max-w-xs px-3 py-2 rounded-2xl ${
                            mine
                              ? "bg-[#f37c7c] text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-900 rounded-bl-sm"
                          }`}
                        >
                          {isImage ? (
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
                                    const response = await fetch(fileUrl);
                                    const blob = await response.blob();
                                    const blobUrl =
                                      window.URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = blobUrl;
                                    link.download = fileName || "download";
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
                          ) : isFile ? (
                             (() => {
    const ext = fileName.split(".").pop().toLowerCase();
    let fileIcon = faFile;
    let iconColor = "text-gray-500";

    if (["pdf"].includes(ext)) {
      fileIcon = faFilePdf;
      iconColor = "text-red-400";
    } else if (["doc", "docx"].includes(ext)) {
      fileIcon = faFileWord;
      iconColor = "text-blue-400";
    } else if (["xls", "xlsx", "csv"].includes(ext)) {
      fileIcon = faFileExcel;
      iconColor = "text-green-400";
    } else if (["zip", "rar", "7z"].includes(ext)) {
      fileIcon = faFileZipper;
      iconColor = "text-yellow-400";
    } else if (["ppt", "pptx"].includes(ext)) {
      fileIcon = faFilePowerpoint;
      iconColor = "text-orange-400";
    } else if (["txt"].includes(ext)) {
      fileIcon = faFileLines;
      iconColor = "text-gray-400";
    }

    return (
      <div className="bg-white flex items-center space-x-3 border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition">
        <div className="bg-gray-100 w-9 h-9 flex items-center justify-center rounded-full">
          <FontAwesomeIcon icon={fileIcon} className={`${iconColor} text-lg`} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-800 w-44 break-words whitespace-normal">
            {fileName}
          </p>
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = fileUrl;
              a.download = fileName;
              a.click();
            }}
            className="text-[11px] text-blue-600 hover:underline"
          >
            Download
          </button>
        </div>
      </div>
    );
  })()
                          ) : (
                            <p className="text-sm break-words">
                              {msg.message}
                            </p>
                          )}
                        </div>

                        {/* 3-dot menu */}
                        <button
                          className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition"
                          onClick={() =>
                            setShowMenu(showMenu === idx ? null : idx)
                          }
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>

                        {showMenu === idx && (
                          <div
                            className={`absolute ${
                              mine ? "left-0" : "right-0"
                            } -top-0 bg-white border border-gray-200 rounded-lg shadow-md z-20 flex`}
                          >
                            <button className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left">
                              <FontAwesomeIcon icon={faReply} />
                            </button>
                            <button className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left">
                              <FontAwesomeIcon icon={faShareFromSquare} />
                            </button>
                            {mine && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Delete this message?"))
                                    return;
                                  try {
                                    const res = await fetch(
                                      `${API_URL}/delete_group_message/${msg.id}`,
                                      {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      }
                                    );
                                    if (res.ok) {
                                      setMessages((prev) =>
                                        prev.filter((m) => m.id !== msg.id)
                                      );
                                      const s = getSocket();
                                      if (s)
                                        s.emit("delete_group_message", {
                                          id: msg.id,
                                          group_id: conversation.id,
                                        });
                                    }
                                  } catch (err) {
                                    console.error("Delete error:", err);
                                  }
                                }}
                                className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <p
                        className={`text-xs pt-1 text-gray-500 ${
                          mine ? "text-right" : "text-left"
                        }`}
                      >
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
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Input Box */}
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
              <div className="flex space-x-3">
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
                <button>
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-auto pt-auto">
            <button
              onClick={sendMessage}
              className="w-12 h-12 bgcolor-500 hover:bg-[#f37c7c] rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePageGroupMsg;
