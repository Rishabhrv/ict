import React, { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faUsers } from "@fortawesome/free-solid-svg-icons";

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

  // ✅ STABLE safeFetch
  const safeFetch = useCallback(
    async (url) => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await res.text();

        if (!res.ok) {
          console.error("API error:", url, text);
          return [];
        }

        try {
          return JSON.parse(text);
        } catch {
          console.error("Not JSON from:", url, text);
          return [];
        }
      } catch (err) {
        console.error("Fetch failed:", url, err);
        return [];
      }
    },
    [token]
  );

  // 🔹 Fetch RECENT + USERS + GROUPS
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      safeFetch(`${API_URL}/recent_chats`),
      safeFetch(`${API_URL}/groups`),
      safeFetch(`${API_URL}/all_users`),
    ]).then(([recentChats, groupList, userList]) => {
      // RECENT
      const recentItems = (Array.isArray(recentChats) ? recentChats : []).map(
        (r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
        })
      );

      const recentKeys = new Set(
        recentItems.map((i) => `${i.type}-${i.id}`)
      );

      // GROUPS
      const groupItems = (Array.isArray(groupList) ? groupList : [])
        .map((g) => ({
          id: g.id,
          name: g.group_name || g.name,
          type: "group",
        }))
        .filter((g) => !recentKeys.has(`group-${g.id}`));

      // USERS
      const userItems = (Array.isArray(userList) ? userList : [])
        .filter((u) => u.id !== currentUser.id)
        .map((u) => ({
          id: u.id,
          name: u.username,
          type: "user",
        }))
        .filter((u) => !recentKeys.has(`user-${u.id}`));

      setRecent(recentItems);
      setGroups(groupItems);
      setUsers(userItems);
    });
  }, [isOpen, API_URL, currentUser.id, safeFetch]);

  // 🔹 Selection toggle
  const toggleSelect = (item) => {
    setSelected((prev) =>
      prev.some((p) => p.id === item.id && p.type === item.type)
        ? prev.filter((p) => !(p.id === item.id && p.type === item.type))
        : [...prev, item]
    );
  };

  // 🔹 Share
  const handleShare = () => {
    const userIds = selected.filter((i) => i.type === "user").map((i) => i.id);
    const groupIds = selected.filter((i) => i.type === "group").map((i) => i.id);

    if (userIds.length) onShare(userIds);
    if (groupIds.length) onShareGroup(groupIds);

    setSelected([]);
    onClose();
  };

  const filterBySearch = (list) =>
    list.filter((i) =>
      i.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0  z-40" onClick={onClose} />

      <div className="fixed top-0 left-0 h-full w-100 bg-white shadow-lg z-50">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Share Message</h2>
          <button onClick={onClose} className="text-xl cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-3 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 rounded-full px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-3">
          {filterBySearch(recent).length > 0 && (
            <>
              <p className="text-xs text-gray-500 mb-2">Recent</p>
              {filterBySearch(recent).map(renderItem)}
            </>
          )}

          {filterBySearch(groups).length > 0 && (
            <>
              <p className="text-xs text-gray-500 mt-4 mb-2">Groups</p>
              {filterBySearch(groups).map(renderItem)}
            </>
          )}

          {filterBySearch(users).length > 0 && (
            <>
              <p className="text-xs text-gray-500 mt-4 mb-2">Contacts</p>
              {filterBySearch(users).map(renderItem)}
            </>
          )}
        </div>

        <button
          onClick={handleShare}
          disabled={!selected.length}
          className={`fixed bottom-10 left-[165px] bg-[#f37c7c] text-white p-3 rounded-full shadow-lg cursor-pointer ${
            !selected.length ? "opacity-50" : "hover:bg-[#ef6061]"
          }`}
        >
          <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>
    </>
  );

  function renderItem(item) {
    const isSelected = selected.some(
      (s) => s.id === item.id && s.type === item.type
    );

    const initials =
      item.type === "group"
        ? <FontAwesomeIcon icon={faUsers} className="text-gray-500"/>
        : item.name.slice(0, 2).toUpperCase();

    return (
      <div
        key={`${item.type}-${item.id}`}
        onClick={() => toggleSelect(item)}
        className={`flex items-center px-3 py-2 rounded-lg cursor-pointer mb-1 ${
          isSelected ? "bg-[#f37c7c]/10" : "hover:bg-gray-50"
        }`}
      >
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-full text-white text-xs mr-3 ${
            item.type === "group" ? "bg-gray-200" : "bg-[#f37c7c]"
          }`}
        >
          {initials}
        </div>
        <span className="text-sm font-medium">{item.name}</span>
      </div>
    );
  }
};

export default ShareMessageModal;
