// src/components/Slidebar.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react"; 
import AddMemberSlider from "../components/AddMemberSlider";
import NewFeatureInfo from "../components/NewFeatureInfo";
import Logo from "./Images/AGPH-black-logo.png";

// ✅ 1. Import all preset images so React processes them
import profile1 from "./Images/Profile/profile1.jpg";
import profile2 from "./Images/Profile/profile2.jpg";
import profile3 from "./Images/Profile/profile3.jpg";
import profile4 from "./Images/Profile/profile4.jpg";
import profile5 from "./Images/Profile/profile5.jpg";
import profile6 from "./Images/Profile/profile6.jpg";
import profile7 from "./Images/Profile/profile7.jpg";
import profile8 from "./Images/Profile/profile8.jpg";
import profile9 from "./Images/Profile/profile9.jpg";
import profile10 from "./Images/Profile/profile10.jpg";
import profile11 from "./Images/Profile/profile11.jpg";
import profile12 from "./Images/Profile/profile12.jpg";
import profile13 from "./Images/Profile/profile13.jpg";
import profile14 from "./Images/Profile/profile14.jpg";
import profile15 from "./Images/Profile/profile15.jpg";
import profile16 from "./Images/Profile/profile16.jpg";
import profile17 from "./Images/Profile/profile17.jpg";
import profile18 from "./Images/Profile/profile18.jpg";
import profile19 from "./Images/Profile/profile19.jpg";
import profile20 from "./Images/Profile/profile20.jpg";

// ✅ 2. Use the imported variables in your array (No quotes!)
const PRESET_AVATARS = [
  profile1,
  profile2,
  profile3,
  profile4,
  profile5,
  profile6,
  profile7,
  profile8,
  profile9,
  profile10,
  profile11,
  profile12,
  profile13,
  profile14,
  profile15,
  profile16,
  profile17,
  profile18,
  profile19,
  profile20
];

