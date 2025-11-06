// src/components/Slidebar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouseChimney,faPlus } from "@fortawesome/free-solid-svg-icons";
import Logo from "./Images/logo.png";
import AddMemberSlider from "../components/AddMemberSlider";

const Slidebar = ({ user,token }) => {
   const [isSliderOpen, setIsSliderOpen] = useState(false);
  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : "JD";
    const API_URL = process.env.REACT_APP_API_URL;

  return (
    <div className="w-25 bgcolor flex flex-col items-center py-4 space-y-3 h-screen rounded-r-2xl shadow-md">
      {/* --- Logo / Top Icon --- */}
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-bgcolor text-xl">
        <img src={Logo} alt="Logo" className="p-1" />
      </div>

      {/* --- Main Nav Buttons --- */}
      <div className="flex-1 flex flex-col items-center space-y-4 mt-4">
        <Link
          to={`/chat`}
          className="w-12 h-12 bgcolor-100 rounded-xl flex items-center justify-center hover:bgcolor transition-colors"
        >
          <FontAwesomeIcon icon={faHouseChimney} className="text-white text-lg" />
        </Link>

        <div
          onClick={() => setIsSliderOpen(true)}
          className="w-12 h-12 bgcolor-100 rounded-xl flex items-center justify-center hover:bgcolor transition-colors cursor-pointer"
        >
          <FontAwesomeIcon icon={faPlus} className="text-white"/>
        </div>
        
      </div>
      

      {/* --- Bottom User Icon --- */}
      <div className="w-12 h-12 rounded-full bgcolor-500 flex items-center justify-center text-white font-semibold">
        {userInitials}
      </div>

      {/* 🔹 Slider Component */}
        <AddMemberSlider
          isOpen={isSliderOpen}
          onClose={() => setIsSliderOpen(false)}
          token={token}
          API_URL={API_URL}
          onAddMembers={(selected) => {
            console.log("Selected members:", selected);
            // 🔹 You can now send these to your backend to create a group
          }}
        />
    </div>
  );
};

export default Slidebar;
