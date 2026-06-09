// HomePageGroupMsg.jsx
import React, { useState, useEffect, useRef, useCallback  } from "react";
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
  faTimes,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { Smile, Send, ArrowDown } from "lucide-react";
import { createSocket, getSocket } from "../socket";
import BackImage from "../components/Images/1211.png";
import EmojiPicker from "emoji-picker-react";
import ShareMessageModal from "./ShareMessageModal";
import GroupChatInfo from "./GroupChatInfo";
import ConfirmPopup from "./ConfirmPopup";


const API_URL = process.env.REACT_APP_API_URL;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;

const HomePageGroupMsg = ({ token, conversation, user, onNewMessage, scrollToMessageId, onScrollComplete }) => {

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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;
  const [showConfirm, setShowConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const textareaRef = useRef(null);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [formatBarPos, setFormatBarPos] = useState({ top: 0, left: 0 });
  const [expandedWords, setExpandedWords] = useState({});
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [popupMsg, setPopupMsg] = useState(""); // ✅ popup message state
  const [showPopup, setShowPopup] = useState(false); // ✅ visibility state
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReactionInfo, setShowReactionInfo] = useState(false);
  const [reactionInfo, setReactionInfo] = useState(null);
  const [activeReactionTab, setActiveReactionTab] = useState("all");
  const onNewMessageRef = useRef(onNewMessage);
  const [isChatReady, setIsChatReady] = useState(false);
    
  
  
  
  
  useEffect(() => {
  onNewMessageRef.current = onNewMessage;
}, [onNewMessage]);



const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showErrorPopup("Text copied to clipboard! ✅");
    setShowMenu(null); // Close menu after copying
  }).catch(err => console.error("Failed to copy:", err));
};
  

  // GROUP id default — keep using a dynamic conversation prop if provided
  const GROUP_ID = conversation?.group_id || conversation?.id || "";

  // socket
  const socketRef = useRef(null);

  // message refs for scrolling / reply jump
  const messagesRef = useRef(null);
  const messageRefs = useRef({});

  const menuRef = useRef(null);

