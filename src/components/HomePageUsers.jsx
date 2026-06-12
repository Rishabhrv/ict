import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faImage, faPlus } from "@fortawesome/free-solid-svg-icons";
import { X } from "lucide-react";
import { createSocket } from "../socket";

const API_URL = process.env.REACT_APP_API_URL;

const HomePageUsers = ({ token, onSelectConversation, user, lastMessageUpdate }) => {

  const [convos, setConvos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [showAllUsers, setShowAllUsers] = useState(false);

  // ✅ Message search states
  const [messageResults, setMessageResults] = useState([]);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);

  useEffect(() => {
  if (!showAllUsers) {
    setSearchResults([]);
    setSearchTerm("");
    return;
  }
  setLoading(true);
  fetch(`${API_URL}/all_users`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
      const existingUsernames = new Set(convos.map(c => c.other_username));
      setSearchResults(
        (Array.isArray(data) ? data : []).map(u => ({
          ...u,
          hasConversation: existingUsernames.has(u.username),
        }))
      );
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showAllUsers, token]);

  const socketRef = useRef(null);
  const [popupMsg, setPopupMsg] = useState("");
  const storedSession = localStorage.getItem("session_id");
  const activeChatRef = useRef(null);

  const normalizeChats = (items) =>
    items.map(i => ({
      ...i,
      sort_time: i.last_time || i.last_message_time || i.updated_at || i.created_at || 0,
    }));

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  const getTimeValue = (t) => {
    if (!t) return 0;
    t = t.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) {
      const [d, ti] = t.split(" ");
      return new Date(`${d}T${ti}.000+05:30`).getTime();
    }
    if (t.includes("GMT")) return new Date(t).getTime() - 5.5 * 3600000;
    return new Date(t).getTime();
  };

  const uniqueById = (list) => {
    const map = new Map();
    list.forEach(item => {
      const key = item.type === "group" ? `g-${item.id}` : `u-${item.other_user_id || item.user_id || item.id}`;
      if (!map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  };

  const fetchChats = React.useCallback(async () => {
    try {
      const [convoRes, groupRes] = await Promise.all([
        fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const convoData = await convoRes.json();
      const groupData = await groupRes.json();
      const safeConvos = Array.isArray(convoData) ? convoData : [];
      const safeGroups = Array.isArray(groupData) ? groupData : [];
      const merged = [
        ...safeConvos.map(c => ({ ...c, type: "user", hasConversation: true })),
        ...safeGroups.map(g => ({ ...g, type: "group", hasConversation: true })),
      ];
      const finalList = uniqueById(normalizeChats(merged).sort((a, b) => getTimeValue(b.sort_time) - getTimeValue(a.sort_time)));
      const s = socketRef.current;
      if (s) {
        finalList.forEach(chat => {
          if (chat.type === "group") s.emit("join_group", { token, group_id: chat.id });
          else if (chat.hasConversation && chat.id) s.emit("join", { token, conversation_id: chat.id });
        });
      }
      setConvos(() => {
        const oldActive = activeChatRef.current;
        if (oldActive) setActiveChat(oldActive);
        return finalList;
      });
    } catch (err) { console.error("Error fetching chats:", err); }
  }, [token]);

  useEffect(() => { fetchChats(); }, [fetchChats, lastMessageUpdate]);

  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);
    socketRef.current = s;
    s.on("connect", () => {});
  }, [token]);

  

  // Existing: user / group name search
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [userRes, groupRes] = await Promise.all([
          fetch(`${API_URL}/users?search=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/groups?search=${encodeURIComponent(searchTerm)}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const users = await userRes.json();
        const groups = await groupRes.json();
        const lower = searchTerm.toLowerCase();
        const existingUsernames = new Set(convos.filter(c => c.type === "user").map(c => c.other_username || c.username));
        setSearchResults([
          ...groups.filter(g => g.group_name?.toLowerCase().includes(lower)).map(g => ({ ...g, type: "group", hasConversation: true })),
          ...users.filter(u => u.username?.toLowerCase().includes(lower)).map(u => ({ ...u, type: "user", hasConversation: existingUsernames.has(u.username) })),
        ]);
      } catch (err) { console.error("Search error:", err); }
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [searchTerm, token, convos]);

  // ✅ NEW: message content search (runs in parallel, slightly longer debounce)
  useEffect(() => {
    if (!searchTerm.trim()) { setMessageResults([]); return; }
    setMessageSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/search_messages?q=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setMessageResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Message search error:", err);
        setMessageResults([]);
      }
      setMessageSearchLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  // ✅ NEW: click on a message result → open chat and pass scroll target
  const handleMessageResultClick = (result) => {
    let conv;
    if (result.chat_type === "direct") {
      conv = convos.find(c => c.type === "user" && c.id === result.conversation_id) || {
        id: result.conversation_id, type: "user",
        other_user_id: result.other_user_id,
        other_username: result.chat_name,
        profile_image: result.chat_image,
        hasConversation: true,
      };
      setActiveChat(`convo-${result.conversation_id}`);
      onSelectConversation({ ...conv, _scrollToMessageId: result.message_id });
    } else {
      conv = convos.find(c => c.type === "group" && c.id === result.group_id) || {
        id: result.group_id, type: "group",
        group_name: result.chat_name,
        group_image: result.chat_image,
        hasConversation: true, isGroup: true,
      };
      setActiveChat(`group-${result.group_id}`);
      onSelectConversation({ ...conv, isGroup: true, _scrollToMessageId: result.message_id });
    }
    setSearchTerm("");
    setMessageResults([]);
  };

  // ✅ NEW: highlight the matched text inside a message snippet
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const plain = text.replace(/[*_~`]/g, "");
    const idx = plain.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return plain.length > 55 ? plain.slice(0, 55) + "…" : plain;
    const start = Math.max(0, idx - 15);
    const end   = Math.min(plain.length, idx + query.length + 35);
    return (
      <>
        {start > 0 && "…"}
        {plain.slice(start, idx)}
        <span className="font-bold text-[#f47f7f]">{plain.slice(idx, idx + query.length)}</span>
        {plain.slice(idx + query.length, end)}
        {end < plain.length && "…"}
      </>
    );
  };

  // Tab filtering (only used in normal mode)
  const baseList = showAllUsers ? searchResults : searchTerm ? searchResults : convos;
  const listToShow = baseList.filter(c => {
    if (activeTab === "unread") return c.unread > 0;
    if (activeTab === "groups") return c.type === "group";
    return true;
  });
  const unreadCount = convos.filter(c => c.unread > 0).length;

  const createConversation = async (otherUserId) => {
    try {
      const res = await fetch(`${API_URL}/createConversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user1_id: user.id, user2_id: otherUserId, session_id: storedSession }),
      });
      const data = await res.json();
      if (data.success) {
        setConvos(prev => uniqueById([...prev, { ...data.conversation, hasConversation: true }]));
        setSearchTerm("");
        onSelectConversation(data.conversation);
        window.location.reload();
      } else {
        setPopupMsg("Failed to create conversation.");
      }
    } catch (err) { console.error("Error creating conversation:", err); }
  };

  const timeAgo = (dateString) => {
    if (!dateString) return "";
    const nowIST  = new Date(Date.now() + 5.5 * 3600000);
    const msgTime = new Date(dateString);
    const diff    = nowIST - msgTime;
    const s = Math.floor(diff / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (s < 60)  return "just now";
    if (m < 60)  return `${m} min${m > 1 ? "s" : ""}`;
    if (h < 24)  return `${h} hour${h > 1 ? "s" : ""}`;
    if (d < 7)   return `${d} day${d > 1 ? "s" : ""}`;
    return msgTime.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const timeAgoGroup = (dateString) => {
    if (!dateString) return "";
    const msgTime = new Date(dateString.replace(" ", "T") + "+05:30");
    const diff    = Date.now() - msgTime;
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m} mins`;
    if (h < 24) return `${h} hour${h > 1 ? "s" : ""}`;
    if (d < 7)  return `${d} day${d > 1 ? "s" : ""}`;
    return msgTime.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  function getChatKey(c) {
    if (c.type === "group") return `group-${c.id}`;
    if (c.hasConversation && c.id) return `convo-${c.id}`;
    return `user-${c.id}`;
  }

  useEffect(() => {
    if (!token) return;
    const s = createSocket(token);
    socketRef.current = s;
    const upd = () => fetchChats();
    ["connect","new_message","new_group_message","message_seen","messages_marked_seen","group_messages_marked_seen"].forEach(ev => s.on(ev, upd));
    return () => ["connect","new_message","new_group_message","message_seen","messages_marked_seen","group_messages_marked_seen"].forEach(ev => s.off(ev, upd));
  }, [token, fetchChats]);

  // ✅ Extracted: render one conversation/user row (reused in both modes)
  const renderChatItem = (c) => {
    const name        = c.type === "group" ? c.group_name : c.other_username || c.username;
    const avatarLetter = name ? name.slice(0, 2).toUpperCase() : "?";
    const isActive    = activeChat === getChatKey(c);

    return (
      <button
        key={getChatKey(c)}
        onClick={async () => {
          if (showAllUsers && !searchTerm.trim()) return;
          setActiveChat(getChatKey(c));
          if (c.type === "user" && !c.hasConversation) { await onSelectConversation(null); return; }
          if (c.type === "user" && c.hasConversation) {
            const existing =
              (searchTerm.trim() || showAllUsers)
                ? convos.find(ch => ch.type === "user" && ch.other_user_id === c.id)
                : convos.find(ch => ch.type === "user" && ch.user_id === c.id);
            if (existing) {
              await fetch(`${API_URL}/seen/${existing.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
              onSelectConversation(existing); return;
            }
          }
          if (c.type === "user") {
            await fetch(`${API_URL}/seen/${c.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            onSelectConversation(c); fetchChats(); return;
          }
          onSelectConversation({ ...c, isGroup: true });
          fetch(`${API_URL}/group_seen/${c.id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
          fetchChats();
        }}
        className={`w-full text-left flex items-center gap-[10px] py-[10px] px-[14px] transition-colors duration-150 relative select-none cursor-pointer group ${isActive ? "bg-[#fff5f5]" : "hover:bg-[#fdf8f7]"}`}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[30px] bg-[#f47f7f] rounded-r-[3px]" />}

        {/* Avatar */}
        <div className={`w-[50px] h-[50px] rounded-[10px] flex items-center justify-center text-white font-bold text-[15px] font-['Outfit',sans-serif] shrink-0 relative tracking-[0.3px] overflow-hidden ${c.type === "group" ? "bg-gradient-to-br from-[#9ca3af] to-[#6b7280]" : "bg-gradient-to-br from-[#f47f7f] to-[#d95f5f]"}`}>
          {c.type === "group"
            ? c.group_image
              ? <img src={c.group_image.startsWith("http") ? c.group_image : `${API_URL.replace('/api', '')}${c.group_image}`} alt="Group" className="w-full h-full object-cover" />
              : <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            : c.profile_image
              ? <img src={c.profile_image} alt="Profile" className="w-full h-full object-cover" />
              : avatarLetter
          }
          {c.status === "online" && <div className="absolute -bottom-[1px] -right-[1px] w-[11px] h-[11px] bg-[#4ade80] rounded-full border-[2.5px] border-white" />}
        </div>

        

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#181818] font-['Outfit',sans-serif] whitespace-nowrap overflow-hidden text-ellipsis mb-[2.5px] tracking-[-0.1px]">{name}</div>
          <div className="text-[11.5px] text-[#9a9290] whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
            {(() => {
              if (c.type === "group") {
                const s = c.last_sender === user.username ? "You" : c.last_sender;
                if (!c.last_message) return `${s}: No messages yet`;
                if (c.last_message_type === "text")  return `${s}: ${c.last_message.replace(/[*_~`]/g,"")}`;
                if (c.last_message_type === "file")  return <><span className="truncate">{s}: <FontAwesomeIcon icon={faFile} className="text-[#c8bfb8] mr-1"/>{getDisplayFileName(c)}</span></>;
                if (c.last_message_type === "image") return <><span className="truncate">{s}: <FontAwesomeIcon icon={faImage} className="text-[#c8bfb8] mr-1"/>{getDisplayFileName(c)}</span></>;
                return `${s}: ${c.last_message.replace(/[*_~`]/g,"")}`;
              }
              if (!c.last_message) return c.email || "No messages yet";
              if (c.last_message_type === "text")  return c.last_message.replace(/[*_~`]/g,"");
              if (c.last_message_type === "file")  return <><FontAwesomeIcon icon={faFile} className="text-[#c8bfb8]"/><span className="truncate">{getDisplayFileName(c)}</span></>;
              if (c.last_message_type === "image") return <><FontAwesomeIcon icon={faImage} className="text-[#c8bfb8]"/><span className="truncate">{getDisplayFileName(c)}</span></>;
              return c.last_message;
            })()}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-[4px] shrink-0">
          <span className="text-[10.5px] text-[#b8b0a8]">{c.type === "group" ? timeAgoGroup(c.last_time) : timeAgo(c.last_time)}</span>
          {c.unread > 0 && <div className="w-[18px] h-[18px] bg-[#f47f7f] rounded-full flex items-center justify-center text-white text-[10px] font-bold">{c.unread}</div>}
          {!c.hasConversation && c.type !== "group" && (
            <div onClick={e => { e.stopPropagation(); createConversation(c.id); }} className="bg-[#fff1f1] text-[#f47f7f] text-[10px] font-semibold cursor-pointer hover:bg-[#f47f7f] hover:text-white rounded-[6px] px-[6px] py-[2px] transition-colors mt-auto">
              Connect <FontAwesomeIcon icon={faPlus} className="ml-[2px]"/>
            </div>
          )}
        </div>
      </button>
    );
  };

  const getDisplayFileName = (c) => {
    if (c.last_message_original_name) return c.last_message_original_name;
    return c.last_message ? c.last_message.split("/").pop() : "";
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-[336px] min-w-[336px] bg-white border-r border-[#ece7e0] flex flex-col h-screen font-['Plus_Jakarta_Sans',sans-serif]">
      <style>{`.custom-scrollbar::-webkit-scrollbar{width:3px}.custom-scrollbar::-webkit-scrollbar-thumb{background:#ede5e0;border-radius:2px}`}</style>

      {/* Header */}
      <div className="pt-[16px] px-[14px] pb-0">
        <div className="flex items-center justify-between mb-[12px]">
          <span className="font-['Outfit',sans-serif] text-[20px] font-bold text-[#181818] tracking-[-0.5px] truncate max-w-[180px]">
            {user.username}
          </span>
        
           <button
  onClick={async () => {
    if (showAllUsers) {
      // 🔴 If already showing all users, undo it
      setShowAllUsers(false);
      setSearchResults([]);
      setSearchTerm("");
      return;
    }
   

    // 🟢 Otherwise, show all users
    setLoading(true);
    setShowAllUsers(true);
    try {
      const res = await fetch(`${API_URL}/all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const userList = Array.isArray(data) ? data : [];

      const existingUsernames = new Set(convos.map((c) => c.other_username));
      const result = userList.map((u) => ({
        ...u,
        hasConversation: existingUsernames.has(u.username),
      }));

      setSearchResults(result);
      setSearchTerm("");
    } catch (err) {
      console.error("Error fetching all users:", err);
    } finally {
      setLoading(false);
    }
  }}
  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
  title={showAllUsers ? "Hide all users" : "Show all users"}
>
  {showAllUsers ? (
    <X className="w-5 h-5 text-gray-600 cursor-pointer" />
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#f47f7f"><path d="M120-160v-600q0-33 23.5-56.5T200-840h480q33 0 56.5 23.5T760-760v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H200v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H240L120-160Zm160-440h320v-80H280v80Zm0 160h200v-80H280v80Zm400 280v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM200-360v-400 400Z"/></svg>
  )}
</button>
        </div>

        {/* Search bar */}
        <div className="relative mb-[9px]">
          <svg className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#c0b8b0]" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search people, groups, messages…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full py-[6px] pr-[30px] pl-[33px] bg-[#f6f2ee] border-[1.5px] border-transparent rounded-[11px] text-[12.5px] text-[#333] outline-none transition-all duration-150 focus:bg-white focus:border-[#f8b0b0] focus:shadow-[0_0_0_3px_rgba(243,124,124,0.09)] placeholder:text-[#bab0a8]"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(""); setMessageResults([]); }} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#c0b8b0] hover:text-[#f47f7f] cursor-pointer">
              <X className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>

      {/* ✅ Tabs — hidden while searching so results aren't filtered */}
      {!searchTerm.trim() && (
        <div className="flex gap-[5px] px-[14px] pb-[10px]">
          {[
            { key: "all",    label: "All" },
            { key: "unread", label: "Unread", badge: unreadCount },
            { key: "groups", label: "Groups" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-[13px] py-[4.5px] rounded-[16px] text-[11.5px] font-medium transition-all cursor-pointer duration-150 flex items-center gap-[6px] ${
                activeTab === tab.key
                  ? "bg-[#f47f7f] text-white shadow-[0_3px_9px_rgba(243,124,124,0.30)]"
                  : "bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1] hover:text-[#f47f7f]"
              }`}>
              {tab.label}
              {tab.badge > 0 && (
                <span className={`w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold ${activeTab === tab.key ? "bg-white text-[#f47f7f]" : "bg-[#f47f7f] text-white"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="h-[1px] bg-[#f2ede8] m-0 w-full shrink-0" />

      {/* ✅ Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {searchTerm.trim() ? (
          // ── SEARCH MODE ────────────────────────────────────────────────────
          <>
            {/* Contacts & Groups section */}
            {loading && <div className="p-3 text-[#9a9290] text-xs text-center">Searching…</div>}
            {!loading && searchResults.length > 0 && (
              <>
                <div className="px-[14px] py-[6px] text-[10px] font-semibold text-[#9a9290] uppercase tracking-[0.8px] bg-[#faf7f4] border-b border-[#f2ede8]">
                  Contacts &amp; Groups
                </div>
                {searchResults.map(c => renderChatItem(c))}
              </>
            )}

            {/* Messages section */}
            {messageSearchLoading && <div className="p-3 text-[#9a9290] text-xs text-center">Searching messages…</div>}
            {!messageSearchLoading && messageResults.length > 0 && (
              <>
                <div className="px-[14px] py-[6px] text-[10px] font-semibold text-[#9a9290] uppercase tracking-[0.8px] bg-[#faf7f4] border-b border-[#f2ede8] mt-[1px]">
                  Messages
                </div>
                {messageResults.map(result => (
                  <button
                    key={`msg-${result.message_id}`}
                    onClick={() => handleMessageResultClick(result)}
                    className="w-full text-left flex items-center gap-[10px] py-[10px] px-[14px] hover:bg-[#fdf8f7] transition-colors duration-150 cursor-pointer border-b border-[#faf7f4]"
                  >
                    {/* Avatar */}
                    <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white font-bold text-[11px] font-['Outfit',sans-serif] shrink-0 tracking-[0.3px] overflow-hidden ${result.chat_type === "group" ? "bg-gradient-to-br from-[#9ca3af] to-[#6b7280]" : "bg-gradient-to-br from-[#f47f7f] to-[#d95f5f]"}`}>
                      {result.chat_image
                        ? <img src={result.chat_image} alt="" className="w-full h-full object-cover"/>
                        : result.chat_type === "group"
                          ? <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                          : result.chat_name?.slice(0, 2).toUpperCase() || "?"
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-[2px]">
                        <span className="text-[13.5px] font-semibold text-[#181818] font-['Outfit',sans-serif] truncate max-w-[150px]">{result.chat_name}</span>
                        <span className="text-[10px] text-[#b8b0a8] shrink-0 ml-1">{timeAgo(result.timestamp)}</span>
                      </div>
                      <div className="text-[11.5px] text-[#9a9290] line-clamp-1">
                        <span className="font-medium">{result.sender_id === user?.id ? "You" : result.sender_name}: </span>
                        {highlightText(result.message, searchTerm)}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Empty state */}
            {!loading && !messageSearchLoading && searchResults.length === 0 && messageResults.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-[#9a9290] text-xs font-medium">No results for "{searchTerm}"</p>
              </div>
            )}
          </>
        ) : (
          // ── NORMAL MODE ────────────────────────────────────────────────────
          <>
            {loading && <div className="p-4 text-[#9a9290] text-xs font-medium text-center">Searching…</div>}
            {Array.isArray(listToShow) && listToShow.length > 0
              ? listToShow.map(c => renderChatItem(c))
              : !loading && <div className="p-4 text-[#9a9290] text-xs font-medium text-center">No users found</div>
            }
          </>
        )}
      </div>

      {/* Popups */}
      {popupMsg && <div className="fixed inset-0 bg-[#2e2e2e69] bg-opacity-30 z-[140] h-full blur-[2px]"/>}
      {popupMsg && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-[16px] z-[150] flex flex-col space-y-1 min-w-[320px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] text-center">
          <h2 className="text-[#181818] text-[20px] font-bold font-['Outfit',sans-serif] tracking-[-0.5px]">Message</h2>
          <div className="text-[#d95f5f] bg-[#fff5f5] px-4 py-3 rounded-[10px] text-[14px] my-3 font-medium">{popupMsg}</div>
          <button onClick={() => setPopupMsg("")} className="bg-[#f47f7f] text-white py-[6px] px-[16px] rounded-[10px] hover:bg-[#d95f5f] font-medium mx-auto mt-2">OK</button>
        </div>
      )}
    </div>
  );
};

export default HomePageUsers;