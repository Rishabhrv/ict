// src/components/HomePageMsg.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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
  faCircleInfo,
  faTimes,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";
import {
  Smile,
  Send,
  CheckCheck,
  ArrowDown,
} from "lucide-react";
import { createSocket, getSocket } from "../socket";
import ChatUserInfo from "./ChatUserInfo";
import EmojiPicker from "emoji-picker-react";
import BackImage from "../components/Images/1211.png";
import ShareMessageModal from "./ShareMessageModal";
// import useFCM from "../hooks/useFCM";
import ImageIcon from "../components/Images/1f4ac.png";
import ConfirmPopup from "./ConfirmPopup";

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 10;


const API_URL = process.env.REACT_APP_API_URL;

const HomePageMsg = ({ token, conversation, user, onNewMessage, scrollToMessageId, onScrollComplete }) => {
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
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [reactions, setReactions] = useState({});
  const [selectedMsgInfo, setSelectedMsgInfo] = useState(null);
  const [reactionPicker, setReactionPicker] = useState({
    show: false,
    msgId: null,
  });
  const messageRefs = useRef({});
  const [pendingFiles, setPendingFiles] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteMsgId, setDeleteMsgId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const LIMIT = 100;
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [formatBarPos, setFormatBarPos] = useState({ top: 0, left: 0 });
  const [expandedWords, setExpandedWords] = useState({});
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, lastSeen: null });
  const [isChatReady, setIsChatReady] = useState(false);