const validateAndAddFiles = useCallback((files) => {
  setPendingFiles((prev) => {
    const remainingSlots = MAX_FILES - prev.length;

    if (remainingSlots <= 0) {
      showErrorPopup(`You can send maximum ${MAX_FILES} files ❌`);
      return prev;
    }

    const validFiles = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showErrorPopup(`"${file.name}" exceeds 100MB ❌`);
        continue;
      }

      if (validFiles.length < remainingSlots) {
        validFiles.push(file);
      }
    }

    if (files.length > remainingSlots) {
      showErrorPopup(`Only ${MAX_FILES} files allowed at a time ❌`);
    }

    return [...prev, ...validFiles];
  });
}, []);



  
    useEffect(() => {
      function handleClickOutside(e) {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setShowMenu(null); // 👈 CLOSE MENU
        }
      }
    
      document.addEventListener("mousedown", handleClickOutside);
    
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

useEffect(() => {
    if (!token) return;
    const s = getSocket() || createSocket(token);
    socketRef.current = s;

    s.emit("join_group", { token, group_id: GROUP_ID });

    // ⭐ 1. Store the logic in a named function
    const handleNewGroupMessage = (msg) => {
      const unified = {
        id: msg.id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        message: msg.message,
        message_type: msg.message_type || msg.type,
        timestamp: msg.timestamp,
        file_size: msg.file_size || null,
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

      if (typeof onNewMessageRef.current === "function") {
        onNewMessageRef.current({
          groupId: GROUP_ID,
          message: unified.message,
          message_type: unified.message_type,
          timestamp: unified.timestamp,
        });
      }

      if (conversation?.isGroup && msg.group_id === conversation.id) {
        fetch(`${API_URL}/group_seen/${conversation.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setTimeout(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
      }, 40);
    };

    const handleReactionUpdate = (data) => {
      setReactions(prev => ({
        ...prev,
        [data.message_id]: data.reactions || []
      }));
    };
    

    const handleGroupTyping = (d) => {
      if (d.group_id !== GROUP_ID) return;
      setTypingUsers((prev) => {
        if (d.typing) {
          if (prev.includes(d.username)) return prev;
          return [...prev, d.username];
        } else {
          return prev.filter((u) => u !== d.username);
        }
      });
    };

    // ⭐ 2. Attach the specific functions
    s.on("new_group_message", handleNewGroupMessage);
    s.on("group_reaction_update", (data) => {
    setReactions(prev => ({
      ...prev,

      [data.message_id]: data.reactions || [] 
    }));
  });
    s.on("group_typing", handleGroupTyping);

    return () => {
      // ⭐ 3. Unbind ONLY these specific handlers on unmount
      s?.off("new_group_message", handleNewGroupMessage);
      s?.off("group_reaction_update", handleReactionUpdate);
      s?.off("group_typing", handleGroupTyping);
    };
  }, [token, GROUP_ID, conversation]); // Include conversation dependency if needed

  const fetchMessageInfo = async (msgId) => {
  try {
    const res = await fetch(`${API_URL}/group_message_info/${msgId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    setSelectedMsgInfo({
      ...selectedMsgInfo,
      seen: data.seen || [],
      delivered: data.delivered || [],
      sender_id: data.sender_id 
    });
  } catch (err) {
    console.error("Error fetching message info:", err);
  }
};

const sendShareMessageToGroup = async (groupIds) => {
  if (!groupIds?.length || !messageToShare) return;

  try {
    const s = getSocket();

    const msgs = Array.isArray(messageToShare)
      ? messageToShare
      : [messageToShare];

    for (const targetGroupId of groupIds) {
      for (const msg of msgs) {
        s.emit("send_group_message", {
          token,
          group_id: targetGroupId,
          message: msg.message,
          message_type: msg.message_type,
          file_size: msg.file_size || null,
        });
      }
    }

    // cleanup
    setShowShareModal(false);
    setMessageToShare(null);
    exitMultiSelect();
    showErrorPopup("Messages forwarded to group(s) ✅");

  } catch (err) {
    console.error(err);
    showErrorPopup("Failed to forward to group ❌");
  }
};


// ✅ Jump to a message from chat search
useEffect(() => {
  if (!scrollToMessageId || !GROUP_ID) return;
  let cancelled = false;

  const timer = setTimeout(() => {
    if (cancelled) return;
    const found = messages.find(m => m.id === scrollToMessageId);

    if (found) {
      scrollToMessage(scrollToMessageId);
      onScrollComplete?.();
    } else if (messages.length > 0) {
      fetch(`${API_URL}/group_messages/${GROUP_ID}/context/${scrollToMessageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (cancelled || !Array.isArray(data) || !data.length) return;
          const unified = data.map(m => ({
            id: m.id, sender_id: m.sender_id,
            sender_name: m.sender_name || "Unknown",
            message: m.message,
            message_type: m.message_type || "text",
            timestamp: m.timestamp,
            file_size: m.file_size || null,
            reply_to: m.reply_to || null,
            reply_to_message: m.reply_to_message || null,
            reply_to_user: m.reply_to_user || null,
            original_name: m.original_name || null,
          }));
          setMessages(unified);
          setOffset(unified.length);
          setHasMore(true);
          setTimeout(() => {
            if (cancelled) return;
            scrollToMessage(scrollToMessageId);
            onScrollComplete?.();
          }, 200);
        })
        .catch(console.error);
    }
  }, 450);

  return () => { cancelled = true; clearTimeout(timer); };
}, [scrollToMessageId, GROUP_ID]); // eslint-disable-line react-hooks/exhaustive-deps



// Mark all existing messages as seen when opening the group
useEffect(() => {
  if (!conversation?.isGroup) return;
  if (!conversation?.id) return;

  fetch(`${API_URL}/group_seen/${conversation.id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}, [conversation?.id, conversation?.isGroup, token]); 


useEffect(() => {
  if (!showReactionInfo) return;

  const close = () => setShowReactionInfo(false);
  window.addEventListener("click", close);

  return () => window.removeEventListener("click", close);
}, [showReactionInfo]);



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
        file_size: m.file_size || null,
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

useEffect(() => {
  const box = messagesRef.current;
  if (!box) return;

  const handler = () => {
    const atBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 20;
    setShowScrollDown(!atBottom);
  };

  box.addEventListener("scroll", handler);
  return () => box.removeEventListener("scroll", handler);
}, []);

const scrollToBottom = () => {
  if (messagesRef.current) {
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }
};

const loadOlderMessages = async () => {
  if (loadingMore || !hasMore) return;

  setLoadingMore(true);
  const prevHeight = messagesRef.current.scrollHeight;

  const res = await fetch(
    `${API_URL}/group_messages/${GROUP_ID}?offset=${offset + LIMIT}&limit=${LIMIT}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  

  let data = await res.json();

  // 🔥 FIX: ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

   if (safeData.length === 0) {
    setHasMore(false);
    setLoadingMore(false);
    return;
  }

  if (safeData.length < LIMIT) setHasMore(false);

  // Now safe to map
  const newMessages = safeData.map((m) => ({
    id: m.id,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    message: m.message,
    message_type: m.message_type,
    timestamp: m.timestamp,
    reply_to: m.reply_to,
    reply_to_message: m.reply_to_message,
    original_name: m.original_name,
    file_size: m.file_size || null,
  }));

 

  setMessages(prev => [...newMessages, ...prev]);
  setOffset(prev => prev + LIMIT);

  // Maintain scroll position
  setTimeout(() => {
    const newHeight = messagesRef.current.scrollHeight;
    messagesRef.current.scrollTop = newHeight - prevHeight;
  }, 10);

  setLoadingMore(false);
};

// ... existing useEffect imports and states ...

useEffect(() => {
  if (!GROUP_ID) return;

  // ⭐ Reset state
  setHasMore(true);
  setOffset(0);
  setMessages([]);
  setMultiSelectMode(false);
  setSelectedMessages([]);
  
  setIsChatReady(false); // 👈 Hide chat immediately

  const loadInitialMessages = async () => {
    try {
      const res = await fetch(
        `${API_URL}/group_messages/${GROUP_ID}?offset=0&limit=${LIMIT}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      const safeData = Array.isArray(data) ? data : [];
      setMessages(safeData);
      setOffset(safeData.length);
      if (safeData.length < LIMIT) setHasMore(false);

      // ✅ Wait for DOM to render, force scroll to bottom, THEN reveal
      setTimeout(() => {
        if (messagesRef.current && !scrollToMessageId) {
          messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
          setIsChatReady(true); // 👈 Reveal the chat!
        } else if (!scrollToMessageId) {
          setIsChatReady(true); // Fallback
        }
      }, 150);

    } catch (err) {
      console.error("❌ Group messages load error:", err);
      setIsChatReady(true); // Reveal even on error
    }
  };

  loadInitialMessages();
}, [GROUP_ID, token, scrollToMessageId]);




  // ----- drag & drop / paste handling -----
useEffect(() => {
  const handlePaste = (e) => {
    if (!e.clipboardData) return;

    const files = [];
    for (const item of e.clipboardData.items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      validateAndAddFiles(files);
    }
  };

  window.addEventListener("paste", handlePaste);
  return () => window.removeEventListener("paste", handlePaste);
}, [validateAndAddFiles]); // ✅ ESLint happy



  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
 const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Only turn off if the relatedTarget (where you are moving) 
  // is outside the current target
  if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget)) {
    setDragActive(false);
  }
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  setDragActive(false);

  const files = Array.from(e.dataTransfer.files || []);
  if (!files.length) return;

  validateAndAddFiles(files);
  setTimeout(() => textareaRef.current?.focus(), 0); // ← add this
};



const handleFileChange = (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  validateAndAddFiles(files);
  e.target.value = "";
  setTimeout(() => textareaRef.current?.focus(), 0); // ← add this
};


const formatFileSize = (bytes) => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};




  // helper: upload files to server then emit group messages for each uploaded file
 const uploadAndSendFiles = async () => {
  if (!pendingFiles.length) return;

  setIsUploading(true); // 🔥 START LOADING

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
      showErrorPopup("File upload failed ❌");
      setIsUploading(false);
      return;
    }

    const uploads = data.uploads || [];
    const s = socketRef.current;

    uploads.forEach((u, idx) => {
      const file = pendingFiles[idx];
      const message_type =
        file.type && file.type.startsWith("image/") ? "image" : "file";

      s?.emit("send_group_message", {
        token,
        group_id: GROUP_ID,
        message: u.url,
        message_type,
        file_size: file.size,
      });
    });

    setPendingFiles([]);
  } catch (err) {
    console.error("Upload error:", err);
    showErrorPopup("Upload failed ❌");
  }

  setIsUploading(false); // ✅ END LOADING
};


  // send text message (and handle pending files)
  const sendMessage = async () => {
    if (isUploading) return;
    const s = socketRef.current;
    if (!s) return;

    

    // then upload files if any
    if (pendingFiles.length > 0) {
      await uploadAndSendFiles();
    }

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

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
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
  setShowConfirm(false);

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
      console.error(data.error || "Failed to delete");
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


const sendShareMessage = async (usersToSend) => {
  if (!usersToSend?.length || !messageToShare) return;

  try {
    const s = getSocket();

    for (const targetUserId of usersToSend) {
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

      const newConv = data.conversation;

      const msgs = Array.isArray(messageToShare)
        ? messageToShare
        : [messageToShare];

      for (const msg of msgs) {
        s.emit("send_message", {
          token,
          conversation_id: newConv.id,
          message: msg.message,
          message_type: msg.message_type,
          file_size: msg.file_size || null,
        });
      }
    }

    // ✅ cleanup
    setShowShareModal(false);
    setMessageToShare(null);
    exitMultiSelect();

    showErrorPopup("Messages forwarded successfully! ✅");

  } catch (err) {
    console.error(err);
    showErrorPopup("Failed to forward message ❌");
  }
};



  const showErrorPopup = (message) => {
  setPopupMsg(message);
  setShowPopup(true);
  setTimeout(() => setShowPopup(false), 4000); // auto close after 4 sec
};
  
  // message info modal show
  const openInfo = async (msg) => {
    setSelectedMsgInfo(msg);
    await fetchMessageInfo(msg.id);
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



const toggleSelectMessage = (msgId) => {
  if (!multiSelectMode) {
    setMultiSelectMode(true);
    setSelectedMessages([msgId]);
    return;
  }

  setSelectedMessages((prev) =>
    prev.includes(msgId)
      ? prev.filter((id) => id !== msgId)
      : [...prev, msgId]
  );
};

const exitMultiSelect = () => {
  setMultiSelectMode(false);
  setSelectedMessages([]);
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




const handleTextSelection = () => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start === end) {
    setShowFormatBar(false);
    return;
  }

  const rect = textarea.getBoundingClientRect();

  setFormatBarPos({
    top: rect.top - 40,   // show above textarea
    left: rect.left + 20, // slight left shift
  });

  setShowFormatBar(true);
};


const getWordChunks = (text, limit) => {
  if (!text) return { shown: "", hasMore: false };

  // Split only for counting words, not for slicing text
  const words = text.trim().split(/\s+/);

  if (words.length <= limit) {
    return { shown: text, hasMore: false };
  }

  // Rebuild substring safely:
  let wordCount = 0;
  let cutIndex = text.length;

  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue;

    // Word started — count it
    if (
      i === 0 ||
      /\s/.test(text[i - 1])
    ) {
      wordCount++;
      if (wordCount > limit) {
        cutIndex = i;
        break;
      }
    }
  }

  return {
    shown: text.substring(0, cutIndex),
    hasMore: true
  };
};




const formatMessage = (text) => {
  if (!text) return "";

  return text
    // ✅ Bold (*text* or **text**)
    .replace(/(^|\s)\*{1,2}([^\s*][^*]*[^\s*])\*{1,2}(?=\s|$)/g, "$1<b>$2</b>")

    // ✅ Italic (_text_)
    .replace(/(^|\s)_([^\s_][^_]*[^\s_])_(?=\s|$)/g, "$1<i>$2</i>")

    // ✅ Strikethrough (~text~)
    .replace(/(^|\s)~([^\s~][^~]*[^\s~])~(?=\s|$)/g, "$1<s>$2</s>")

    // ✅ Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")

    // ✅ New lines
    .replace(/\n/g, "<br>");
};


const applyFormat = (type) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  let selected = input.slice(start, end);
  if (!selected) return;

  let wrapper = "";
  if (type === "bold") wrapper = "*";
  if (type === "italic") wrapper = "_";
  if (type === "strike") wrapper = "~";

  const before = input[start - 1] || " ";
  const after = input[end] || " ";

  const needsSpaceBefore = !/\s/.test(before);
  const needsSpaceAfter = !/\s/.test(after);

  const formatted =
    `${needsSpaceBefore ? " " : ""}${wrapper}${selected}${wrapper}${needsSpaceAfter ? " " : ""}`;

  const newText =
    input.slice(0, start) + formatted + input.slice(end);

  setInput(newText);
  setShowFormatBar(false);

  // keep cursor position sane
  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd =
      start + formatted.length;
  }, 0);
};


