import React from "react";
import { MdPalette } from "react-icons/md";

const AppearanceSettings = ({
  theme,
  setTheme,
  displayMode,
  setDisplayMode,
  showImages,
  setShowImages,
  enableAnimations,
  setEnableAnimations,
  compactView,
  setCompactView,
}) => {
  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-semibold text-[var(--text-color)]">
            Theme Settings
          </h2>
          <p className="text-sm text-[#ababab]">
            Customize the appearance of your restaurant app
          </p>
        </div>
        <div className="p-6 space-y-8">
          <div className="space-y-6">
            <div>
              <label className="text-base font-medium text-[var(--text-color)]">
                App Color Theme
              </label>
              <p className="text-sm text-[#ababab] mb-4">
                Choose a primary color that will be used throughout your entire
                app
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { name: "Default", color: "bg-blue-600" },
                  { name: "Ruby", color: "bg-red-600" },
                  { name: "Emerald", color: "bg-emerald-600" },
                  { name: "Amber", color: "bg-amber-500" },
                  { name: "Violet", color: "bg-violet-600" },
                  { name: "Rose", color: "bg-rose-500" },
                  { name: "Slate", color: "bg-slate-700" },
                  {
                    name: "Custom",
                    color:
                      "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500",
                  },
                ].map((themeOption) => (
                  <div
                    key={themeOption.name}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={`w-full aspect-square rounded-xl ${
                        themeOption.color
                      } flex items-center justify-center cursor-pointer transition-all hover:scale-105 shadow-md border-2 ${
                        theme === themeOption.name
                          ? "border-[var(--text-color)]"
                          : "border-transparent"
                      }`}
                      onClick={() => handleThemeChange(themeOption.name)}
                    >
                      <MdPalette className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-sm font-medium text-[var(--text-color)]">
                      {themeOption.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-[var(--border-color)] w-full my-6"></div>

            <div className="space-y-4">
              <label className="text-base font-medium text-[var(--text-color)]">
                Display Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    value: "light",
                    label: "Light Mode",
                    description: "Clean, bright interface",
                  },
                  {
                    value: "dark",
                    label: "Dark Mode",
                    description: "Easier on the eyes at night",
                  },
                  {
                    value: "system",
                    label: "System Default",
                    description: "Follow device settings",
                  },
                ].map((mode) => (
                  <div key={mode.value} className="relative">
                    <div
                      className={`border border-[var(--border-color)] rounded-lg p-4 cursor-pointer hover:border-[#F6b100] transition-colors ${
                        displayMode === mode.value ? "border-[#F6b100]" : ""
                      }`}
                      onClick={() => setDisplayMode(mode.value)}
                    >
                      <div className="absolute right-4 top-4">
                        <div
                          className={`w-4 h-4 rounded-full border border-[var(--border-color)] flex items-center justify-center ${
                            displayMode === mode.value ? "border-[#F6b100]" : ""
                          }`}
                        >
                          {displayMode === mode.value && (
                            <div className="w-2 h-2 rounded-full bg-[#F6b100]"></div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`${mode.value}-mode`}
                          className="font-medium text-[var(--text-color)]"
                        >
                          {mode.label}
                        </label>
                        <p className="text-sm text-[#ababab]">
                          {mode.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-[var(--border-color)] w-full my-6"></div>

            <div className="space-y-4">
              <label className="text-base font-medium text-[var(--text-color)]">
                Display Options
              </label>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="show-images"
                      className="font-medium text-[var(--text-color)]"
                    >
                      Show Food Images
                    </label>
                    <p className="text-sm text-[#ababab]">
                      Display food images in the menu
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      showImages ? "bg-[#F6b100]" : "bg-[var(--main-bg)]"
                    }`}
                    onClick={() => setShowImages(!showImages)}
                  >
                    <div
                      className={`bg-white h-4 w-4 rounded-full shadow-md transform transition-transform ${
                        showImages ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="animations"
                      className="font-medium text-[var(--text-color)]"
                    >
                      Enable Animations
                    </label>
                    <p className="text-sm text-[#ababab]">
                      Show smooth transitions between screens
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      enableAnimations ? "bg-[#F6b100]" : "bg-[var(--main-bg)]"
                    }`}
                    onClick={() => setEnableAnimations(!enableAnimations)}
                  >
                    <div
                      className={`bg-white h-4 w-4 rounded-full shadow-md transform transition-transform ${
                        enableAnimations ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-lg">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="compact-view"
                      className="font-medium text-[var(--text-color)]"
                    >
                      Compact View
                    </label>
                    <p className="text-sm text-[#ababab]">
                      Show more items on screen with less spacing
                    </p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                      compactView ? "bg-[#F6b100]" : "bg-[var(--main-bg)]"
                    }`}
                    onClick={() => setCompactView(!compactView)}
                  >
                    <div
                      className={`bg-white h-4 w-4 rounded-full shadow-md transform transition-transform ${
                        compactView ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
