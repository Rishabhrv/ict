import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faImage, faPlus,faUserGroup } from "@fortawesome/free-solid-svg-icons";
import {  Search, MessagesSquare, X   } from "lucide-react";
import { createSocket } from "../socket";


const API_URL = process.env.REACT_APP_API_URL;

const HomePageUsers = ({ token, onSelectConversation, user, lastMessageUpdate }) => {
  const [convos, setConvos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const socketRef = useRef(null);
  const [popupMsg, setPopupMsg] = useState("");
  const storedSession = localStorage.getItem("session_id");
  const activeChatRef = useRef(null);
  

  
  // const [isSliderOpen, setIsSliderOpen] = useState(false);

  


const normalizeChats = (items) =>
  items.map(i => ({
    ...i,
    sort_time: 
      i.last_time || 
      i.last_message_time || 
      i.updated_at || 
      i.created_at || 
      0
  }));


  useEffect(() => {
  activeChatRef.current = activeChat;
}, [activeChat]);


const getTimeValue = (t) => {
  if (!t) return 0;

  t = t.trim();

  // GROUP TIME: "2025-11-21 17:08:11"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(t)) {
    const [datePart, timePart] = t.split(" ");
    return new Date(`${datePart}T${timePart}.000+05:30`).getTime();
  }

  // USER TIME: GMT → convert manually to IST
  if (t.includes("GMT")) {
    const utcMs = new Date(t).getTime();
    return utcMs - (5.5 * 60 * 60 * 1000); // add IST offset
  }

  // Fallback
  return new Date(t).getTime();
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

    const userChats = safeConvos.map(c => ({ ...c, type: "user", hasConversation: true }));
    const groups = safeGroups.map(g => ({ ...g, type: "group", hasConversation: true }));

    const merged = [...userChats, ...groups];


    // 🔥 NORMALIZE
    const normalized = normalizeChats(merged);


    // 🔥 SORT
    const sorted = normalized.sort(
      (a, b) => getTimeValue(b.sort_time) - getTimeValue(a.sort_time)
    );



    // 🔥 UNIQUE BY ID
    const finalList = uniqueById(sorted);



setConvos(prev => {
  const oldActive = activeChatRef.current;
  if (oldActive) setActiveChat(oldActive);
  return finalList;
});



  } catch (err) {
    console.error("Error fetching chats:", err);
  }
}, [token]);


  useEffect(() => {
    fetchChats();
  }, [fetchChats, lastMessageUpdate]);

  const uniqueById = (list) => {
    const map = new Map();
    list.forEach(item => {
      const key = item.type === "group" ? `g-${item.id}` : `u-${item.other_user_id || item.user_id || item.id}`;
      if (!map.has(key)) map.set(key, item);
    });
    return [...map.values()];
  };

  // ✅ Initialize socket
    useEffect(() => {
      if (!token) return;
      const s = createSocket(token);
      socketRef.current = s;
  
      s.on("connect", () => {
        // console.log("Socket connected");
      });
    },[token]);



 // ✅ 2. Search Users + Groups (FULLY FIXED)
