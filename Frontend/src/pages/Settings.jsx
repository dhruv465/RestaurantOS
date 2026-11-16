import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FaCog, FaHistory, FaPlusCircle, FaUsers } from "react-icons/fa";
import GeneralSettings from "../components/settings/GeneralSettings";
import StaffSettings from "../components/settings/StaffSettings";
import AuditLog from "../components/settings/AuditLog";
import ModifierSettings from "../components/settings/ModifierSettings";
import BackButton from "../components/ui/BackButton";
import { can } from "../utils";

const Settings = () => {
  const user = useSelector((state) => state.user);
  const tabs = [
    { key: "general", label: "General", icon: FaCog, show: true },
    { key: "addons", label: "Add-ons", icon: FaPlusCircle, show: can(user, "menu.manage") },
    { key: "staff", label: "Staff", icon: FaUsers, show: can(user, "staff.manage") },
    { key: "audit", label: "Audit log", icon: FaHistory, show: can(user, "audit.view") },
  ].filter((t) => t.show);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    document.title = "RestOS | Settings";
  }, []);

  return (
    <div className="bg-[var(--main-bg)] px-4 md:px-6 lg:px-8">
      <div className="flex items-center gap-4 py-4">
        <BackButton />
        <h1 className="text-lg sm:text-xl md:text-2xl text-[var(--text-color)] tracking-wider font-bold">
          Settings
        </h1>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 w-full md:w-fit p-1 bg-[var(--card-bg)] rounded-lg">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center justify-center py-2 px-4 rounded-md transition-all ${
              activeTab === key
                ? "bg-[var(--nav-bg)] shadow-sm text-[var(--text-color)]"
                : "text-[#ababab] hover:text-[var(--text-color)]"
            }`}
          >
            <Icon className="h-4 w-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "general" && <GeneralSettings canEdit={can(user, "settings.manage")} />}
      {activeTab === "addons" && <ModifierSettings />}
      {activeTab === "staff" && <StaffSettings />}
      {activeTab === "audit" && <AuditLog />}
    </div>
  );
};

export default Settings;
