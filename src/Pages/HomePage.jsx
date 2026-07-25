import React, { useState, useEffect } from "react";
import Slidebar from "../components/Slidebar";
import HomePageUsers from "../components/HomePageUsers";
import HomePageMsg from "../components/HomePageMsg";
import HomePageGroupMsg from "../components/HomePageGroupMsg";
import '../css/SlideBar.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";

const FLASK_AUTH_URL = process.env.REACT_APP_FLASK_AUTH_URL;
const FLASK_LOGIN_URL = process.env.REACT_APP_FLASK_LOGIN_URL;
const API_URL = process.env.REACT_APP_API_URL;


// ✅ Allowed roles and apps
const VALID_ROLES = ["admin", "user"];
const VALID_APPS = {
  Main: "main",
  Operations: "operations",
  IJISEM: "ijisem",
  Tasks: "tasks",
  Sales: "sales",
  Clone: "clone",
  Home: "home",
};

const VALID_ACCESS = {
    "ISBN": "manage_isbn_dialog",
    "Payment": "manage_price_dialog",
    "Authors": "edit_author_dialog",
    "Operations": "edit_operation_dialog",
    "Printing & Delivery": "edit_inventory_delivery_dialog",
    "DatadashBoard": "datadashoard",
    "Team Dashboard": "team_dashboard",
    "Print Management": "print_management",
    "Manage Delivery": "delivery_management",
    "Inventory": "inventory",
    "Listings": "online_listings",
    "File Management": "file_management",
    "Social Coverage": "social_coverage",
    "Open Author Positions": "open_author_positions",
    "Pending Work": "pending_books",
    "IJISEM": "ijisem",
    "Academic Guru": "academic_guru",
    "Timesheet": "timesheet",
    "Task Manager": "task_manager",
    "Details": "details",
    "Message": "messages",
    "Attendance": "attendance",
    "My Attendance": "my_attendance",
    "Extra Books": "extra_books",
    "Sales Tracking": "sales_track",
    "Activity Summary": "activity_summary_dialog",
    "Online Stock": "online_stock_viewer",
    "Author Emails": "author_emails",
    "Monitoring": "monitoring",
    "Payments": "payments",
    "Activity Log": "activity_log",
    "Settings": "settings",
    "Add Book": "add_book_dialog",
    "Pending Checklist": "pending_checklist_dialog",
    "Authors Edit": "edit_author_detail",
    "Orders": "orders",
    "Local LLM": "local_llm",
    "Certificates": "certificates"
}




const HomePage = () => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedConv, setSelectedConv] = useState(null);
  const [lastMessageUpdate, setLastMessageUpdate] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const [popupMsg, setPopupMsg] = useState(""); // ✅ popup message state
  const [ , setSessionId] = useState(null);
  const [ , setClickId] = useState(null);
  const [scrollToMessageId, setScrollToMessageId] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  

  

  // ✅ Custom popup function
  const showPopup = (message) => {
  setPopupMsg(message);
};

// ✅ Helper to redirect to login
const redirectToLogin = (message) => {
  console.warn("Redirecting:", message);
  localStorage.removeItem("token");
  showPopup(message || "Authentication failed. Please log in again.");
};



// ✅ Decode JWT (client-side)
const decodeJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("JWT decode error:", e);
    return null;
  }
};