// ✅ Jump to a message from chat search
  useEffect(() => {
    if (!scrollToMessageId || !conversation) return;
    let cancelled = false;
    
    setIsChatReady(false); // 👈 Hide chat while searching for target message

    const timer = setTimeout(() => {
      if (cancelled) return;
      const found = messages.find(m => m.id === scrollToMessageId);

      if (found) {
        scrollToMessage(scrollToMessageId);
        onScrollComplete?.();
        setIsChatReady(true); // 👈 Show chat!
      } else {
        // Message not in the current page — fetch context around it
        fetch(`${API_URL}/messages/${conversation.id}/context/${scrollToMessageId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (cancelled) return;
            if (!Array.isArray(data) || !data.length) {
               setIsChatReady(true); // fallback
               return;
            }
            setMessages(data);
            setOffset(data.length);
            setHasMore(true);
            setTimeout(() => {
              if (cancelled) return;
              scrollToMessage(scrollToMessageId);
              onScrollComplete?.();
              setIsChatReady(true); // 👈 Show chat after jumping!
            }, 200);
          })
          .catch((err) => {
             console.error(err);
             setIsChatReady(true);
          });
      }
    }, 450);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [scrollToMessageId, conversation, token, messages, onScrollComplete]);


  const formatLastSeen = (dateString) => {
    if (!dateString) return "Last seen recently";
    
    // Parse backend IST string safely
    const lastSeenDate = new Date(dateString.replace(" ", "T") + "+05:30");
    const now = new Date();
    
    const diffMs = now - lastSeenDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes} minutes ago`;
    if (diffHours < 24) {
      const timeOpts = { hour: '2-digit', minute: '2-digit', hour12: true };
      
      // Check if it's the same calendar day
      if (lastSeenDate.getDate() === now.getDate()) {
        return `Last seen today at ${lastSeenDate.toLocaleTimeString("en-IN", timeOpts)}`;
      }
      return `Last seen yesterday at ${lastSeenDate.toLocaleTimeString("en-IN", timeOpts)}`;
    }
    
    return `Last seen on ${lastSeenDate.toLocaleDateString("en-IN", { 
      day: "numeric", month: "short", year: "numeric" 
    })}`;
  };




  // const authToken = token;
  // const userId = user.id;

  // useFCM({ token: authToken, userId });

  const menuRef = useRef(null);
  

useEffect(() => {
    function handleClickOutsideEmoji(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }

    // Only attach the listener if the picker is actually open
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutsideEmoji);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideEmoji);
    };
  }, [showEmojiPicker]);

  const confirmDeleteMessage = async () => {
  setShowConfirm(false);

  try {
    const res = await fetch(`${API_URL}/delete_message/${deleteMsgId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== deleteMsgId));
      
      const s = getSocket();
      if (s) s.emit("delete_message", { id: deleteMsgId, conversation_id: conversation.id });
    }
  } catch (err) {
    console.error("❌ Delete error:", err);
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showErrorPopup("Text copied to clipboard! ✅");
    setShowMenu(null); // Close the menu after copying
  }).catch(err => {
    console.error("Failed to copy:", err);
  });
};

const sendShareMessageToGroup = async (groupIds) => {
  if (!groupIds?.length || !messageToShare) return;

  const messagesToSend = Array.isArray(messageToShare)
    ? messageToShare
    : [messageToShare];

  try {
    const s = getSocket();

    for (const groupId of groupIds) {
      for (const msg of messagesToSend) {
        s.emit("send_group_message", {
          token,
          group_id: groupId,
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
    showErrorPopup("Failed to forward message to group ❌");
  }
};



const sendShareMessage = async (usersToSend) => {
  if (!usersToSend?.length || !messageToShare) return;

  const messagesToSend = Array.isArray(messageToShare)
    ? messageToShare
    : [messageToShare];

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

      for (const msg of messagesToSend) {
        s.emit("send_message", {
          token,
          conversation_id: newConv.id,
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
    showErrorPopup("Messages forwarded successfully! ✅");

  } catch (err) {
    console.error(err);
    showErrorPopup("Failed to forward message ❌");
  }
};




// ✅ Handle adding a reaction
const handleAddReaction = (msgId, emoji) => {
  // Update UI instantly
  setReactions((prev) => {
    const existing = prev[msgId] || [];
    const updated = existing.includes(emoji)
      ? existing.filter((e) => e !== emoji)
      : [...existing, emoji];
    return { ...prev, [msgId]: updated };
  });

  // ✅ Send to backend via Socket.IO
  const s = getSocket();
  if (s) {
    s.emit("send_reaction", {
      token,
      message_id: msgId,
      emoji,
    });
  }
};


// ✅ Close Info Modal
const closeInfoModal = () => setSelectedMsgInfo(null);


const showErrorPopup = (message) => {
  setPopupMsg(message);
  setShowPopup(true);
  setTimeout(() => setShowPopup(false), 4000); // auto close after 4 sec
};

const isNearBottom = () => {
  const el = messagesRef.current;
  if (!el) return true;

  const threshold = 150; // px from bottom
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
};



  

useEffect(() => {
  const s = getSocket();
  if (!s || !token) return;

  // Manually trigger online status when this component mounts
  s.emit("user_connected", { token });
}, [token]);

  // ✅ Initialize socket
  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("user_connected", { token }); // Tell backend we are online
    });

    // ✅ Handle new messages safely
    s.on("new_message", (msg) => {

       // ONLY receiver can mark messages as seen
        const isReceiver = msg.sender_id !== user.id;
        
        // Receiver is actually viewing this chat
        const isChatOpen = conversation && msg.conversation_id === conversation.id;
        
        // Mark seen only if BOTH are true
        if (isReceiver && isChatOpen) {
          fetch(`${API_URL}/seen/${conversation.id}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
          });
        
          // Update seen ticks locally
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_id !== user.id ? { ...m, seen: 1 } : m
            )
          );
        }


        // Ignore notification if message belongs to currently open chat AND user sent it
        if (conversation && msg.conversation_id === conversation.id && msg.sender_id !== user.id) {
          
          // Show notification only if browser tab is in background
          if (document.hidden && Notification.permission === "granted") {
      
            let bodyText = "";
      
            if (msg.message_type === "text") bodyText = msg.message;
            if (msg.message_type === "image") bodyText = "📷 Image";
            if (msg.message_type === "file") bodyText = "📎 File";
      
            new Notification(msg.sender_name || "New message", {
              body: bodyText,
              icon: ImageIcon // your favicon/logo
            });
      
          }
        }

        const shouldScroll = isNearBottom(); 

        if (conversation && msg.conversation_id === conversation.id) {
          setMessages((prev) => {
  
            const list = Array.isArray(prev) ? prev : [];
  
            const exists = list.some((m) => {
              const mIST = toIST(m.timestamp);
              const msgIST = toIST(msg.timestamp);
              return (
                m.message === msg.message &&
                m.sender_id === msg.sender_id &&
                Math.abs(mIST - msgIST) < 2000
              );
            });
            return exists ? list : [...list, msg];
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

          if (shouldScroll) {
          setTimeout(() => {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
          }, 20);
        }
      }
    });

    s.on("auth_error", (d) => {
      console.error("socket auth error", d);
    });

    s.on("message_seen", (data) => {
      if (!conversation) return;
    
      // only update if this message belongs to this conversation
      if (data.conversation_id === conversation.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? { ...m, seen: 1, seen_time: new Date().toISOString() }
              : m
          )
        );
      }
    });


    s.on("messages_marked_seen", (data) => {
      if (!conversation) return;
      if (data.conversation_id !== conversation.id) return;

      // ✅ Update the UI checkmarks directly WITHOUT refetching the newest 50 messages.
      // This preserves your historical search context!
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === user.id && m.seen === 0
            ? { ...m, seen: 1, seen_time: new Date().toISOString() }
            : m
        )
      );
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.sender_id !== user.id
          ? { ...m, seen: 1, seen_time: new Date().toISOString() }
          : m
      )
    );



    return () => {
      if (s) s.off("new_message");
    };
  }, [token, conversation, onNewMessage, user.id]);

