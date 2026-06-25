import React, { useState, useEffect } from "react";

const ClonePage = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  // const [sessionId, setSessionId] = useState(null);
  // const [clickId, setClickId] = useState(null);
  // ✅ Generate UUID
  const generateUUID = () => crypto.randomUUID();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");

    const activeToken = urlToken || localStorage.getItem("token");

    if (urlToken) {
      localStorage.setItem("token", urlToken);
      setToken(urlToken);
    } else if (activeToken) {
      setToken(activeToken);
    }

    // ✅ Redirect if no token
    if (!activeToken) {
      window.location.href = "http://localhost:5001/login";
      return;
    }

    // ✅ Create or reuse session_id
    // let storedSession = localStorage.getItem("session_id");
    // if (!storedSession) {
    //   storedSession = generateUUID();
    //   localStorage.setItem("session_id", storedSession);
    // }
    // setSessionId(storedSession);



    // ✅ Validate token
    fetch("http://localhost:5001/auth/validate_and_details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: activeToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setUser({
            id: data.user_id,
            ...data.user_details,
          });
        } else {
          localStorage.removeItem("token");
          window.location.href = "http://localhost:5001/login";
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        window.location.href = "http://localhost:5001/login";
      });
  }, []);

  // ✅ Button click handler with click_id generation
const goToChatApp = () => {
  let clickId = generateUUID();
  let sessionId = generateUUID();

  // ✅ Decide route based on role
  const basePath = user?.role === "admin" ? "/admin" : "/";

  const redirectUrl = `http://localhost:3000${basePath}?token=${token}&session_id=${sessionId}&click_id=${clickId}`;
  
  window.location.href = redirectUrl;
};

  if (!token || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h2 className="text-gray-600 text-xl font-semibold">
          Loading user info...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={goToChatApp}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition"
      >
        ChatApp
      </button>
    </div>
  );
};

export default ClonePage;