const Slidebar = ({ user, token }) => {

  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showFeaturePopup, setShowFeaturePopup] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false); 
  
  // Image Upload States
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);
  const [isUploading, setIsUploading] = useState(false);

  const popup_id = 5;
  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : "SH";
  const API_URL = process.env.REACT_APP_API_URL;
  const [popupChecked, setPopupChecked] = useState(false);

  // Sync state if user prop updates later on re-fetches
  useEffect(() => {
    if (user?.profile_image) setProfileImage(user.profile_image);
  }, [user?.profile_image]);

  useEffect(() => {
    const checkPopupStatus = async () => {
      try {
        const res = await fetch(
          `${API_URL}/check_feature_info?user_id=${user.id}&popup_id=${popup_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!data.exists) setShowFeaturePopup(true);
        setPopupChecked(true);
      } catch (err) {
        console.error("Popup check failed:", err);
        setPopupChecked(true);
      }
    };
    if (user.id) checkPopupStatus();
  }, [user.id, API_URL, token]);

  // ✅ 2. Handle PRESET image selection
  const handlePresetSelection = async (avatarUrl) => {
    setIsUploading(true);
    try {
      const res = await fetch(`${API_URL}/set_preset_avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: avatarUrl })
      });
      const data = await res.json();
      if (data.success) {
        setProfileImage(data.profile_image);
      } else {
        alert(data.error || "Failed to update avatar");
      }
    } catch (err) {
      console.error("Error setting preset avatar:", err);
      alert("Failed to update avatar.");
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ 3. Handle CUSTOM FILE upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload_profile_image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfileImage(data.profile_image); 
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
      e.target.value = ""; 
    }
  };

  return (
    <div className="w-16 min-w-16 bg-white border-r border-[#ece7e0] flex flex-col items-center pt-[14px] pb-[18px] gap-[6px] h-screen z-20 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* TOP LOGO */}
      <div className="w-[45px] h-[45px] rounded-[13px] bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] flex items-center justify-center mb-[14px] shrink-0 shadow-[0_6px_18px_rgba(243,124,124,0.30),0_2px_4px_rgba(200,80,80,0.12)]">
        <img src={Logo} alt="Logo" className="p-1" />
      </div>

      {/* MAIN NAVIGATION */}
      <div className="flex-1 flex flex-col items-center gap-2 w-full">
        <Link to={`/`} className="group relative w-[40px] h-[40px] rounded-[12px] flex items-center justify-center transition-all duration-150 bg-[#fff1f1] text-[#f47f7f] shadow-[inset_0_0_0_1.5px_rgba(243,124,124,0.18)]">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
          <span className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 scale-90 bg-[#1a1a1a] text-white text-[11px] font-medium tracking-[0.2px] py-1 px-[9px] rounded-[6px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-50">
            Home
          </span>
        </Link>

        
        <button onClick={() => setIsSliderOpen(true)} className="group relative w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-transparent text-[#d0b0b0] transition-all duration-150 hover:bg-[#fff1f1] hover:text-[#f47f7f]">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#f47f7f"><path d="M500-482q29-32 44.5-73t15.5-85q0-44-15.5-85T500-798q60 8 100 53t40 105q0 60-40 105t-100 53Zm220 322v-120q0-36-16-68.5T662-406q51 18 94.5 46.5T800-280v120h-80Zm80-280v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Zm-593-87q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM0-160v-112q0-34 17.5-62.5T64-378q62-31 126-46.5T320-440q66 0 130 15.5T576-378q29 15 46.5 43.5T640-272v112H0Zm320-400q33 0 56.5-23.5T400-640q0-33-23.5-56.5T320-720q-33 0-56.5 23.5T240-640q0 33 23.5 56.5T320-560ZM80-240h480v-32q0-11-5.5-20T540-306q-54-27-109-40.5T320-360q-56 0-111 13.5T100-306q-9 5-14.5 14T80-272v32Zm240-400Zm0 400Z"/></svg>
          <span className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 scale-90 bg-[#1a1a1a] text-white text-[11px] font-medium tracking-[0.2px] py-1 px-[9px] rounded-[6px] whitespace-nowrap opacity-0 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-50">
            New Group
          </span>
        </button>
      </div>

     {/* ── BOTTOM USER AVATAR ── */}
<div 
  onClick={() => setShowProfilePopup(true)} 
  /* ADDED shadow-wave-effect HERE */
  className={`w-[37px] h-[37px] rounded-full bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] flex items-center justify-center text-white text-[11px] font-bold border-[2.5px] border-[#ffdede] shadow-[0_3px_10px_rgba(243,124,124,0.30)] tracking-[0.5px] font-['Outfit',sans-serif] shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200 overflow-hidden ${!profileImage ? 'shadow-wave-effect' : ''}`}
>
  {profileImage ? (
    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
  ) : (
    <span className="animate-intense-blink font-bold text-white">{userInitials}</span>
  )}
</div>

      <AddMemberSlider isOpen={isSliderOpen} onClose={() => setIsSliderOpen(false)} token={token} user={user} API_URL={API_URL} onAddMembers={(selected) => console.log("Selected members:", selected)} />
      
      {popupChecked && <NewFeatureInfo isOpen={showFeaturePopup} onClose={() => setShowFeaturePopup(false)} user={user} token={token} />}

      {/* ✅ User Profile Popup Modal */}
      {showProfilePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="bg-white w-[340px] rounded-[20px] p-7 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <button 
              onClick={() => setShowProfilePopup(false)} 
              className="absolute top-4 right-4 text-[#b8b0a8] hover:text-[#f47f7f] cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6 mt-2">
              <div className="w-[85px] h-[85px] mx-auto rounded-[24px] bg-gradient-to-br from-[#f47f7f] to-[#d95f5f] flex items-center justify-center text-white text-[28px] font-bold mb-4 shadow-[0_6px_18px_rgba(243,124,124,0.35)] font-['Outfit',sans-serif] overflow-hidden relative">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}
              </div>
              <h3 className="text-[20px] font-bold font-['Outfit',sans-serif] text-[#181818] tracking-[-0.5px]">
                {user?.username || "User"}
              </h3>
              <p className="text-[13px] text-[#9a9290] mt-1 font-medium">
                {user?.email || "No email available"}
              </p>
            </div>

            <div className="mt-6 border-t border-[#ece7e0] pt-5">
              <label className="block text-[10.5px] font-bold text-[#b8b0a8] uppercase tracking-[0.08em] mb-4 text-center">
                Select an Avatar
              </label>
              
             <div className="grid grid-cols-5 gap-3 mb-4 w-fit mx-auto">
                {PRESET_AVATARS.map((avatar, idx) => (
                  <img 
                    key={idx}
                    src={avatar}
                    alt={`preset-${idx}`}
                    onClick={() => !isUploading && handlePresetSelection(avatar)}
                    className={`w-10 h-10 rounded-full cursor-pointer hover:scale-110 hover:shadow-md transition-all border-2 border-transparent hover:border-[#f47f7f] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                ))}
              </div>

              <div className="flex justify-center items-center gap-3 my-3 opacity-60">
                <div className="h-[1px] w-12 bg-gray-300"></div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Or</span>
                <div className="h-[1px] w-12 bg-gray-300"></div>
              </div>
              
              {/* ✅ CUSTOM UPLOAD */}
              <div className="flex justify-center mt-3">
                <label className={`cursor-pointer transition-opacity ${isUploading ? 'opacity-50' : 'opacity-100'}`}>
                  <span className="bg-[#f6f2ee] text-[#7a7068] hover:bg-[#fff1f1] hover:text-[#f47f7f] py-[8px] px-[16px] rounded-[10px] text-[12.5px] font-medium transition-colors inline-block text-center w-[160px]">
                    {isUploading ? "Uploading..." : "Upload Custom File"}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Slidebar;