// Fetch initial status when conversation changes
  useEffect(() => {
    if (!conversation || conversation.isGroup) return;

    // Secure fallback: If other_user_id is missing (e.g. from search), use id
    const targetId = conversation.other_user_id || conversation.id;
    if (!targetId) return;

    fetch(`${API_URL}/user_status/${targetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setOtherUserStatus({
            isOnline: data.is_online === 1,
            lastSeen: data.last_seen,
          });
        }
      })
      .catch(console.error);
  }, [conversation, token]);

  // Listen for real-time status updates
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const handleStatusUpdate = (data) => {
      const targetId = conversation?.other_user_id || conversation?.id;
      
      if (
        conversation && 
        !conversation.isGroup && 
        data.user_id === targetId
      ) {
        setOtherUserStatus({
          isOnline: data.is_online === 1,
          lastSeen: data.last_seen,
        });
      }
    };

    s.on("user_status_update", handleStatusUpdate);

    return () => {
      s.off("user_status_update", handleStatusUpdate);
    };
  }, [conversation]);


const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      showErrorPopup("File size exceeded! Max allowed is 100MB ❌");
      e.target.value = "";
      return;
    }
  }

  if (files.length > MAX_FILES) {
    showErrorPopup(`You can only send ${MAX_FILES} files at a time!`);
    return;
  }

  if (pendingFiles.length + files.length > MAX_FILES) {
    showErrorPopup(`Maximum ${MAX_FILES} files allowed at a time!`);
    return;
  }

  setPendingFiles((prev) => [...prev, ...files]);
  setTimeout(() => textareaRef.current?.focus(), 0); // ← add this
};


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

  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      showErrorPopup("File size exceeded! Max allowed is 100MB ❌");
      return;
    }
  }

  const validFiles = files.filter((file) => file instanceof File);

  if (pendingFiles.length + validFiles.length > MAX_FILES) {
    showErrorPopup(`Maximum ${MAX_FILES} files allowed at a time!`);
    return;
  }

  setPendingFiles((prev) => [...prev, ...validFiles]);
  setTimeout(() => textareaRef.current?.focus(), 0); // ← add this
};





 // ✅ Scroll to a specific message smoothly
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




  // ✅ Helper to convert UTC → IST
  const toIST = (dateStr) => {
    if (!dateStr) return new Date();
    return new Date(new Date(dateStr).getTime() - 5.5 * 60 * 60 * 1000);
  };

  // ✅ Fetch messages when conversation changes
  // ✅ Fetch latest 100 messages on conversation change
useEffect(() => {
  if (!conversation) {
    setMessages([]);
    return;
  }

  setOffset(0);
  setHasMore(true);

  fetch(`${API_URL}/messages/${conversation.id}?limit=100&offset=0`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((data) => {
      setMessages(data);

      // Preload reactions
      const reactionsMap = {};
      data.forEach((msg) => {
        if (msg.reactions && Array.isArray(msg.reactions)) {
          reactionsMap[msg.id] = msg.reactions.map((r) => r.emoji);
        }
      });
      setReactions(reactionsMap);
    })
    .catch(console.error);

  const s = getSocket();
  if (s) s.emit("join", { token, conversation_id: conversation.id });

  return () => {
    if (s) s.emit("leave", { conversation_id: conversation.id });
  };
}, [conversation, token]);



  const scrollToBottom = () => {
    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

const handlePastedFile = useCallback((file) => {
  if (!(file instanceof Blob || file instanceof File)) return;

  if (file.size > MAX_FILE_SIZE) {
    showErrorPopup("File size exceeded! Max allowed is 100MB ❌");
    return;
  }

  setPendingFiles((prev) => {
    if (prev.length + 1 > MAX_FILES) {
      showErrorPopup(`Maximum ${MAX_FILES} files allowed at a time!`);
      return prev; // ❌ block adding
    }
    return [...prev, file]; // ✅ safe add
  });
}, []);


useEffect(() => {
  const handlePaste = (event) => {
    if (!event.clipboardData) return;

    const items = event.clipboardData.items;
    for (let item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          handlePastedFile(file);
        }
      }
    }
  };

  window.addEventListener("paste", handlePaste);
  return () => window.removeEventListener("paste", handlePaste);
}, [handlePastedFile]); // ✅ warning gone




const formatFileSize = (bytes) => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};




  const loadOlderMessages = async () => {
  if (!conversation || !hasMore || loadingMore) return;
  setLoadingMore(true);

  const currentScrollHeight = messagesRef.current.scrollHeight;
  const currentScrollTop = messagesRef.current.scrollTop;

  const newOffset = offset + 100;

  try {
    const res = await fetch(
      `${API_URL}/messages/${conversation.id}?limit=100&offset=${newOffset}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const older = await res.json();

    if (older.length < 100) setHasMore(false);

    setMessages((prev) => [...older, ...prev]);
    setOffset(newOffset);

    setTimeout(() => {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight - currentScrollHeight + currentScrollTop;
    }, 10);
  } catch (err) {
    console.error(err);
  }

  setLoadingMore(false);
};


useEffect(() => {
    if (!conversation) return;

    // ⭐ MUST RESET STATE WHEN SWITCHING CHAT
    setMessages([]);
    setOffset(0);
    setHasMore(true);
    setMultiSelectMode(false);
    setSelectedMessages([]);
    
    setIsChatReady(false); // 👈 Hide chat immediately on switch

    const loadInitialMessages = async () => {
      try {
        const res = await fetch(
          `${API_URL}/messages/${conversation.id}?limit=${LIMIT}&offset=0`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];

        setMessages(safeData);

        // ⭐ Update offset based on first load
        setOffset(safeData.length);

        // ⭐ If less than LIMIT messages → no more messages → hide button
        if (safeData.length < LIMIT) {
          setHasMore(false);
        }

        // ✅ Wait for DOM to render, force scroll to bottom, THEN reveal
        setTimeout(() => {
          if (messagesRef.current && !scrollToMessageId) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
            setIsChatReady(true); // 👈 Reveal the chat!
          } else if (!scrollToMessageId) {
            setIsChatReady(true); // Fallback
          }
          // If scrollToMessageId IS present, we don't reveal here. 
          // We let the scrollToMessageId useEffect reveal it after the jump.
        }, 150);

      } catch (err) {
        console.error("Initial load error:", err);
        setIsChatReady(true); // Reveal on error to prevent being stuck
      }
    };

    loadInitialMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, token]); // 👈 Notice I removed scrollToMessageId from this array







  // ✅ Send message
