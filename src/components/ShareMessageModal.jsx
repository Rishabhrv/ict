// src/components/ShareMessageModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faUsers } from "@fortawesome/free-solid-svg-icons";
import { X } from "lucide-react";

const ShareMessageModal = ({
  isOpen,
  onClose,
  token,
  API_URL,
  currentUser,
  onShare,
  onShareGroup,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [recent, setRecent] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);

  const safeFetch = useCallback(
    async (url) => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await res.text();
        if (!res.ok) return [];
        try { return JSON.parse(text); } catch { return []; }
      } catch (err) { return []; }
    },
    [token]
  );

 useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      safeFetch(`${API_URL}/recent_chats`),
      safeFetch(`${API_URL}/groups`),
      safeFetch(`${API_URL}/all_users`),
    ]).then(([recentChats, groupList, userList]) => {
      // ✅ Update: Keep the 'image' key from the backend
      const recentItems = (Array.isArray(recentChats) ? recentChats : []).map(
        (r) => ({ id: r.id, name: r.name, type: r.type, image: r.image })
      );
      const recentKeys = new Set(recentItems.map((i) => `${i.type}-${i.id}`));

      // ✅ Update: Keep the 'group_image' as 'image'
      const groupItems = (Array.isArray(groupList) ? groupList : [])
        .map((g) => ({ id: g.id, name: g.group_name || g.name, type: "group", image: g.group_image }))
        .filter((g) => !recentKeys.has(`group-${g.id}`));

      // ✅ Update: Keep the 'profile_image' as 'image'
      const userItems = (Array.isArray(userList) ? userList : [])
        .filter((u) => u.id !== currentUser.id)
        .map((u) => ({ id: u.id, name: u.username, type: "user", image: u.profile_image }))
        .filter((u) => !recentKeys.has(`user-${u.id}`));

      setRecent(recentItems);
      setGroups(groupItems);
      setUsers(userItems);
    });
  }, [isOpen, API_URL, currentUser.id, safeFetch]);

  const toggleSelect = (item) => {
    setSelected((prev) =>
      prev.some((p) => p.id === item.id && p.type === item.type)
        ? prev.filter((p) => !(p.id === item.id && p.type === item.type))
        : [...prev, item]
    );
  };

  const handleShare = () => {
    const userIds = selected.filter((i) => i.type === "user").map((i) => i.id);
    const groupIds = selected.filter((i) => i.type === "group").map((i) => i.id);
    if (userIds.length) onShare(userIds);
    if (groupIds.length) onShareGroup(groupIds);
    setSelected([]);
    onClose();
  };

  const filterBySearch = (list) =>
    list.filter((i) => i.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; } 
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ede5e0; border-radius: 2px; }
      `}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 left-0 h-full w-[296px] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.13)] z-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-[15px] border-b border-[#ece7e0]">
          <h2 className="text-[19px] font-bold font-['Outfit',sans-serif] text-[#181818] tracking-[-0.4px]">
            Share Message
          </h2>
          <button onClick={onClose} className="cursor-pointer text-[#aaa] hover:text-[#f47f7f] transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-[14px] pb-[8px]">
          <input
            type="text"
            placeholder="Search contacts or groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-[8px] pr-[12px] pl-[33px] bg-[#f6f2ee] border-[1.5px] border-transparent rounded-[11px] text-[12.5px] text-[#333] outline-none transition-all duration-150 focus:bg-white focus:border-[#f8b0b0] focus:shadow-[0_0_0_3px_rgba(243,124,124,0.09)] placeholder:text-[#bab0a8]"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto max-h-[75vh] px-[8px] pb-[72px] custom-scrollbar">
          {filterBySearch(recent).length > 0 && (
            <>
              <p className="text-[10.5px] font-bold text-[#b8b0a8] uppercase tracking-[0.08em] px-[6px] py-[4px] mt-[4px]">Recent</p>
              {filterBySearch(recent).map(renderItem)}
            </>
          )}

          {filterBySearch(groups).length > 0 && (
            <>
              <p className="text-[10.5px] font-bold text-[#b8b0a8] uppercase tracking-[0.08em] px-[6px] py-[4px] mt-[10px]">Groups</p>
              {filterBySearch(groups).map(renderItem)}
            </>
          )}

          {filterBySearch(users).length > 0 && (
            <>
              <p className="text-[10.5px] font-bold text-[#b8b0a8] uppercase tracking-[0.08em] px-[6px] py-[4px] mt-[10px]">Contacts</p>
              {filterBySearch(users).map(renderItem)}
            </>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleShare}
          disabled={!selected.length}
          className={`fixed bottom-5 left-30 w-[46px] h-[46px] flex items-center justify-center rounded-[14px] cursor-pointer transition-all duration-150 ${
            selected.length 
              ? "bg-[#f47f7f] text-white shadow-[0_4px_14px_rgba(243,124,124,0.35)] hover:scale-105 active:scale-95" 
              : "bg-[#ddd5d0] text-white cursor-not-allowed"
          }`}
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </>
  );

function renderItem(item) {
    const isSelected = selected.some((s) => s.id === item.id && s.type === item.type);
    
    // Fallback initials
    const initials = item.name ? item.name.slice(0, 2).toUpperCase() : "??";

    return (
      <div
        key={`${item.type}-${item.id}`}
        onClick={() => toggleSelect(item)}
        className={`flex items-center px-[14px] py-[9px] rounded-[10px] cursor-pointer mb-[2px] transition-colors duration-150 ${
          isSelected ? "bg-[#fff5f5]" : "hover:bg-[#fdf8f7]"
        }`}
      >
        {/* Avatar Container */}
        <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-white font-bold text-[11px] font-['Outfit',sans-serif] mr-[11px] shrink-0 overflow-hidden ${
          item.type === "group" ? "bg-gray-400" : "bg-gradient-to-br from-[#f47f7f] to-[#d95f5f]"
        }`}>
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          ) : item.type === "group" ? (
            <FontAwesomeIcon icon={faUsers} className="text-[13px]" />
          ) : (
            initials
          )}
        </div>
        
        <span className="text-[13.5px] font-semibold text-[#181818] font-['Outfit',sans-serif]">
          {item.name}
        </span>
      </div>
    );
  }
};

export default ShareMessageModal;