// ✅ Token expiry check — uses JWT exp (UTC-based)
const checkTokenExpiry = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    redirectToLogin("Invalid token structure.");
    return true;
  }

  // ✅ Compare UTC times directly (both in milliseconds)
  const nowUTC = Date.now();
  const expUTC = payload.exp * 1000;

  if (nowUTC > expUTC) {
    const expTime = new Date(expUTC).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    console.log(`Token expired at ${expTime} IST`);
    redirectToLogin("Token expired. Please log in again.");
    return true;
  }

  return false;
};

  // ✅ Main token + user validation logic
  const validateToken = async (activeToken) => {
    try {
      const res = await fetch(FLASK_AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken }),
      });

      if (!res.ok) {
        redirectToLogin("Authentication server not reachable.");
        return;
      }

      const data = await res.json();
      if (!data.valid) {
        redirectToLogin(`Invalid token: ${data.error || "Unknown error"}`);
        return;
      }

      // ✅ Extract user details
      const userDetails = data.user_details || {};
      const role = (userDetails.role || "").toLowerCase();
      const app = (userDetails.app || "").toLowerCase();
      let access = userDetails.access || [];
      if (typeof access === "string") access = access ? [access] : [];

      // ✅ Role validation
      if (!VALID_ROLES.includes(role)) {
        redirectToLogin(`Access denied: Invalid role '${role}'.`);
        return;
      }

      // ✅ App validation (non-admin only)
      if (role !== "admin") {
        const validApps = Object.values(VALID_APPS);
        if (!validApps.includes(app)) {
          redirectToLogin(`Access denied: Invalid app '${app}'.`);
          return;
        }

        // ✅ App-specific access validation
        if (app === "main") {
          if (!access.every((a) => Object.keys(VALID_ACCESS).includes(a))) {
            redirectToLogin(`Invalid access for main app: ${access.join(", ")}`);
            return;
          }
        } else if (app === "operations") {
          const VALID_OPERATIONS_ACCESS = [
            "writer",
            "proofreader",
            "formatter",
            "cover_designer",
          ];
          if (!(access.length === 1 && VALID_OPERATIONS_ACCESS.includes(access[0]))) {
            redirectToLogin(`Invalid access for operations app: ${access.join(", ")}`);
            return;
          }
        } else if (app === "ijisem") {
          if (!(access.length === 1 && access[0] === "Full Access")) {
            redirectToLogin(`Invalid access for IJISEM app: ${access.join(", ")}`);
            return;
          }
        }
      }

      // ✅ Token is valid → set user
      setUser({
        id: data.user_id,
        ...userDetails,
      });
      setIsValidating(false);
      setProfileImage(userDetails.profile_image || null);

    } catch (err) {
      console.error("Token validation failed:", err);
      redirectToLogin("Access denied: Token validation failed.");
    }
  };

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  const storedToken = localStorage.getItem("token");
  const urlSessionId = params.get("session_id");
  const storedSession = localStorage.getItem("session_id");
  const urlclickId = params.get("click_id");
  const storedclick = localStorage.getItem("click_id");
  const activeToken = urlToken || storedToken;


  fetch(`${API_URL}/log_navigation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${storedToken}`
    },
    body: JSON.stringify({
      click_id: storedclick,
      page: "AGPH Connect",
      session_id: storedSession
    })
  });

  if (!activeToken) {
    redirectToLogin("Access denied: No token provided.");
    return;
  }

  if (urlToken) {
    localStorage.setItem("token", urlToken);
    setToken(urlToken);
    localStorage.setItem("session_id", urlSessionId);
    setSessionId(urlSessionId);
    localStorage.setItem("click_id", urlclickId);
    setClickId(urlclickId);
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    setToken(storedToken);
  }

  if (checkTokenExpiry(activeToken)) {
      return;
    }

    // ✅ Validate the token
    validateToken(activeToken);

  // ✅ Tell React we intentionally ignore dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);



  // ✅ Loading state
  if (isValidating) {
  return (
    <div className="flex items-center justify-center h-screen relative">
      {popupMsg && (
        <div className="fixed inset-0 bg-[#515151] bg-opacity-0 z-40 transition-opacity"></div>
      )}

      {popupMsg && (
        <div className="fixed top-36 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                        bg-white p-6 rounded-xl z-50 flex flex-col space-y-4 min-w-120">
          <h2 className="text-gray-800 text-2xl font-semibold">Authentication Failed</h2>
          <h2 className="text-red-600 bg-red-50 px-10 pl-4 py-3 rounded-lg text-[16px] my-3 text-left">
            {popupMsg}
          </h2>
          <button
            onClick={() => (window.location.href = FLASK_LOGIN_URL)}
            className="text-left text-gray-700 mt-4 rounded-md transition"
          >
            Login <FontAwesomeIcon icon={faArrowRightFromBracket} />
          </button>
        </div>
      )}

      <h2 className="text-gray-600 text-xl font-semibold">
        Validating your session...
      </h2>
    </div>
  );
}

const handleSelectConversation = (conv) => {
  if (!conv) { setSelectedConv(null); setScrollToMessageId(null); return; }
  const { _scrollToMessageId, ...cleanConv } = conv;
  setSelectedConv(cleanConv);
  setScrollToMessageId(_scrollToMessageId || null);
};



  return (
    <div className="flex">

  <Slidebar
    user={user}
    token={token}
    profileImage={profileImage} onProfileImageChange={setProfileImage}
  />
  
  <HomePageUsers
    token={token}
    onSelectConversation={handleSelectConversation}
    user={user}
    lastMessageUpdate={lastMessageUpdate}
    profileImage={profileImage}       // ← new
  />

  {/* ✅ Conditional render for chat type */}
  {selectedConv ? (
    selectedConv.isGroup ? (
      <HomePageGroupMsg
        token={token}
        conversation={selectedConv}
        user={user}
        onNewMessage={(data) => setLastMessageUpdate(data)}
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={() => setScrollToMessageId(null)}
      />
    ) : (
      <HomePageMsg
        token={token}
        conversation={selectedConv}
        user={user}
        onNewMessage={(data) => setLastMessageUpdate(data)}
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={() => setScrollToMessageId(null)}
      />
    )
  ) : (
    // Optional: show a placeholder when no chat is selected
    <div className="flex flex-col w-full items-center justify-center text-gray-500 text-center h-full my-auto py-auto">
        <p className="text-lg font-semibold">No conversation selected</p>
        <p className="text-sm text-gray-400">
          Select a user from the left to start chatting 💬
        </p>
      </div>
  )}
</div>
  );
};

export default HomePage;