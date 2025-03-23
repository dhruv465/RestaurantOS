import React, { useState } from "react";
import { FaGlobe, FaUser } from "react-icons/fa";
import { MdPalette } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import AppearanceSettings from "../components/settings/AppearanceSettings";
import IntegrationSettings from "../components/settings/IntegrationSettings";
import ProfileSettings from "../components/settings/ProfileSettings";
import BackButton from "../components/ui/BackButton";
import BottomNav from "../components/ui/BottomNav";

const Settings = () => {
  const saveSettings = () => {
    // Implement save logic here
    console.log("Settings saved:", {
      restaurantName,
      description,
      contactNumber,
      address,
      theme,
      displayMode,
      showImages,
      enableAnimations,
      compactView,
    });
  };

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [logoPreview, setLogoPreview] = useState(null);
  const [theme, setTheme] = useState("Default");
  const [displayMode, setDisplayMode] = useState("light");

  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [description, setDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");

  // Toggle states
  const [showImages, setShowImages] = useState(true);
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [compactView, setCompactView] = useState(false);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateInputs = () => {
    if (!restaurantName || !contactNumber || !address) {
      alert("Please fill in all required fields.");
      return false;
    }
    return true;
  };

  return (
    <div className="bg-[var(--main-bg)] min-h-screen pb-20 overflow-auto flex flex-col md:flex-row gap-3 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="w-full md:flex-[3]">
        <div className="flex flex-col md:flex-row items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
              Settings
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full">
          <div className="grid grid-cols-3 mb-10 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                activeTab === "profile"
                  ? "bg-[var(--nav-bg)] shadow-sm text-[var(--text-color)]"
                  : "text-[#ababab] hover:text-[var(--text-color)]"
              }`}
            >
              <FaUser className="h-4 w-4 mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                activeTab === "appearance"
                  ? "bg-[var(--nav-bg)] shadow-sm text-[var(--text-color)]"
                  : "text-[#ababab] hover:text-[var(--text-color)]"
              }`}
            >
              <MdPalette className="h-4 w-4 mr-2" />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab("integrations")}
              className={`flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                activeTab === "integrations"
                  ? "bg-[var(--nav-bg)] shadow-sm text-[var(--text-color)]"
                  : "text-[#ababab] hover:text-[var(--text-color)]"
              }`}
            >
              <FaGlobe className="h-4 w-4 mr-2" />
              Integrations
            </button>
          </div>

          {activeTab === "profile" && (
            <ProfileSettings
              restaurantName={restaurantName}
              setRestaurantName={setRestaurantName}
              description={description}
              setDescription={setDescription}
              contactNumber={contactNumber}
              setContactNumber={setContactNumber}
              address={address}
              setAddress={setAddress}
              logoPreview={logoPreview}
              setLogoPreview={setLogoPreview}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceSettings
              theme={theme}
              setTheme={setTheme}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              showImages={showImages}
              setShowImages={setShowImages}
              enableAnimations={enableAnimations}
              setEnableAnimations={setEnableAnimations}
              compactView={compactView}
              setCompactView={setCompactView}
            />
          )}

          {activeTab === "integrations" && <IntegrationSettings />}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                if (validateInputs()) {
                  saveSettings();
                }
              }}
              className="bg-[#F6b100] text-white rounded-lg px-6 py-3 hover:bg-[#F6b100]/90 transition-colors duration-200 shadow-md"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <BottomNav />
      </div>
    </div>
  );
};

export default Settings;