useEffect(() => {
  if (!searchTerm.trim()) {
    setSearchResults([]);
    return;
  }

  setLoading(true);

  const timer = setTimeout(async () => {
    try {
      const [userRes, groupRes] = await Promise.all([
        fetch(`${API_URL}/users?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/groups?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const users = await userRes.json();
      const groups = await groupRes.json();

      const lower = searchTerm.toLowerCase();

      // 🔥 Get names of all users you already chatted with
      const existingUsernames = new Set(
        convos
          .filter(c => c.type === "user")
          .map(c => c.other_username || c.username)
      );

      // 🔥 FILTER groups by group_name
      const filteredGroups = groups
        .filter(g => g.group_name?.toLowerCase().includes(lower))
        .map(g => ({
          ...g,
          type: "group",
          hasConversation: true
        }));

      // 🔥 FILTER users by username
      const filteredUsers = users
        .filter(u => u.username?.toLowerCase().includes(lower))
        .map(u => ({
          ...u,
          type: "user",
          hasConversation: existingUsernames.has(u.username)
        }));

      // 🔥 FINAL SEARCH RESULTS (correct)
      setSearchResults([...filteredGroups, ...filteredUsers]);

    } catch (err) {
      console.error("Search error:", err);
    }

    setLoading(false);
  }, 100);

  return () => clearTimeout(timer);
}, [searchTerm, token, convos]);




  const listToShow = showAllUsers
  ? searchResults
  : searchTerm
  ? searchResults
  : convos;

  // 🔹 Create new conversation
  const createConversation = async (otherUserId) => {
    try {
      const res = await fetch(`${API_URL}/createConversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user1_id: user.id,
          user2_id: otherUserId,
          session_id: storedSession
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConvos((prev) =>
          uniqueById([...prev, { ...data.conversation, hasConversation: true }])
        );

        setSearchTerm("");
        onSelectConversation(data.conversation);
        window.location.reload();
      } else {
        setPopupMsg("Failed to create conversation.");
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

const timeAgo = (dateString) => {
  if (!dateString) return "";

  // Get IST current time
  const now = new Date();
  const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

  // Parse message time (already IST in your backend)
  const messageTime = new Date(dateString);

  const diffMs = nowIST - messageTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""}`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""}`;

  return messageTime.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

// ✅ For Group (IST format "2025-11-12 12:49:31")
const timeAgoGroup = (dateString) => {
  if (!dateString) return "";

  // Convert "2025-11-12 12:49:31" → valid IST Date
  const messageTime = new Date(dateString.replace(" ", "T") + "+05:30");

  const now = new Date();
  const diffMs = now - messageTime;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} mins`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} `;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} `;

  return messageTime.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};



function getChatKey(c) {
  if (c.type === "group") return `group-${c.id}`;

  // If conversation exists → use conversation_id
  if (c.hasConversation && c.id) return `convo-${c.id}`;

  // If it's a search result user → use user id
  return `user-${c.id}`;
}

useEffect(() => {
  // ❌ Stop auto-refresh when searching or viewing all users
  if (searchTerm.trim() || showAllUsers) return;

  // ✅ Auto-refresh every 3 second
  const interval = setInterval(() => {
    fetchChats();
  }, 3000);

  return () => clearInterval(interval);
}, [fetchChats, searchTerm, showAllUsers]);



  return (
    <div className="w-80 min-w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0 border-b border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
          </div>
          <div className="flex">
            {/* <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Plus className="w-5 h-5 text-gray-600" />
          </button> */}
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
    <MessagesSquare className="w-5 h-5 text-gray-600 cursor-pointer" />
  )}
</button>

          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-[13px] pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f37c7c]"
          />
        </div>

        <div className="flex justify-between mt-1 ">
          <div className="flex">
            <div className="text-xs text-gray-500 bg-gray-100 p-1 px-2 m-2 ml-0 rounded-lg cursor-pointer">
              New
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 p-1 px-2 m-2 rounded-lg cursor-pointer">
              Unread
            </div>
          </div>
          {/* <div
  onClick={() => setIsSliderOpen(true)}
  className="text-xs text-white bgcolor p-1 m-2 ml-0 rounded-full cursor-pointer hover:bg-white hover:text-bgcolor transition"
>
  <FontAwesomeIcon icon={faPlus} />
</div> */}
        </div>
      </div>

      {/* Conversation list */}
      <div className="overflow-y-auto height-userlist hide-scrollbar">
        {loading && <div className="p-4 text-gray-500">Searching...</div>}

        {Array.isArray(listToShow) && listToShow.length > 0 ? (
          listToShow.map((c) => {
            const name = c.type === "group" ? c.group_name : c.other_username || c.username;
            const avatarLetter = name ? name.charAt(0).toUpperCase() : "?";
            
const isActive = activeChat === getChatKey(c);


            return (

              <button
                key={getChatKey(c)}

               onClick={async () => {
                if (showAllUsers && !searchTerm.trim()) {
  // Only stop opening when in FULL USER LIST MODE (not search)
  return;
}

                const identity = getChatKey(c);

  setActiveChat(identity);

  // RESET unread instantly
  // setConvos((prev) =>
  //   prev.map((chat) => {
  //     if (chat.type === "group" && chat.id === c.id) return { ...chat, unread: 0 };
  //     if (chat.type === "user" && chat.user_id === c.user_id) return { ...chat, unread: 0 };
  //     return chat;
  //   })
  // );

  // 🔥 If SEARCH RESULT user & no conversation → create it
  if (c.type === "user" && !c.hasConversation) {
    await onSelectConversation(null);
    return;
  }

        // 🔥 If SEARCH RESULT user & conversation exists → find it
        // 🔥 USER chat with existing conversation
if (c.type === "user" && c.hasConversation) {

  // 🎯 If searching → match using other_user_id
  const existingSearch = (searchTerm.trim() || showAllUsers)
    ? convos.find(
        (chat) =>
          chat.type === "user" &&
          chat.other_user_id === c.id
      )
    : null;

  // 🎯 Normal list → match using user_id
  const existingNormal = (!searchTerm.trim() && !showAllUsers)
    ? convos.find(
        (chat) =>
          chat.type === "user" &&
          chat.user_id === c.id
      )
    : null;

  // 🎯 Pick whichever is found
  const existing = existingSearch || existingNormal;

  if (existing) {
    await fetch(`${API_URL}/seen/${existing.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });

    onSelectConversation(existing);
    return;
  }
}


  // NORMAL USER CHAT
  if (c.type === "user") {
    await fetch(`${API_URL}/seen/${c.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    onSelectConversation(c);
    fetchChats();
    return;
  }

  // GROUP CHAT
  onSelectConversation({ ...c, isGroup: true });
  fetch(`${API_URL}/group_seen/${c.id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  fetchChats();
}}

                className={`w-full p-4 flex items-start space-x-3 hover:bg-red-50 transition-colors cursor-pointer ${
                  isActive ? "bg-red-50" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-semibold ${
                      c.type === "group"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-gradient-to-br from-[#ff8181ff] to-[#ff5f5fff] text-white"
                    }`}
                  >
                    {c.group_image ? (
                      <FontAwesomeIcon icon={faUserGroup} />
                    ) : (
                      avatarLetter
                    )}
                  </div>

                  {c.status === "online" && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate text-[15px]">{name}</h3>
                    <div className="flex">
                      {
                      c.unread > 0 && (
                    <div className="flex-shrink-0  w-5 h-5 bgcolor-500 rounded-full flex items-center justify-center text-xs text-white font-semibold">
                      {c.unread}
                    </div>
                  )
                    }

                    <span className="text-xs text-gray-500 ml-2">
                      {c.type === "group" ? timeAgoGroup(c.last_time) : timeAgo(c.last_time)}
                    </span>

                    </div>
                    
                  </div>

                  <p className="text-xs text-gray-600 truncate flex items-center gap-1">
  {(() => {
    if (c.type === "group") {
      const sender = c.last_sender === user.username ? "You" : c.last_sender;
      
      if (!c.last_message) return `${sender}: No messages yet`;

      if (c.last_message_type === "text")
        return `${sender}: ${c.last_message.replace(/[*_~`]/g, "")}`;

      if (c.last_message_type === "file") {
        const fileName = c.last_message.split("/").pop();
        return (
          <>
            <span>{sender}:</span>
            <FontAwesomeIcon icon={faFile} className="text-gray-400" />
            <span className="truncate max-w-[120px]">{fileName}</span>
          </>
        );
      }

      if (c.last_message_type === "image") {
        const fileName = c.last_message.split("/").pop();
        return (
          <>
            <span>{sender}:</span>
            <FontAwesomeIcon icon={faImage} className="text-gray-400" />
            <span className="truncate max-w-[120px]">{fileName}</span>
          </>
        );
      }

      return `${sender}: ${c.last_message.replace(/[*_~`]/g, "")}`;
    }

    // ✅ normal user chat below
    if (!c.last_message) return c.email || "No messages yet";
    if (c.last_message_type === "text") return c.last_message.replace(/[*_~`]/g, "");

    if (c.last_message_type === "file") {
      const fileName = c.last_message.split("/").pop();
      return (
        <>
          <FontAwesomeIcon icon={faFile} className="text-gray-400" />
          <span className="truncate max-w-[80%]">{fileName}</span>
        </>
      );
    }

    if (c.last_message_type === "image") {
      const fileName = c.last_message.split("/").pop();
      return (
        <>
          <FontAwesomeIcon icon={faImage} className="text-gray-400" />
          <span className="truncate max-w-[150px]">{fileName}</span>
        </>
      );
    }

    return c.last_message;
  })()}
</p>

                </div>

                {/* Unread or New chat */}
                {!c.hasConversation && c.type !== "group" && (
                  
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      createConversation(c.id);
                      
                    }}
                    className="bg-white text-red-400 border text-[10px] cursor-pointer hover:bg-red-300 hover:text-white rounded-lg p-1 py-[2px] my-auto"
                    title="Start Conversation"
                  >
                    Connect <FontAwesomeIcon icon={faPlus} />
              
                  </div>
                )}

              </button>
            );
          })
        ) : (
          !loading && <div className="p-4 text-gray-500 text-sm">No users found</div>
        )}
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


    </div>
  );
};

export default HomePageUsers;
