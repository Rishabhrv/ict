// HomePageGroupMsg.jsx
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
  faCircleInfo,
  faEllipsisVertical,
} from "@fortawesome/free-solid-svg-icons";
import { Smile, Send, Users } from "lucide-react";
import { createSocket, getSocket } from "../socket";
import BackImage from "../components/Images/1211.jpg";
import EmojiPicker from "emoji-picker-react";
import ShareMessageModal from "./ShareMessageModal";
import GroupChatInfo from "./GroupChatInfo";

const API_URL = process.env.REACT_APP_API_URL;

const HomePageGroupMsg = ({ token, conversation, user, onNewMessage }) => {
  // --- UI states (kept same names / structure) ---
  const [showMenu, setShowMenu] = useState(null);

  // --- Chat states ---
  const [messages, setMessages] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [messageToShare, setMessageToShare] = useState(null);
  const [reactions, setReactions] = useState({}); // { message_id: [{emoji,count}, ...] }
  const [selectedMsgInfo, setSelectedMsgInfo] = useState(null);
  const [reactionPicker, setReactionPicker] = useState({ show: false, msgId: null });
  const [typingUsers, setTypingUsers] = useState([]); // list of usernames typing
  const [dragActive, setDragActive] = useState(false);
  

  // GROUP id default — keep using a dynamic conversation prop if provided
  const GROUP_ID = conversation?.group_id || conversation?.id || "";

  // socket
  const socketRef = useRef(null);

  // message refs for scrolling / reply jump
  const messagesRef = useRef(null);
  const messageRefs = useRef({});

  // create socket once when token available
  useEffect(() => {
    if (!token) return;
    // ensure socket is created and available globally (same as 1:1)
    const s = getSocket() || createSocket(token);
    socketRef.current = s;

    // join this group room
    s.emit("join_group", { token, group_id: GROUP_ID });

    // new group message
    // new group message (with reply support)
s.on("new_group_message", (msg) => {
  const unified = {
    id: msg.id,
    sender_id: msg.sender_id,
    sender_name: msg.sender_name,
    message: msg.message,
    message_type: msg.message_type || msg.type,
    timestamp: msg.timestamp,
    reply_to: msg.reply_to || null,
    reply_to_user: msg.reply_to_user || null,
    reply_to_text: msg.reply_to_text || null,
  };

  setMessages((prev) => [
    ...prev,
    {
      ...unified,
      reply_to_message: unified.reply_to
        ? {
            sender_name: unified.reply_to_user,
            message: unified.reply_to_text,
          }
        : null,
    },
  ]);


  // notify parent
  if (typeof onNewMessage === "function") {
    onNewMessage({
      groupId: GROUP_ID,
      message: unified.message,
      message_type: unified.message_type,
      timestamp: unified.timestamp,
    });
  }

  // ✅ Auto scroll
  setTimeout(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, 40);
});


    // reaction updates
    s.on("group_reaction_update", (data) => {
      setReactions(prev => ({
        ...prev,
        [data.message_id]: data.reactions || []
      }));
    });

    // typing events
    s.on("group_typing", (d) => {
      // d: { group_id, username, typing: true/false }
      if (d.group_id !== GROUP_ID) return;
      setTypingUsers((prev) => {
        if (d.typing) {
          if (prev.includes(d.username)) return prev;
          return [...prev, d.username];
        } else {
          return prev.filter((u) => u !== d.username);
        }
      });
    });

    return () => {
      s?.off("new_group_message");
      s?.off("group_reaction_update");
      s?.off("group_typing");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, GROUP_ID]);

 // load initial history (WITH REPLY SUPPORT)
useEffect(() => {
  if (!token || !GROUP_ID) return;


  fetch(`${API_URL}/group_messages/${GROUP_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {

      const unified = (Array.isArray(data) ? data : []).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_name, // ✅ fixed
        message: m.message,
        reply_to_user: m.reply_to_user ,
        message_type: m.message_type || m.type || (m.url ? "file" : "text"),
        timestamp: m.timestamp,
        reply_to: m.reply_to || null,
        original_name: m.original_name || null,

        // ✅ fix reply mapping
        reply_to_message: m.reply_message
          ? {
              sender_name: m.sender_name, 
              message: m.reply_message,
            }
          : null,
      }));


      setMessages(unified);

      const reactionData = {};
      data.forEach((m) => {
        reactionData[m.id] = m.reactions || [];
      });
      setReactions(reactionData);

      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 40);
    })
    .catch((err) => console.error("❌ Group messages load error:", err));
}, [token, GROUP_ID]);




  // ----- drag & drop / paste handling -----
  useEffect(() => {
    const handlePaste = (e) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let it of items) {
        if (it.kind === "file") {
          const file = it.getAsFile();
          if (file) {
            setPendingFiles((prev) => [...prev, file]);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    // limit max 5 files similar to your backend rules
    const MAX = 5;
    const toAdd = files.slice(0, MAX - pendingFiles.length);
    setPendingFiles((prev) => [...prev, ...toAdd]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX = 5;
    const toAdd = files.slice(0, MAX - pendingFiles.length);
    setPendingFiles((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  // helper: upload files to server then emit group messages for each uploaded file
  const uploadAndSendFiles = async () => {
    if (!pendingFiles.length) return;
    const formData = new FormData();
    pendingFiles.forEach((f) => formData.append("file", f));
    formData.append("username", user?.username || "guest");

    try {
      const resp = await fetch(`${API_URL}/upload_file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) {
        console.error("Upload failed:", data);
        return;
      }
      const uploads = data.uploads || [];
      const s = socketRef.current;
      uploads.forEach((u, idx) => {
        const file = pendingFiles[idx];
        const url = u.url;
        const message_type = file.type && file.type.startsWith("image/") ? "image" : "file";
        // emit group socket event
        s?.emit("send_group_message", {
          token,
          group_id: GROUP_ID,
          message: url,
          message_type,
        });
      });
      setPendingFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  // send text message (and handle pending files)
  const sendMessage = async () => {
    const s = socketRef.current;
    if (!s) return;

    // first send text if present (and possibly reply_to)
    if (input.trim()) {
      s.emit("send_group_message", {
        token,
        group_id: GROUP_ID,
        message: input.trim(),
        message_type: "text",
        reply_to: replyingTo ? replyingTo.id : null,
      });
      setInput("");
      setReplyingTo(null);
    }

    // then upload files if any
    if (pendingFiles.length > 0) {
      await uploadAndSendFiles();
    }
  };

  // copy/paste a file URL to message (if user pastes a url as text) — handled as normal text message
  // ---- message helpers for UI ----
  const isMine = (msg) => msg.sender_id === user?.id;

  const formatTime = (ts) => {
    if (!ts) return "";
    // backend stores timestamp as "YYYY-MM-DD HH:MM:SS" — extract HH:MM:SS
    try {
      const match = ("" + ts).match(/\d{2}:\d{2}:\d{2}/);
      if (!match) return new Date(ts).toLocaleTimeString();
      const [h, m] = match[0].split(":").map(Number);
      let hours = h;
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
    } catch {
      return new Date(ts).toLocaleTimeString();
    }
  };

  // delete message (only sender allowed)
  const handleDelete = async (msg) => {
  if (!isMine(msg)) return alert("You can only delete your own messages");
  if (!window.confirm("Delete this message?")) return;

  // ✅ Save current scroll position & scroll height before delete
  const mBox = messagesRef.current;
  const prevScrollTop = mBox.scrollTop;
  const prevScrollHeight = mBox.scrollHeight;

  try {
    const res = await fetch(`${API_URL}/delete_group_message/${msg.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));

      const s = socketRef.current;
      s?.emit("delete_group_message", { id: msg.id, group_id: GROUP_ID });

      // ✅ After state update, restore scroll position correctly
      setTimeout(() => {
        const newScrollHeight = mBox.scrollHeight;
        const heightDiff = newScrollHeight - prevScrollHeight;
        mBox.scrollTop = prevScrollTop + heightDiff;
      }, 0);

    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete");
    }

  } catch (err) {
    console.error("Delete error:", err);
  }
};


// Function to convert date into WhatsApp style labels
const getDayLabel = (timestamp) => {
  const msgDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    msgDate.getDate() === today.getDate() &&
    msgDate.getMonth() === today.getMonth() &&
    msgDate.getFullYear() === today.getFullYear();

  const isYesterday =
    msgDate.getDate() === yesterday.getDate() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  // Example: 10 Nov 2025
  return msgDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};



  // reactions (toggle)
  const handleAddReaction = (message_id, emoji) => {
    const s = socketRef.current;
    if (!s) return;
    s.emit("send_group_reaction", {
      token,
      message_id,
      emoji,
    });
    // optimistic update: toggle locally (but exact counts come from reaction_update)
    setReactions((prev) => {
      const cur = prev[message_id] || [];
      // check if emoji exists
      const found = cur.find((r) => r.emoji === emoji);
      if (found) {
        // reduce count or remove
        const updated = cur.map((r) => (r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1) } : r)).filter(r => r.count>0);
        return { ...prev, [message_id]: updated };
      } else {
        return { ...prev, [message_id]: [{ emoji, count: 1 }, ...(prev[message_id] || [])] };
      }
    });
  };

  // click on share: open modal (or fallback prompt)
  const handleShare = (msg) => {
    setMessageToShare(msg);
    setShowShareModal(true);
  };

  // when share modal returns selected user ids
  const doShareToUsers = async (selectedUserIds) => {
    if (!messageToShare || !selectedUserIds?.length) return;
    // re-use ShareMessageModal logic from 1:1: create conversation then socket send_message for each
    const s = socketRef.current;
    for (const targetUserId of selectedUserIds) {
      try {
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
        if (!data.success) continue;
        const conv = data.conversation;
        // send via socket (1:1 send_message event)
        s?.emit("send_message", {
          token,
          conversation_id: conv.id,
          message: messageToShare.message || messageToShare.message,
          message_type: messageToShare.message_type === "image" ? "image" : (messageToShare.message_type === "file" ? "file" : "text"),
        });
      } catch (err) {
        console.error("Share to user error:", err);
      }
    }
    setShowShareModal(false);
    setMessageToShare(null);
  };

  // message info modal show
  const openInfo = (msg) => {
    setSelectedMsgInfo(msg);
    setShowMenu(null);
  };

  // scroll to message (when clicking reply block)
  const scrollToMessage = (msgId) => {
  const el = messageRefs.current[msgId];
  if (el && messagesRef.current) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // ✨ Highlight temporarily
    el.classList.add("bg-gray-100");
    setTimeout(() => {
      el.classList.remove("bg-gray-100");
    }, 1500);
  }
};

  // typing indicator emit
  const emitTyping = (isTyping) => {
    const s = socketRef.current;
    if (!s) return;
    s.emit("group_typing", { token, group_id: GROUP_ID, username: user?.username || "User", typing: isTyping });
  };

  // manage typing via input handlers
  useEffect(() => {
    if (!socketRef.current) return;
    let typingTimeout = null;
    // const handler = () => {
    //   emitTyping(true);
    //   if (typingTimeout) clearTimeout(typingTimeout);
    //   typingTimeout = setTimeout(() => emitTyping(false), 1500);
    // };
    // attach listener to input changes (we have onChange already calling setInput which triggers this effect)
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto scroll on new messages (bottom) similar to 1:1
  useEffect(() => {
  if (!messagesRef.current) return;

  const isAtBottom =
    messagesRef.current.scrollHeight - messagesRef.current.scrollTop <=
    messagesRef.current.clientHeight + 80;

  if (isAtBottom) {
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }
}, [messages]);


  // ----- Render -----
  return (
    <div className="flex w-full">
      <div
        style={{
          backgroundImage: `url(${BackImage})`,
          backgroundRepeat: "repeat",
          backgroundSize: "300px 300px",
          backgroundPosition: "top left",
          width: "100%",
        }}
        className="w-full"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex border-b border-gray-200 py-3 px-6 justify-between bg-white">
          <div className="flex items-center">
            <Users className="w-11 h-11 rounded-full object-cover bg-gray-100 p-2 text-gray-600" />
            <div className="pl-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {conversation?.group_name || "Study Group"}
              </h3>
              {/* typing indicator */}
              {typingUsers.length > 0 && (
                <div className="text-xs text-gray-500">{`${typingUsers.join(", ")} typing...`}</div>
              )}
            </div>
          </div>
          <div 
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 cursor-pointer hover:text-gray-600">
            <FontAwesomeIcon icon={faBars} className="text-gray-500" />
          </div>
        </div>

        {dragActive && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-60 px-80 rounded-xl shadow-lg text-center cursor-pointer">
              <p className="text-lg font-semibold text-gray-700">Drop files here</p>
              <p className="text-sm text-gray-500">Images, Docs, Videos, etc.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className="height-of-msg pt-4 overflow-y-auto px-8 hide-scrollbar"
          ref={messagesRef}
        >
          {messages.map((rawMsg, idx) => {
            // support both shapes: {text,type,mine,id} or backend group shape
            const msg = {
              id: rawMsg.id,
              sender_id: rawMsg.sender_id,
              sender_name: rawMsg.sender_name || rawMsg.sender || "User",
              message: rawMsg.message || rawMsg.text || "",
              message_type: rawMsg.message_type || rawMsg.type || (rawMsg.url ? "file" : "text"),
              timestamp: rawMsg.timestamp || rawMsg.time || rawMsg.created_at || "",
              original_name: rawMsg.original_name || rawMsg.name || null,
            
              // ✅ ADD THESE TWO LINES
              reply_to: rawMsg.reply_to || null,
              reply_to_message: rawMsg.reply_to_message || null,
              reply_to_user: rawMsg.reply_to_user || null,
            };


            const mine = isMine(msg);
            const currentLabel = getDayLabel(msg.timestamp);
            const prevLabel = idx > 0 ? getDayLabel(messages[idx - 1].timestamp) : null;

            return (
              <React.Fragment key={msg.id || idx}>
                {/* date header (if message has date field you used earlier) */}
                {/* your original UI displayed msg.date — backend doesn't provide that; keep compatibility */}
                
                {currentLabel !== prevLabel && (
                  <div className="flex justify-center my-3">
                    <div className="text-center text-gray-500 text-xs bg-gray-200 px-3 py-1 rounded-full shadow-sm">
                      {currentLabel}
                    </div>
                  </div>
                )}

                <div 
                
                  ref={(el) => {
                            if (el) messageRefs.current[msg.id] = el;
                          }}
                  
                className={`flex ${mine ? "justify-end" : "justify-start"} mb-2 group relative`}>
                  <div >
                    
                    <div className="flex my-1">
                      <div>
                        {/* ✅ ADD THIS HERE */}
                          {!mine && (
                            <p className="text-[12px] font-semibold text-[#fd4242ff] mb-1 pl-1 capitalize">
                              {msg.sender_name}
                            </p>
                          )}
                        <div
                          className={`w-fit max-w-xs px-1 py-1 rounded-xl ${
                            mine ? "bg-[#f37c7c] text-white rounded-br-sm" : "bg-gray-200 text-gray-900 rounded-bl-sm"
                          }`}
                          
                        >
                          
                        {msg.reply_to && (
  <div
    className={`text-xs mb-1 p-1 rounded-md cursor-pointer hover:bg-gray-100 transition ${
      mine ? "border-white bg-white text-red-700" : "border-gray-400 bg-white text-red-700"
    }`}
    onClick={() => scrollToMessage(msg.reply_to)}
  >
    {/* 🧍 Username */}
    <p className="truncate font-semibold">
      {msg.reply_to_message?.sender_name || "Message Deleted"}
    </p>

    {/* 🧠 Auto-detect message type */}
    {(() => {
      const replyText = msg.reply_to_message?.message || "";

      // 🖼️ IMAGE DETECTION
      if (
        replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i) ||
        (replyText.startsWith("http") &&
          replyText.includes("/uploads/") &&
          replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i))
      ) {
        return (
          <div className="flex items-center gap-2 mt-1 cursor-pointer">
            <img
              src={replyText}
              alt="reply-img"
              className="w-[100%] h-20 rounded"
            />
          </div>
        );
      }

      // 📎 FILE DETECTION (with file icons)
      if (
        replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i) ||
        (replyText.startsWith("http") &&
          replyText.includes("/uploads/") &&
          replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i))
      ) {
        const fileName = replyText.split("/").pop();
        const ext = fileName.split(".").pop().toLowerCase();

        let fileIcon = "📎";
        if (["pdf"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePdf} />;
        else if (["doc", "docx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileWord} />;
        else if (["xls", "xlsx", "csv"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileExcel} />;
        else if (["ppt", "pptx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePowerpoint} />;
        else if (["zip", "rar", "7z"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileZipper} />;
        else if (["txt"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFile} />;

        return (
          <div className="flex items-center gap-2 mt-1 cursor-pointer">
            <span className="text-[13px]">{fileIcon}</span>
            <span className="truncate max-w-[120px]">{fileName}</span>
          </div>
        );
      }

      // 💬 TEXT fallback
      return (
        <p className="truncate text-red-700 text-[12px] mt-1">
          {replyText.length > 70 ? replyText.slice(0, 70) + "..." : replyText}
        </p>
      );
    })()}
  </div>
)}


                          {/* Image */}
                          {msg.message_type === "image" && (
                            <div className="relative group">
                              <img
                                src={msg.message}
                                alt="sent"
                                className="max-w-[200px] rounded-lg cursor-pointer transition-transform duration-200 group-hover:scale-[1.03]"
                                onClick={() => window.open(msg.message, "_blank")}
                              />
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(msg.message, { mode: "cors" });
                                    const blob = await response.blob();
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = blobUrl;
                                    a.download = msg.original_name || msg.message.split("/").pop();
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(blobUrl);
                                  } catch (e) {
                                    console.error("download failed", e);
                                  }
                                }}
                                className="absolute bottom-1 right-1 text-gray-500 rounded-md text-lg opacity-0 group-hover:opacity-100 transition"
                              >
                                <FontAwesomeIcon icon={faCircleDown} />
                              </button>
                            </div>
                          )}

                          {/* File */}
                          {msg.message_type === "file" && (
                            (() => {
                              const fileUrl = msg.message;
                              const fileName = msg.original_name || fileUrl.split("/").pop();
                              const ext = (fileName || "").split(".").pop()?.toLowerCase();
                              let fileIcon = faFile;
                              let iconColor = "text-gray-500";
                              if (["pdf"].includes(ext)) { fileIcon = faFilePdf; iconColor = "text-red-400"; }
                              else if (["doc", "docx"].includes(ext)) { fileIcon = faFileWord; iconColor = "text-blue-400"; }
                              else if (["xls", "xlsx", "csv"].includes(ext)) { fileIcon = faFileExcel; iconColor = "text-green-400"; }
                              else if (["zip", "rar", "7z"].includes(ext)) { fileIcon = faFileZipper; iconColor = "text-yellow-400"; }
                              else if (["ppt", "pptx"].includes(ext)) { fileIcon = faFilePowerpoint; iconColor = "text-orange-400"; }
                              else if (["txt"].includes(ext)) { fileIcon = faFileLines; iconColor = "text-gray-400"; }

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
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                      }}
                                      className="text-[11px] text-blue-600 hover:underline"
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          )}

                          {/* Text */}
                          {msg.message_type === "text" && <p className="text-sm break-words px-2 py-1">{msg.message}</p>}
                        </div>

                        {/* reactions */}
                        {reactions[msg.id] && reactions[msg.id].length > 0 && (() => {
  // ✅ Group reactions by emoji and count them
  const group = reactions[msg.id].reduce((acc, item) => {
    acc[item.emoji] = acc[item.emoji] || 0;
    acc[item.emoji] += 1;
    return acc;
  }, {});

  return (
    <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
      {Object.keys(group).map((emoji, i) => (
        <div
          key={i}
          className="flex items-center gap-1 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5 text-sm shadow-sm cursor-pointer hover:scale-110 transition-transform"
          onClick={() => handleAddReaction(msg.id, emoji)}
        >
          <span>{emoji}</span>
          <span className="text-xs text-gray-600">{group[emoji]}</span>
        </div>
      ))}
    </div>
  );
})()}


                        {/* time + optional seen icon (group doesn't track per-user seen here) */}
                        <div className={`flex ${mine ? "justify-end" : ""}`}>
                          <p className={`text-xs pt-1 text-gray-500 ${mine ? "text-right" : "text-left"}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>

                      {/* 3-dot menu */}
                      <button
                        onClick={() => setShowMenu(showMenu === msg.id ? null : msg.id)}
                        className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition"
                      >
                        <FontAwesomeIcon icon={faEllipsisVertical} />
                      </button>

                      {/* popup */}
                      {showMenu === msg.id && (
                        <div className={`absolute ${mine ? "left-0" : "right-0"} -top-0 bg-white border border-gray-200 rounded-lg shadow-md z-20 flex`}>
                          <button
                            title="Reply"
                            onClick={() => { setReplyingTo(msg); setShowMenu(null); }}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                          >
                            <FontAwesomeIcon icon={faReply} className="mr-1" />
                          </button>

                          <button
                            title="Share"
                            onClick={() => handleShare(msg)}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                          >
                            <FontAwesomeIcon icon={faShareFromSquare} />
                          </button>

                          <div className="relative">
                            <button
                              title="Reaction"
                              onClick={() => setReactionPicker((p) => ({ show: !(p.show && p.msgId === msg.id), msgId: msg.id }))}
                              className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                            >
                              <Smile className="w-4 h-4 text-gray-600 cursor-pointer inline mr-1" />
                            </button>

                            {reactionPicker.show && reactionPicker.msgId === msg.id && (
                              <div className={`absolute top-full ${mine ? "left-0" : "right-0"} bg-white shadow-lg rounded-lg p-2 flex space-x-2 z-50`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                                  <button key={emoji} onClick={() => { handleAddReaction(msg.id, emoji); setReactionPicker({ show: false, msgId: null }); }} className="text-lg hover:scale-125 transition-transform">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            title="Info"
                            onClick={() => openInfo(msg)}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                          >
                            <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
                          </button>

                          {mine ? (
                            <button
                              title="Delete"
                              onClick={() => handleDelete(msg)}
                              className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex justify-center">
          <div className={`absolute sendmsg m-3 bottom-0 z-10 ${showInfo ? "shrink" : ""}`}>

          {/* pending files preview (keeps UI consistent with HomePageMsg) */}
        {pendingFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-3 bg-gray-100 rounded-md m-4">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative min-w-[70px] flex flex-col items-center">
                {file.type && file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-14 h-14 object-cover rounded-md border" />
                ) : (
                  <div className="w-14 h-14 flex items-center justify-center bg-white border rounded-md">
                    <FontAwesomeIcon icon={faFile} className="text-gray-500 text-xl" />
                  </div>
                )}
                <p className="text-[10px] mt-1 text-center w-[70px] truncate">{file.name}</p>
                <button onClick={() => setPendingFiles(pendingFiles.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 text-xs rounded-full cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        )}

        {replyingTo && (
  <div className="flex items-center justify-between bg-gray-100 mx-4 mb-1 px-3 py-2 rounded-lg border-l-4 border-[#f37c7c]">
    <div className="flex flex-col min-w-0">

      <span className="text-xs font-semibold text-gray-600">Replying to:</span>

      {(() => {
        const replyText = replyingTo.message || replyingTo.text || "";

        // 🖼️ IMAGE DETECTION
        if (
          replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i) ||
          (replyText.startsWith("http") &&
            replyText.includes("/uploads/") &&
            replyText.match(/\.(jpeg|jpg|png|gif|webp)$/i))
        ) {
          return (
            <div className="flex items-center gap-2 mt-1">
              <img
                src={replyText}
                alt="reply-img"
                className="w-12 h-8 rounded object-cover"
              />
            </div>
          );
        }

        // 📎 FILE DETECTION
        if (
          replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i) ||
          (replyText.startsWith("http") &&
            replyText.includes("/uploads/") &&
            replyText.match(/\.(pdf|docx?|xlsx?|pptx?|zip|csv|txt)$/i))
        ) {
          const fileName = replyText.split("/").pop();
          const ext = fileName.split(".").pop().toLowerCase();

          let fileIcon = "📎";
          if (["pdf"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePdf} />;
          else if (["doc", "docx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileWord} />;
          else if (["xls", "xlsx", "csv"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileExcel} />;
          else if (["ppt", "pptx"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFilePowerpoint} />;
          else if (["zip", "rar", "7z"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFileZipper} />;
          else if (["txt"].includes(ext)) fileIcon = <FontAwesomeIcon icon={faFile} />;

          return (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[14px] text-gray-700">{fileIcon}</span>
              <span className="text-sm text-gray-800 truncate max-w-[200px]">{fileName}</span>
            </div>
          );
        }

        // 💬 TEXT fallback
        return (
          <span className="text-sm text-gray-800 truncate max-w-[250px]">
            {replyText.length > 80 ? replyText.slice(0, 80) + "..." : replyText}
          </span>
        );
      })()}

    </div>

    <button
      onClick={() => setReplyingTo(null)}
      className="text-gray-500 hover:text-red-500 text-lg"
    >
      ✕
    </button>
  </div>
)}



        {/* Input Box */}
        <div className="flex gap-2 px-3 pb-1 w-full">
          <div className="flex w-full rounded-3xl bg-white pb-0 textarea-height shadow-all-sides py-1">
            <div className="flex justify-between items-center text-gray-600 px-2">
              <div className="flex space-x-2">
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

                <div className="relative">
                  <button type="button" onClick={() => setShowEmojiPicker((p) => !p)} className="focus:outline-none">
                    <Smile className="text-gray-600 cursor-pointer mt-1" />
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute bottom-10 left-0 z-50">
                      <EmojiPicker
                        onEmojiClick={(e) => { setInput((prev) => prev + e.emoji); setShowEmojiPicker(false); }}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            

            <textarea
              style={{ height: "40px" }}
              className="w-full outline-none text-sm mt-[1.5%] overflow-y-auto"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => { setInput(e.target.value); emitTyping(true); setTimeout(() => emitTyping(false), 1200); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={sendMessage} className="w-12 h-12 bg-[#f37c7c] hover:bg-[#e46b6b] rounded-xl flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer">
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
      </div>
        

        {/* Share modal (uses your existing ShareMessageModal if available) */}
        <ShareMessageModal
          isOpen={showShareModal}
          onClose={() => { setShowShareModal(false); setMessageToShare(null); }}
          token={token}
          API_URL={API_URL}
          currentUser={user}
          onShare={(selectedUserIds) => doShareToUsers(selectedUserIds)}
          message={messageToShare}
        />

        {/* Message Info modal */}
        {selectedMsgInfo && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white w-80 rounded-lg shadow-lg p-5 relative">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-gray-600" />
                Message Info
              </h3>

              <div className="text-sm space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-600">Sender:</span>
                  <span className="font-medium text-gray-900">{selectedMsgInfo.sender_name}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Time Sent:</span>
                  <span className="font-medium text-gray-900">{new Date(selectedMsgInfo.timestamp).toLocaleString()}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">{selectedMsgInfo.message_type}</span>
                </p>
              </div>

              <button onClick={() => setSelectedMsgInfo(null)} className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-lg">✖</button>
            </div>
          </div>
        )}
      </div>

      {showInfo && (
      <GroupChatInfo 
            token={token}
            conversation={conversation}
            user={user}
      />
      )}
    </div>
  );
};

export default HomePageGroupMsg;