const sendMessage = async () => {
  if (!conversation) return;
  if (isUploading) return;
  const s = getSocket();



  // ✅ 2. Upload & send files if any selected

if (pendingFiles.length > 0) {
  setIsUploading(true);
  for (const file of pendingFiles) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", user.username);

    try {
      const res = await fetch(`${API_URL}/upload_file`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      // 🔥 CASE 1 — backend returns { url: "..." }
      if (data.url) {
        s?.emit("send_message", {
          token,
          conversation_id: conversation.id,
          message: data.url,
          message_type: file.type.startsWith("image/") ? "image" : "file",
          original_name: file.name,
          file_size: file.size,
        });
      }

      // 🔥 CASE 2 — backend returns { uploads: [{ url, original_name }] }
      else if (Array.isArray(data.uploads)) {
        const uploadedFile = data.uploads[0];
        s?.emit("send_message", {
          token,
          conversation_id: conversation.id,
          message: uploadedFile.url,
          message_type: file.type.startsWith("image/") ? "image" : "file",
          original_name: uploadedFile.original_name || file.name,
          file_size: file.size,
        });
      }

      // 🔥 CASE 3 — backend returns { urls: ["...", ...] }
      else if (Array.isArray(data.urls)) {
        s?.emit("send_message", {
          token,
          conversation_id: conversation.id,
          message: data.urls[0],
          message_type: file.type.startsWith("image/") ? "image" : "file",
          original_name: file.name,
          file_size: file.size,
        });
      }

    } catch (err) {
      console.error("Upload error:", err);
      showErrorPopup("Upload failed.");
    }
  }

  setPendingFiles([]); // clear preview
  setIsUploading(false);

  setTimeout(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    }, 20);
}


  // ✅ 1. Send text if exists
  if (input.trim()) {
    s?.emit("send_message", {
      token,
      conversation_id: conversation.id,
      message: input.trim(),
      message_type: "text",
      reply_to: replyingTo ? replyingTo.id : null,
    });

    setTimeout(() => {
  if (messagesRef.current) {
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }
}, 20);

    setInput("");
    setReplyingTo(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }
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


// ✅ Mark all messages seen when opening direct chat
useEffect(() => {
  if (!conversation) return;
  fetch(`${API_URL}/seen/${conversation.id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}, [conversation?.id, conversation, token]);




useEffect(() => {
  const s = getSocket();
  if (!s) return;

  s.on("reaction_update", (data) => {
    // Update message reactions
    setReactions((prev) => ({
      ...prev,
      [data.message_id]: (data.reactions || []).map(r => r.emoji)
    }));
  });

  return () => s.off("reaction_update");
}, [token]);


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




useEffect(() => {
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}, []);


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


// 🔥 Bulk Delete using EXISTING backend delete_message/<id>
const handleBulkDeleteConfirmed = async () => {
  const ownMessages = selectedMessages.filter((id) => {
    const msg = messages.find((m) => m.id === id);
    return msg?.sender_id === user.id;
  });

  if (ownMessages.length === 0) {
    showErrorPopup("You can delete only your own messages ❌");
    return;
  }

  try {
    for (const msgId of ownMessages) {
      await fetch(`${API_URL}/delete_message/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }

    exitMultiSelect();
    showErrorPopup("Messages deleted successfully ✔");

  } catch (err) {
    console.error(err);
    showErrorPopup("Failed to delete some messages ❌");
  }
};




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
    <div className="flex w-full font-['Plus_Jakarta_Sans',sans-serif]">
      <div 
      style={{
        backgroundImage: `url(${BackImage})`,
        backgroundRepeat: "repeat",       // ✅ Tile the image in all directions
        backgroundSize: "300px 300px",           // ✅ Keep original size for true repeat
        backgroundPosition: "top left",   // ✅ Start from top-left
        width: "100%",
      }}
        className=" w-full"
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}>
        {/* Header */}
        <div className="flex border-b border-gray-200 py-3 pb-3 px-6 justify-between bg-white shadow-sm">
          <div className="flex items-center">
            {/* ✅ Fix: Move shrink-0 and fixed dimensions to the parent 'relative' wrapper */}
            <div className="relative  w-11 h-11">
              <div className={`w-full h-full rounded-xl flex items-center justify-center text-sm font-semibold text-white overflow-hidden ${
                  conversation?.isGroup || conversation?.type === "group"
                    ? "bg-gradient-to-br from-[#9ca3af] to-[#6b7280]"
                    : "bg-gradient-to-br from-[#f37c7c] to-[#ef6061]"
                }`}
              >
                {conversation?.isGroup || conversation?.type === "group" ? (
                  conversation.group_image ? (
                    <img src={conversation.group_image} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87" />
                      <path d="M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  )
                ) : (
                  conversation?.profile_image ? (
                    <img src={conversation.profile_image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <h1 className="font-semibold text-lg font-['Outfit',sans-serif] tracking-[0.5px]">
                      {conversation
                        ? (conversation.other_username || conversation.username || conversation.group_name || "U")[0].toUpperCase()
                        : "U"}
                    </h1>
                  )
                )}
              </div>
              {/* Online Green Dot Indicator on Avatar (Optional) */}
              {!conversation?.isGroup && otherUserStatus.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#4ade80] rounded-full border-2 border-white z-10"></div>
              )}
            </div>

            <div className="pl-3">
              <h3 className="text-lg font-semibold text-gray-700 leading-tight">
                {conversation
                  ? conversation.other_username || conversation.username || conversation.group_name || "No conversation selected"
                  : "No conversation selected"}
              </h3>
              
              {/* Dynamic Status Text */}
              {conversation && !conversation.isGroup && (
                <p className={`text-[11px] mt-0.5 font-medium ${otherUserStatus.isOnline ? "text-green-500" : "text-gray-400"}`}>
                  {otherUserStatus.isOnline 
                    ? "Online" 
                    : formatLastSeen(otherUserStatus.lastSeen)}
                </p>
              )}
              {/* Group chat member count / description could go here */}
              {conversation && conversation.isGroup && (
                <p className="text-xs mt-0.5 font-medium text-gray-400">Group Chat</p>
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
        className="text-red-600 font-medium text-sm hover:text-red-700 cursor-pointer"
        onClick={() => {
          setBulkDeleteMode(true);   // tell the popup this is bulk delete
          setShowConfirm(true);      // open popup
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
          className="pt-4 overflow-y-auto p-4 px-8 hide-scrollbar height-of-msg pb-1"
          ref={messagesRef}

            onScroll={() => {
              const div = messagesRef.current;
              if (!div) return;
          
              // ✅ 1. Show "Load older messages" button when scrolled to TOP
              if (div.scrollTop === 0 && hasMore) {
                document.getElementById("loadMoreBtn")?.classList.remove("hidden");
              }
          
              // ✅ 2. Show scroll-to-bottom button when user is 150px above bottom
              if (div.scrollHeight - div.scrollTop - div.clientHeight > 150) {
                setShowScrollBottom(true);
              } else {
                setShowScrollBottom(false);
              }
            }}
        >

            {hasMore && (
              <div className="flex justify-center my-2">
                <button
                  id="loadMoreBtn"
                  className="hidden text-xs bg-white text-sm px-4 py-1 rounded-full text-gray-700 hover:bg-red-400 hover:text-white transition cursor-pointer"
                  onClick={loadOlderMessages}
                  disabled={loadingMore}
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
          {(() => {
            if (!messages.length) return <p className="text-center text-gray-400 text-sm py-auto">No messages yet</p>;
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
                <span className="text-xs bg-white text-gray-700 px-3 py-1 rounded-full ">
                  {formatDateHeader(dateKey)}
                </span>
              </div>

              {/* 💬 Messages for this date */}
              {grouped[dateKey].map((msg, idx) => {
                const mine = msg.sender_id === user?.id;
                return (
                  <div
                    key={idx}
                    ref={(el) => { messageRefs.current[msg.id] = el }}
                    className={`flex ${mine ? "justify-end" : "justify-start"} my-3 group relative 
                      ${selectedMessages.includes(msg.id) ? "bg-[#ffe8e8] rounded-lg" : ""}`}
                    onClick={(e) => {
                      if (multiSelectMode) {
                        toggleSelectMessage(msg.id);
                        return;
                      }
                    }}
                  >

                  <div>
                  
                    <div className="flex">
                      <div>
                        <div className="flex">
                           {/* 📋 Popup Menu */}
                    {mine && showMenu === msg.id && (
                      <div
                        ref={menuRef}
                        className={`-top-0 my-auto bg-white border border-gray-200 rounded-lg shadow-md z-20 flex max-h-10 mr-5`}
                      >
                        <button
                        title="Reply"
                          onClick={() => {
                            setReplyingTo(msg);  // ✅ Store the message being replied to
                            setShowMenu(null);   // Close menu
                          }}
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
                            {/* 😄 Reaction Button */}
                            <div className="relative">
                              <button
                                title="Reaction"
                                onClick={() => {
                                  setReactionPicker((prev) => ({
                                    show: !(prev.show && prev.msgId === msg.id),
                                    msgId: msg.id,
                                  }));
                                }}
                                className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                              >
                                <Smile className="w-4 h-4 text-gray-600 cursor-pointer inline mr-1" />
                              </button>

                            {/* 🎯 Mini Emoji Bar */}
                            {reactionPicker.show && reactionPicker.msgId === msg.id && (
                              <div className={`absolute top-full ${ mine ? "left-0" : "right-0"}  bg-white shadow-lg rounded-lg p-2 flex space-x-2 z-50`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      handleAddReaction(msg.id, emoji);
                                      setReactionPicker({ show: false, msgId: null });
                                    }}
                                    className="text-lg hover:scale-125 transition-transform cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                     
                      {mine ? 
                      <> {/* ℹ️ Message Info */}
                      <button
                        title="Info"
                        onClick={() => {
                          setSelectedMsgInfo(msg);
                          setShowMenu(null);
                        }}
                        className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
                      </button>
                      
                       <button
                          title="Delete"
                          onClick={async () => {   // ✅ add async here
                            setDeleteMsgId(msg.id);   // store this message ID
                            setShowConfirm(true);
                          }}
                        className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      </>
                     
                      : ""}
                    </div>
                  )}

                          {
                            mine ? 
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
                      
                            {/* 🕹 Three-dot menu (visible on hover) */}

                        <div className={`w-fit shadow-lg max-w-xl px-[4px] py-[3px] rounded-xl ${
                            mine
                              ? "bg-white text-gray-700 rounded-br-sm ml-15 ml-auto"
                              : "bg-white text-gray-700 rounded-bl-sm"
                          }`}>
                            
                          <div >

                          {msg.reply_to && (
                            <div
                              className={`text-xs mb-1 p-1 rounded-md cursor-pointer  transition ${
                                mine ? "border-white bg-gray-100 text-red-700 hover:bg-[#ffe1e1]/90" : "border-gray-400 bg-[#f47f7f] text-white hover:bg-[#f47f7f]/90"
                              }`}
                              onClick={() => scrollToMessage(msg.reply_to)}
                            >
                              {/* 🧍 Username */}
                              <p className="truncate font-semibold">
                                {msg.reply_to_user || "Message Deleted"}
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
                                      className="w-[100%] h-20 rounded object-cover object-top"
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
                                      <span className="truncate max-w-[120px] font-['Outfit',sans-serif]">{fileName}</span>
                                    </div>
                                  );
                                }

                              // 💬 TEXT fallback
                              return (
                                <p className={` ${mine ? `text-white` : `text-red-500` }truncate  text-[12px] mt-1}`}>
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
                          className="max-w-[200px] rounded-xl cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                          onClick={() => setPreviewImage(fileUrl)}
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
                          className="absolute bottom-1 right-1 text-gray-500 rounded-md text-lg opacity-0 group-hover:opacity-100 transition cursor-pointer"
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
                        function cleanDisplayName(filename) {
                          if (!filename) return "";
                          return filename.replaceAll("_", " ");
                        }

                      return (
                        <div className={` flex items-top space-x-3 bg-gray-100  rounded-lg p-2`}>
                          <div className="bg-white w-8 h-8 flex items-center justify-center rounded-full text-sm">
                            <FontAwesomeIcon icon={fileIcon} className={iconColor} />
                          </div>
                          <div className="flex-1">
                            <p className={`text-xs font-medium text-gray-800  w-34 break-words whitespace-normal font-['Outfit',sans-serif]`}>
                              {/* Prefer clean name returned by backend */}
                              {fileOriginalName || cleanDisplayName(fileName)}
                            </p>
                            {msg.file_size && (
                              <p className={`text-[9px] text-gray-600 `}>
                                {formatFileSize(msg.file_size)}
                              </p>
                            )}
                          </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                
                                const link = document.createElement("a");
                                link.href = fileUrl;
                                link.download = fileOriginalName || cleanDisplayName(fileName);
                                link.target = "_blank"; // Failsafe: opens in a new tab if the browser tries to preview it
                                
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className={`cursor-pointer`}
                            >
                              <div className="bg-white p-2 rounded-full hover:bg-gray-50 transition-colors">
                                <ArrowDown className="text-red-500 w-4 h-4" />
                              </div>
                            </button>
                        </div>
                            );
                          } else {
                            return <div className="w-full">
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
                                        className={` ${mine ? `text-red-500` : `text-red-500` } text-sm mt-1 pr-3 font-medium cursor-pointer`}
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
                                        className={` ${mine ? `text-red-500` : `text-red-500` } text-sm mt-1 pr-3 font-medium cursor-pointer`}
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
                                  ;
                          }
                        })()}
                    </div>

                         

                   <div className={`flex  ${mine ? "justify-end" : "justify-end"}`}>
                      <p className={`text-[10px] p-1 text-black ${mine ? "text-right" : "text-left"}`}>
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
                        <CheckCheck className={`w-[50%] h-[50%] py-1 ${
                          msg.seen === 1 ? "text-blue-500 " : "text-gray-400"
                        }`}/>
                      </p>
                      : ""}
                    </div>

                  </div>
                   {
                            mine ? 
                            <></>
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
                     {/* 📋 Popup Menu */}
                    {!mine && showMenu === msg.id && (
                      <div
                        ref={menuRef}
                        className={`-top-0 my-auto bg-white border border-gray-200 rounded-lg shadow-md z-20 flex max-h-10 ml-5`}
                      >
                        <button
                        title="Reply"
                          onClick={() => {
                            setReplyingTo(msg);  // ✅ Store the message being replied to
                            setShowMenu(null);   // Close menu
                          }}
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
                            {/* 😄 Reaction Button */}
                            <div className="relative">
                              <button
                                title="Reaction"
                                onClick={() => {
                                  setReactionPicker((prev) => ({
                                    show: !(prev.show && prev.msgId === msg.id),
                                    msgId: msg.id,
                                  }));
                                }}
                                className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left"
                              >
                                <Smile className="w-4 h-4 text-gray-600 cursor-pointer inline mr-1" />
                              </button>

                            {/* 🎯 Mini Emoji Bar */}
                            {reactionPicker.show && reactionPicker.msgId === msg.id && (
                              <div className={`absolute top-full ${ mine ? "left-0" : "right-0"}  bg-white shadow-lg rounded-lg p-2 flex space-x-2 z-50`}>
                                {["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      handleAddReaction(msg.id, emoji);
                                      setReactionPicker({ show: false, msgId: null });
                                    }}
                                    className="cursor-pointer text-lg hover:scale-125 transition-transform cursor-pointer"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                     
                      {mine ? 
                      <> {/* ℹ️ Message Info */}
                      <button
                        title="Info"
                        onClick={() => {
                          setSelectedMsgInfo(msg);
                          setShowMenu(null);
                        }}
                        className="block w-full text-xs px-2 py-2 hover:bg-gray-100 text-gray-700 text-left cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faCircleInfo} className="mr-1" />
                      </button>
                      
                       <button
                          title="Delete"
                          onClick={async () => {   // ✅ add async here
                            setDeleteMsgId(msg.id);   // store this message ID
                            setShowConfirm(true);
                          }}
                        className="text-sm px-3 py-2 hover:bg-red-100 text-red-500 text-left cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      </>
                     
                      : ""}
                    </div>
                  )}

                    </div>
                   

                    {reactions[msg.id]?.length > 0 && (
                      <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                        {reactions[msg.id].map((emoji, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 bg-white/80 border border-gray-200 rounded-full px-2 py-0.5 text-sm shadow-sm cursor-pointer hover:scale-110 transition-transform"
                            // onClick={() => handleAddReaction(msg.id, emoji)} // toggle off
                          >
                            <span>{emoji}</span>
                          </div>
                        ))}
                      </div>
                    )}

                </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ));
    })()}


    {/* 📜 Message Info Modal */}
    {selectedMsgInfo && (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white w-80 rounded-lg shadow-lg p-5 relative">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <FontAwesomeIcon icon={faCircleInfo} className="mr-2 text-gray-600" />
            Message Info
          </h3>
    
          <div className="text-sm space-y-2">
            <p className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-gray-900">
                {selectedMsgInfo.seen === 1 ? "Seen ✅" : "Delivered 📤"}
              </span>
            </p>
            <p className="flex justify-between text-gray-600">
              <span>Time Sent:</span>
              <div className="flex">
                <CheckCheck className={`w-[70%] h-[70%] pl-1 text-gray-400`}/>
                <span className="whitespace-nowrap text-xs">
                  {(() => {
                    const date = new Date(selectedMsgInfo.timestamp);
                
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
            </p>
            <p className="flex justify-between text-gray-600">
              <span>Time Seen:</span>
              <div className="flex">
                <CheckCheck className={`w-[70%] h-[70%] pl-1 text-blue-400`}/>
                <span className="whitespace-nowrap text-xs">
                  {selectedMsgInfo?.seen_time
                    ? (() => {
                        const date = new Date(selectedMsgInfo.seen_time);
                
                        // Convert UTC → IST
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
                      })()
                    : "--:--"}
                </span>

              </div>            
            </p>
          </div>
        <button
          onClick={closeInfoModal}
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-lg cursor-pointer"
        >
          ✖
        </button>
        </div>
      </div>
    )}


         
      </div>

      {/* Input Section */}
      <div className="flex justify-center">

  
          <div className={`absolute sendmsg m-3 bottom-0 z-10 ${showInfo ? "shrink" : ""}`}>
            {showFormatBar && (
                <div
                  className="fixed z-[9999] bg-white shadow-[0_0_15px_rgba(0,0,0,0.15)]  rounded-lg px-3 py-1 flex gap-4 "
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
                  className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#f47f7f] transition-colors ml-2"
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

                {showScrollBottom && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-6 bg-white text-white p-3  rounded-full shadow-xl hover:scale-110 transition cursor-pointer"
                  >
                    <ArrowDown className="text-red-300 hover:text-gray-400" />
                  </button>
                )}

                <div className="flex gap-2">
                  <div className=" flex w-full rounded-3xl bg-white pb-0 textarea-height shadow-all-sides py-2 ">
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
            
                        {/* ✅ Attach the ref to this wrapper div */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((prev) => !prev)}
                        className="focus:outline-none"
                      >
                        <Smile className="text-gray-600 cursor-pointer mt-1" />
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

                <textarea
                  ref={textareaRef}
                  style={{ height: "40px" }} // 👈 ensures initial small height
                  className="w-full outline-none text-sm mt-[1.5%] overflow-y-auto"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onInput={(e) => {
                    e.target.style.height = "auto"; // reset height to measure
                    const maxHeight = 150; // pixels
                    e.target.style.height =
                      e.target.scrollHeight > maxHeight
                        ? `${maxHeight}px`
                        : `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
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
    </div>
      {showInfo && (
        <div className="z-10">
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
          sendShareMessage(selectedUserIds); // ✅ DIRECT
        }}
        onShareGroup={sendShareMessageToGroup}
      />

      <ConfirmPopup
        show={showConfirm}
        message={bulkDeleteMode ? "Delete selected messages?" : "Delete this message?"}
        onConfirm={() => {
          setShowConfirm(false);
      
          if (bulkDeleteMode) {
            handleBulkDeleteConfirmed();   // <-- bulk delete logic
            setBulkDeleteMode(false);
          } else {
            confirmDeleteMessage(); // <-- your existing single delete function
          }
        }}
        onCancel={() => {
          setBulkDeleteMode(false);
          setShowConfirm(false);
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





    </div>
  );
};

export default HomePageMsg;