const handleBulkDeleteConfirmed = async () => {
  const ownMessages = selectedMessages.filter((id) => {
    const msg = messages.find((m) => m.id === id);
    return msg?.sender_id === user.id;   // only delete my messages
  });

  if (ownMessages.length === 0) {
    showErrorPopup("You can delete only your own messages ❌");
    return;
  }

  try {
    for (const msgId of ownMessages) {
      await fetch(`${API_URL}/delete_group_message/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove from UI
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }

    setMultiSelectMode(false);
    setSelectedMessages([]);
    showErrorPopup("Messages deleted ✔");

  } catch (err) {
    console.error(err);
    showErrorPopup("Failed to delete messages ❌");
  }
};




  // ----- Render -----
  return (
    <div className="flex w-full font-['Plus_Jakarta_Sans',sans-serif]">
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
        <div className="flex border-b border-gray-200 py-3 px-6 justify-between bg-white shadow-sm">
          <div className="flex items-center">
            <div
                  className="w-[45px] h-[45px] rounded-[10px] flex items-center justify-center text-white font-bold text-[11px] font-['Outfit',sans-serif] shrink-0 relative tracking-[0.3px] bg-gradient-to-br from-[#9ca3af] to-[#6b7280] overflow-hidden"
                >
                  {conversation?.group_image ? (
                    <img 
                      src={conversation.group_image.startsWith("http") ? conversation.group_image : `${API_URL.replace('/api', '')}${conversation.group_image}`} 
                      alt="Group" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  )}
                </div>
            
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
            className="p-2 cursor-pointer hover:text-gray-600 transition-colors"
            onClick={() => setShowInfo(!showInfo)}
          >
            {/* The icon now changes to faTimes when showInfo is true */}
            <FontAwesomeIcon 
              icon={showInfo ? faTimes : faBars} 
              className="text-gray-500" 
            />
          </div>
        </div>

        {dragActive && (
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white p-60 px-80 rounded-xl shadow-lg text-center cursor-pointer">
              <p className="text-lg font-semibold text-gray-700">Drop files here</p>
              <p className="text-sm text-gray-500">Images, Docs, Videos, etc.</p>
            </div>
          </div>
        )}

        {multiSelectMode && (
          <div className="w-full bg-white border-b border-gray-200 py-2 px-5 flex justify-between items-center shadow-md z-50">
            <p className="text-gray-700 font-medium">
              {selectedMessages.length} selected
            </p>
        
            <div className="flex gap-4">
              <button
                className="text-gray-500 hover:text-gray-800 text-sm cursor-pointer"
                onClick={exitMultiSelect}
              >
                Cancel
              </button>
        
              <button
                className="text-red-500 font-medium hover:text-red-600 text-sm cursor-pointer"
                onClick={() => {
                  setShowShareModal(true);
                  setMessageToShare(
                    messages.filter((m) => selectedMessages.includes(m.id))
                  );
                }}
              >
                Forward
              </button>
              <span>|</span>
              <button
                className="text-red-600 font-medium cursor-pointer"
                onClick={() => {
                  setBulkDeleteMode(true);
                  setShowConfirm(true);   // open Popup
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {!isChatReady && (
          <div className="fixed left-100 inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-100 border-t-[#f47f7f]"></div>
          </div>
        )}

        {/* Messages */}
        <div
          className="height-of-msg pt-4 overflow-y-auto px-8 hide-scrollbar"
          ref={messagesRef}
        >
          {hasMore && (
            <div className="text-center py-2">
              <button
                onClick={loadOlderMessages}
                className="bg-white text-black px-3 py-1 rounded-full  text-xs hover:bg-red-300 hover:text-white cursor-pointer"
              >
                {loadingMore ? "Loading..." : "Load older messages"}
              </button>
            </div>
          )}
          {showPopup && (
            <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300">
              {popupMsg}
            </div>
          )}
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
              file_size: rawMsg.file_size || null,
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
                    <div className="text-center text-gray-500 text-xs bg-white px-3 py-1 rounded-full shadow-sm">
                      {currentLabel}
                    </div>
                  </div>
                )}
                

                <div 
                  ref={(el) => {
                            if (el) messageRefs.current[msg.id] = el;
                          }}
                  className={`flex ${mine ? "justify-end" : "justify-start"} mb-2 group relative 
                  ${selectedMessages.includes(msg.id) ? "bg-[#ffe8e8] rounded-lg" : ""}`}
                  onClick={(e) => {
                    if (multiSelectMode) {
                      toggleSelectMessage(msg.id);
                      return;
                    }
                  }}
                >
                  <div >
                    <div className="flex my-1">
                      <div>
                        {/* ✅ ADD THIS HERE */}
                          {!mine && (
                            <p className="text-[12px] font-semibold text-[#fd4242ff] mb-1 pl-1 capitalize">
                              {msg.sender_name}
                            </p>
                          )}
                          <div className="flex">
                             {/* popup */}
                      {mine && showMenu === msg.id && (
                        <div ref={menuRef} className={`-top-0 bg-white border border-gray-200 rounded-lg shadow-md z-20 flex max-h-10 my-auto ml-5`}>
                          <button
                            title="Reply"
                            onClick={() => { setReplyingTo(msg); setShowMenu(null); }}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faReply} className="mr-1" />
                          </button>

                          <button
                            title="Share"
                            onClick={() => {
                              setMultiSelectMode(true);
                              setSelectedMessages([msg.id]);
                            }}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faShareFromSquare} />
                          </button>

                          <div className="relative">
                            <button
                              title="Reaction"
                              onClick={() => setReactionPicker((p) => ({ show: !(p.show && p.msgId === msg.id), msgId: msg.id }))}
                              className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                            >
                              <Smile className="w-4 h-4 text-gray-600 cursor-pointer inline mr-1" />
                            </button>

                            {reactionPicker.show && reactionPicker.msgId === msg.id && (
                              <div className={`absolute top-full ${mine ? "left-0" : "right-0"} bg-white shadow-lg rounded-lg p-2 flex space-x-2 z-50`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                                  <button key={emoji} onClick={() => { handleAddReaction(msg.id, emoji); setReactionPicker({ show: false, msgId: null }); }} className="text-lg hover:scale-125 transition-transform cursor-pointer">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          

                          {mine ? (
                            <>

                            <button
                            title="Info"
                            onClick={() => openInfo(msg)}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
                          </button>

                            <button
                              title="Delete"
                              onClick={() => {
                                setMessageToDelete(msg);   // store msg first
                                setShowConfirm(true);      // open confirm popup
                              }}
                              className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            
                            </>
                            
                          ) : null}
                        </div>
                      )}
                            {mine ? 
                                <div className="flex items-center">  
                                {msg.message_type === 'text' && showMenu !== msg.id && (
                                    <button
                                      title="Copy"
                                      onClick={() => copyToClipboard(msg.message)}
                                      className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                    >
                                      <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                  )}               
                                  <button
                                    className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                    onClick={() => setShowMenu(showMenu === msg.id ? null : msg.id)}
                                  >
                                    <FontAwesomeIcon icon={faEllipsisVertical} />
                                  </button>
                                
                                  
                                </div>

                                : <></>
                              }
                              
                            <div
                            className={`w-fit max-w-xl px-1 py-1 rounded-xl shadow-xl ${
                              mine ? "bg-white text-gray-900 rounded-br-sm ml-auto" : "bg-white text-gray-900 rounded-bl-sm"
                            }`}
                            
                          >
                            {msg.reply_to && (
                              <div
                                className={`text-xs mb-1 p-1 rounded-md cursor-pointer transition ${
                                  mine ? "border-white bg-gray-100 text-red-700 hover:bg-[#ffe1e1]/90" : "border-gray-400 bg-[#f47f7f] text-white hover:bg-[#f47f7f]/90"
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
                                className="max-w-[200px] rounded-xl cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                                onClick={() => setPreviewImage(msg.message)}
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
                                className="absolute bottom-1 right-1 text-gray-500 rounded-md text-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
                                <div className="bg-white flex items-center space-x-3 rounded-lg p-2  transition">
                                  <div className="bg-gray-100 w-9 h-9 flex items-center justify-center rounded-full">
                                    <FontAwesomeIcon icon={fileIcon} className={`${iconColor} text-lg`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-800 w-44 break-words whitespace-normal">
                                      {fileName}
                                    </p>
                                    {msg.file_size && (
                                      <p className="text-[10px] text-gray-500">
                                        {formatFileSize(msg.file_size)}
                                      </p>
                                    )}
                                    <button
                                      onClick={() => {
                                        const a = document.createElement("a");
                                        a.href = fileUrl;
                                        a.download = fileName;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                      }}
                                      className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              );
                            })()
                          )}

                          {/* Text */}
                          {msg.message_type === "text" && 
                            <div className="w-full">
                                {(() => {
                                  const fullText = msg.message || "";
                                  const currentLimit = expandedWords[msg.id] || 100;
                              
                                  const { shown, hasMore } = getWordChunks(fullText, currentLimit);
                              
                                  return (
                                    <>
                                      <p
                                        className="text-sm leading-relaxed break-words ml-1 whitespace-pre-wrap px-2 py-1 pl-1"
                                        dangerouslySetInnerHTML={{ __html: formatMessage(shown) }}
                                      />
                              
                                    {/* Read More / Show Less */}
                                    {hasMore ? (
                                      <div className="text-right">
                                        <button
                                        className={` ${mine ? `text-white` : `text-red-500` } text-sm mt-1 pr-3 font-medium cursor-pointer`}
                                        onClick={() =>
                                          setExpandedWords((prev) => ({
                                            ...prev,
                                            [msg.id]: currentLimit + 100
                                          }))
                                        }
                                      >
                                        Read more
                                      </button>
                                      </div>
                                      
                                    ) : fullText.split(/\s+/).length > 100 ? (
                                      <div className="text-right">
                                        <button
                                        className={` ${mine ? `text-white` : `text-red-500` } text-sm mt-1 pr-3 font-medium cursor-pointer`}
                                          onClick={() =>
                                            setExpandedWords((prev) => ({
                                              ...prev,
                                              [msg.id]: 100
                                            }))
                                          }
                                        >
                                          Show less
                                        </button>

                                      </div>
                                        
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </div>
                          }
                        </div>
                        {mine ? <></>
                          :       
                            <div className="flex items-center">
                              <button
                                className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                onClick={() => setShowMenu(showMenu === msg.id ? null : msg.id)}
                              >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                              </button>
                              {msg.message_type === 'text' && showMenu !== msg.id && (
                                <button
                                  title="Copy"
                                  onClick={() => copyToClipboard(msg.message)}
                                  className="opacity-0 group-hover:opacity-100 ml-2 mt-1 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                >
                                  <FontAwesomeIcon icon={faCopy} />
                                </button>
                              )}
                            </div>
                          }

                      {/* popup */}
                      {!mine && showMenu === msg.id && (
                        <div ref={menuRef} className={`-top-0 bg-white border border-gray-200 rounded-lg shadow-md z-20 flex max-h-10 my-auto ml-5`}>
                          <button
                            title="Reply"
                            onClick={() => { setReplyingTo(msg); setShowMenu(null); }}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faReply} className="mr-1" />
                          </button>

                          <button
                            title="Share"
                            onClick={() => {
                                setMultiSelectMode(true);
                                setSelectedMessages([msg.id]);
                            }}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faShareFromSquare} />
                          </button>

                          <div className="relative">
                            <button
                              title="Reaction"
                              onClick={() => setReactionPicker((p) => ({ show: !(p.show && p.msgId === msg.id), msgId: msg.id }))}
                              className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                            >
                              <Smile className="w-4 h-4 text-gray-600 cursor-pointer inline mr-1" />
                            </button>

                            {reactionPicker.show && reactionPicker.msgId === msg.id && (
                              <div className={`absolute top-full ${mine ? "left-0" : "right-0"} bg-white shadow-lg rounded-lg p-2 flex space-x-2 z-50`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                                  <button key={emoji} onClick={() => { handleAddReaction(msg.id, emoji); setReactionPicker({ show: false, msgId: null }); }} className="text-lg hover:scale-125 transition-transform cursor-pointer">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          

                          {mine ? (
                            <>

                            <button
                            title="Info"
                            onClick={() => openInfo(msg)}
                            className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
                          </button>

                            <button
                              title="Delete"
                              onClick={() => {
                                setMessageToDelete(msg);   // store msg first
                                setShowConfirm(true);      // open confirm popup
                              }}
                              className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            
                            </>
                            
                          ) : null}
                        </div>
                      )}


                      </div>

                        {/* This is the small chip under the message */}
{reactions[msg.id]?.length > 0 && (
  <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
    <div
      onClick={(e) => {
        e.stopPropagation();
        setReactionInfo({
          message_id: msg.id,
          reactions: reactions[msg.id], // This is now an array of objects
          anchorEl: e.currentTarget,
          mine,
        });
        setActiveReactionTab("all");
        setShowReactionInfo(true);
      }}
      className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-white shadow-sm cursor-pointer"
    >
      {/* Access the .emoji property of the first object in the array */}
      <span>{reactions[msg.id][0].emoji}</span>
      <span className="text-xs text-gray-600 font-medium">
        {reactions[msg.id].length}
      </span>
    </div>
  </div>
)}
                        {/* time + optional seen icon (group doesn't track per-user seen here) */}
                        <div className={`flex ${mine ? "justify-end" : ""}`}>
                          <p className={`text-[11px] pt-1 text-black ${mine ? "text-right" : "text-left"}`}>
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex justify-center">
          <div className={`absolute sendmsg m-3 bottom-0 z-10 ${showInfo ? "shrink" : ""}`}>

            {showFormatBar && (
                <div
                  className="fixed z-[9999] bg-white shadow-[0_0_15px_rgba(0,0,0,0.15)]  rounded-lg px-3 py-1 flex gap-4"
                  style={{
                    top: formatBarPos.top,
                    left: formatBarPos.left
                  }}
                >
                  <button
                    className="font-bold text-gray-700 hover:text-black cursor-pointer p-1"
                    onClick={() => applyFormat("bold")}
                  >
                    B
                  </button>
                  <button
                    className="italic text-gray-700 hover:text-black cursor-pointer p-1"
                    onClick={() => applyFormat("italic")}
                  >
                    I
                  </button>
                  <button
                    className="line-through text-gray-700 hover:text-black cursor-pointer p-1"
                    onClick={() => applyFormat("strike")}
                  >
                    S
                  </button>
                </div>
              )}

       {/* ↩️ REPLAYING TO SECTION */}
            {replyingTo && (
              <div className="flex items-start justify-between bg-white/95 backdrop-blur-md mx-3 mb-2 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-[#f47f7f]">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] font-bold text-[#f47f7f] mb-1">
                    Replying to {replyingTo.sender_name || replyingTo.reply_to_user || "User"}
                  </span>

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
                        <div className="flex items-center gap-3 mt-1">
                          <img
                            src={replyText}
                            alt="reply-img"
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm"
                          />
                          <span className="text-xs text-gray-500 font-medium italic">Photo</span>
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

                      let fileIcon = faFile;
                      let iconColor = "text-gray-400";
                      if (["pdf"].includes(ext)) { fileIcon = faFilePdf; iconColor = "text-red-400"; }
                      else if (["doc", "docx"].includes(ext)) { fileIcon = faFileWord; iconColor = "text-blue-400"; }
                      else if (["xls", "xlsx", "csv"].includes(ext)) { fileIcon = faFileExcel; iconColor = "text-green-400"; }
                      else if (["ppt", "pptx"].includes(ext)) { fileIcon = faFilePowerpoint; iconColor = "text-orange-400"; }
                      else if (["zip", "rar", "7z"].includes(ext)) { fileIcon = faFileZipper; iconColor = "text-yellow-400"; }
                      else if (["txt"].includes(ext)) { fileIcon = faFileLines; iconColor = "text-gray-500"; }

                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                            <FontAwesomeIcon icon={fileIcon} className={`text-sm ${iconColor}`} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                            {fileName}
                          </span>
                        </div>
                      );
                    }

                    // 💬 TEXT FALLBACK
                    return (
                      <span className="text-xs text-gray-600 line-clamp-2 pr-4 leading-relaxed">
                        {replyText}
                      </span>
                    );
                  })()}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setReplyingTo(null)}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#f47f7f] transition-colors ml-2 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-sm" />
                </button>
              </div>
            )}

            {/* 📎 PENDING FILES PREVIEW */}
            {pendingFiles.length > 0 && (
              <div className="flex gap-4 overflow-x-auto bg-white/95 backdrop-blur-md mx-3 mb-2 px-4 py-2 rounded-2xl shadow-sm border border-gray-100 border-l-[4px] border-l-[#f47f7f] hide-scrollbar">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="relative min-w-[64px] flex flex-col items-center group">
                    
                    {/* PREVIEW IMAGE OR ICON */}
                    {file.type.startsWith("image/") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                        <FontAwesomeIcon icon={faFile} className="text-[#f47f7f] text-xl" />
                      </div>
                    )}

                    {/* FILE NAME */}
                    <p className="text-[10px] mt-1.5 text-gray-500 text-center w-[64px] truncate font-medium">
                      {file.name}
                    </p>

                    {/* REMOVE BUTTON */}
                    <button
                      onClick={() => setPendingFiles(pendingFiles.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-[#ff4b4b] text-white w-[20px] h-[20px] flex items-center justify-center text-[10px] rounded-full cursor-pointer shadow-md border-2 border-white hover:scale-110 transition-transform"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
              </div>
            )}

{showScrollDown && (
  <button
    onClick={scrollToBottom}
    className="absolute bottom-20 right-6 bg-white text-white p-3  rounded-full shadow-xl hover:scale-110 transition cursor-pointer"
      >
        <ArrowDown className="text-red-300 hover:text-gray-400" />
      </button>
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
              ref={textareaRef}
              style={{ height: "40px" }}
              className="w-full outline-none text-sm mt-[1.5%] overflow-y-auto"
              placeholder="Type a message..."
              value={input}
              onInput={(e) => {
                    e.target.style.height = "auto"; // reset height to measure
                    const maxHeight = 150; // pixels
                    e.target.style.height =
                      e.target.scrollHeight > maxHeight
                        ? `${maxHeight}px`
                        : `${e.target.scrollHeight}px`;
                  }}
              onChange={(e) => { setInput(e.target.value); emitTyping(true); setTimeout(() => emitTyping(false), 1200); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
  onClick={sendMessage}
  disabled={isUploading}
  className={`w-12 h-12 rounded-xl flex items-center justify-center transition
    ${isUploading
      ? "bg-gray-400 cursor-not-allowed"
      : "bg-[#f37c7c] hover:bg-[#e46b6b] cursor-pointer"}
  `}
>
  {isUploading ? (
    <svg
      className="animate-spin h-5 w-5 text-white"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  ) : (
    <Send className="w-5 h-5 text-white" />
  )}
</button>

          </div>
        </div>
      </div>
      </div>
        

        {/* Share modal (uses your existing ShareMessageModal if available) */}
       <ShareMessageModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  token={token}
  API_URL={API_URL}
  currentUser={user}

  // 👇 USER → USER
  onShare={(selectedUserIds) => {
    sendShareMessage(selectedUserIds);
  }}

  // 👇 GROUP → GROUP (THIS WAS MISSING)
  onShareGroup={(selectedGroupIds) => {
    sendShareMessageToGroup(selectedGroupIds);
  }}
/>


        {/* Message Info modal */}
        {selectedMsgInfo && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white w-80 rounded-lg shadow-lg p-5 relative">
      <h3 className="text-lg font-medium mb-3 flex items-center">
        <FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-gray-600" />
        Message Info
      </h3>

      {/* SEEN LIST */}
{/* SEEN LIST */}
<div className="mb-4">
  <h4 className="font-medium text-gray-700 mb-2">Seen by</h4>

  {selectedMsgInfo.seen?.filter(u => u.user_id !== selectedMsgInfo.sender_id).length > 0 ? (
 
    selectedMsgInfo.seen
      .filter((u) => u.user_id !== selectedMsgInfo.sender_id)  // ⬅ REMOVE SENDER
      .map((u, i) => (
        <div key={i} className="flex justify-between text-sm py-1">
          <span>{u.username}</span>

          <span className="text-gray-500 whitespace-nowrap">
            {(() => {
              if (!u.seen_at) return "--:--";
          
              const date = new Date(u.seen_at);
          
              // Convert UTC → IST (+5 hours 30 minutes)
              const ist = new Date(date.getTime() - 5.5 * 60 * 60 * 1000);
          
              const time = ist
                .toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
                .replace(" ", ""); // Remove space before AM/PM
          
              const day = String(ist.getDate()).padStart(2, "0");
              const month = String(ist.getMonth() + 1).padStart(2, "0");
              const year = ist.getFullYear();
          
              return `${time} ${day}/${month}/${year}`;
            })()}
          </span>

        </div>
      ))
  ) : (
    <p className="text-gray-400 text-sm">No one has seen this message yet</p>
  )}
</div>

{/* DELIVERED LIST */}
<div className="mb-4">
  <h4 className="font-medium text-gray-700 mb-2">Delivered to</h4>

  {selectedMsgInfo.delivered
    ?.filter(u => u.user_id !== selectedMsgInfo.sender_id).length > 0 ? (
    selectedMsgInfo.delivered
      .filter((u) => u.user_id !== selectedMsgInfo.sender_id)  // ⬅ REMOVE SENDER
      .map((u, i) => (
        <div key={i} className="text-sm py-1">
          {u.username}
        </div>
      ))
  ) : (
    <p className="text-gray-400 text-sm">Delivered to all</p>
  )}
</div>


      <button
        onClick={() => setSelectedMsgInfo(null)}
        className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-lg"
      >
        ✖
      </button>
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

        <ConfirmPopup
          show={showConfirm}
          message={bulkDeleteMode ? "Delete selected messages?" : "Delete this message?"}
          onConfirm={() => {
            setShowConfirm(false);
        
            if (bulkDeleteMode) {
              handleBulkDeleteConfirmed();   // 🔥 MULTI DELETE LOGIC
              setBulkDeleteMode(false);
              return;
            }
        
            // 🔥 SINGLE DELETE
            if (messageToDelete) {
              handleDelete(messageToDelete);
            }
          }}
          onCancel={() => {
            setShowConfirm(false);
            setBulkDeleteMode(false);
          }}
        />




      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <img 
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
          />
        </div>
      )}
{showReactionInfo && reactionInfo?.anchorEl && (
  (() => {
    const rect = reactionInfo.anchorEl.getBoundingClientRect();
    const POPUP_WIDTH = 280;
    const GAP = 10;

    const top = rect.top + window.scrollY - 10;

    // 👉 WhatsApp logic
    const left = reactionInfo.mine
      ? rect.left + window.scrollX - POPUP_WIDTH - GAP   // 👈 MY MESSAGE → LEFT
      : rect.right + window.scrollX + GAP;               // 👉 OTHER → RIGHT

    return (
      <div
        className="fixed z-50 bg-white rounded-xl shadow-xl w-[280px]"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {["all", ...new Set(reactionInfo.reactions.map(r => r.emoji))].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveReactionTab(tab)}
              className={`flex-1 py-2 text-sm font-medium cursor-pointer
                ${activeReactionTab === tab
                  ? "border-b-2 border-[#25D366] text-[#25D366]"
                  : "text-gray-500"}
              `}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>

{/* User list inside the Reaction Info popup */}
<div className="max-h-[300px] overflow-y-auto p-3">
  {reactionInfo.reactions
    .filter(r => activeReactionTab === "all" || r.emoji === activeReactionTab)
    .map((r, i) => {
      const isMe = r.user_id === user.id;

      return (
        <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-200">
          <div className="flex items-center gap-3">
            {/* ✅ UPDATED AVATAR RENDERING */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shrink-0">
                {r.profile_image ? (
                  <img src={r.profile_image} alt={r.username} className="w-full h-full object-cover" />
                ) : (
                  (r.username || "?")[0]?.toUpperCase()
                )}
            </div>
            <div>
              <p className="text-sm font-medium">{isMe ? "You" : r.username}</p>
              <p className="text-[10px] text-gray-400">
                {r.created_at 
                  ? new Date(r.created_at).toLocaleString("en-IN", { 
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true 
                    }) 
                  : ""}
              </p>
            </div>
          </div>
          <span className="text-lg">{r.emoji}</span>
        </div>
      );
    })}
</div>

        {/* Close */}
        <button
          onClick={() => setShowReactionInfo(false)}
          className="absolute top-2 right-3 text-gray-500 text-lg cursor-pointer hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    );
  })()
)}



    </div>
  );
};

export default HomePageGroupMsg;
