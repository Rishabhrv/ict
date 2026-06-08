import React from "react";
import { X, UserCircle, Search, Activity } from "lucide-react";

const NewFeatureInfo = ({ isOpen, onClose, user, token }) => {
  if (!isOpen) return null;

  const API_URL = process.env.REACT_APP_API_URL;
  const popup_id = 5;

  const saveFeatureInfo = async () => {
    try {
      await fetch(`${API_URL}/save_feature_info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          popup_id: popup_id,
        }),
      });
    } catch (err) {
      console.error("Failed to save feature popup:", err);
    }
  };

  const features = [
    {
      icon: <UserCircle className="w-6 h-6 text-[#f47f7f]" />,
      title: "Custom Avatars",
      desc: "Personalize your identity! Upload your own custom profile image or choose from our presets."
    },
    {
      icon: <Search className="w-6 h-6 text-[#f47f7f]" />,
      title: "Message Search",
      desc: "Find what you need instantly. You can now search through message history within any conversation."
    },
    {
      icon: <Activity className="w-6 h-6 text-[#f47f7f]" />,
      title: "Online & Last Seen",
      desc: "Stay connected. Easily check if your colleagues are online or when they were last active."
    }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-[420px] rounded-[24px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#b8b0a8] hover:text-[#f47f7f] cursor-pointer transition-colors"
        >
          <X size={22} />
        </button>

        <div className="text-center mb-8">
          <div className="w-[60px] h-[60px] mx-auto bg-[#fff1f1] flex items-center justify-center rounded-[20px] mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-[22px] font-bold font-['Outfit',sans-serif] text-[#181818] tracking-[-0.5px]">
            New Feature Update
          </h2>
          <p className="text-[14px] text-[#9a9290] mt-2 font-medium">
            We've upgraded your experience with these new tools.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {features.map((f, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="w-[48px] h-[48px] bg-[#f6f2ee] rounded-[16px] flex items-center justify-center shrink-0">
                {f.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-[14px] font-bold text-[#181818] font-['Outfit',sans-serif]">{f.title}</h4>
                <p className="text-[12.5px] text-[#7a7068] mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            saveFeatureInfo();
            onClose();
          }}
          className="w-full cursor-pointer bg-gradient-to-r from-[#f47f7f] to-[#d95f5f] hover:opacity-90 text-white py-[12px] rounded-[14px] font-bold text-[14px] transition-all shadow-[0_6px_18px_rgba(243,124,124,0.30)]"
        >
          Explore Now
        </button>
      </div>
    </div>
  );
};

export default NewFeatureInfo;