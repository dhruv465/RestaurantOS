import React, { useEffect, useRef, useState } from "react";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { FaKitchenSet } from "react-icons/fa6";
import {
  FaBell,
  FaMoon,
  FaSun,
  FaUserCircle,
  FaSignOutAlt,
  FaDownload,
} from "react-icons/fa";
import { IoClose, IoMenu, IoSearch } from "react-icons/io5";
import { useTheme } from "../../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { removeUser } from "../../redux/slices/userSlice";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("General");
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  const isDarkMode =
    theme === "dark" ||
    (theme === "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Sample notification data - in a real app, this would come from your backend
  const notificationData = {
    General: [
      {
        id: 1,
        user: "Caitlyn",
        avatar: "https://i.pravatar.cc/150?img=1",
        action: "shared two files in",
        project: "ConnectBank",
        time: "2 hours ago",
        department: "Design",
        files: [
          { name: "Sign up idea 01.jpg", size: "240 KB" }
        ]
      },
      {
        id: 2,
        user: "Zaid",
        avatar: "https://i.pravatar.cc/150?img=2",
        action: "commented in",
        project: "ConnectBank",
        time: "2 hours ago",
        department: "Engineering",
        comment: "Finished up the first crack at the new dashboard! Looks really great. Let me know how it goes."
      },
      {
        id: 3,
        user: "Marco",
        avatar: "https://i.pravatar.cc/150?img=3",
        action: "requested access to",
        project: "Surface X",
        time: "6 hours ago",
        department: "Design",
        requiresAction: true
      }
    ],
    Mentions: [],
    Inbox: [],
    Archive: []
  };

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: (data) => {
      console.log(data);
      dispatch(removeUser());
      setIsMenuOpen(false);
      navigate("/auth");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  const handleLogout = () => {
    if (!userData.isAuth) {
      console.log("User is not authenticated.");
      return;
    }
    logoutMutation.mutate();
  };

  const handleNavigation = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target) &&
        !event.target.closest('button[aria-label="Notifications"]')
      ) {
        setShowNotifications(false);
      }
    };

    if (isMenuOpen || showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, showNotifications]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (isSearchExpanded) setIsSearchExpanded(false);
        if (isMenuOpen) setIsMenuOpen(false);
        if (showNotifications) setShowNotifications(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSearchExpanded, isMenuOpen, showNotifications]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 834) {
        setIsSearchExpanded(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    if (isSearchExpanded) {
      setIsSearchExpanded(false);
    }
  };

  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    if (newMenuState && isSearchExpanded) {
      setIsSearchExpanded(false);
    }
    if (newMenuState && showNotifications) {
      setShowNotifications(false);
    }

    if (newMenuState) {
      setTimeout(() => menuRef.current?.focus(), 100);
    }
  };

  const toggleSearch = () => {
    const newSearchState = !isSearchExpanded;
    setIsSearchExpanded(newSearchState);

    if (newSearchState && isMenuOpen) {
      setIsMenuOpen(false);
    }
    if (newSearchState && showNotifications) {
      setShowNotifications(false);
    }

    if (newSearchState) {
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  };

  return (
    <header
      className="bg-[var(--header-bg)] border-b border-[var(--border-color)]"
      role="banner"
    >
      {/* Mobile Header (below 834px) */}
      <div className="md:hidden flex items-center justify-between p-4">
        <div
          onClick={() => handleNavigation("/")}
          className="logo flex items-center gap-2 cursor-pointer"
        >
          <FaKitchenSet
            className="h-8 w-8 text-[var(--text-color)]"
            aria-hidden="true"
          />
          <h1 className="text-xl font-semibold text-[var(--text-color)]">
            RestOS
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="p-1 text-[var(--text-color)]"
            onClick={toggleSearch}
            aria-expanded={isSearchExpanded}
            aria-label="Open search"
          >
            <IoSearch className="text-xl" />
          </button>

          <button
            className="p-1 text-[var(--text-color)] relative"
            onClick={toggleNotifications}
            aria-label="Notifications"
          >
            <FaBell className="text-xl" />
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-2 w-2"></span>
          </button>

          <button
            onClick={toggleMenu}
            className="p-1 text-[var(--text-color)]"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            <IoMenu className="text-2xl" />
          </button>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isSearchExpanded && (
        <div className="md:hidden fixed inset-0 bg-[var(--header-bg)] bg-opacity-95 z-50 flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[var(--text-color)]">
              Search
            </h2>
            <button
              onClick={toggleSearch}
              aria-label="Close search"
              className="p-1 text-[var(--text-color)]"
            >
              <IoClose className="text-2xl" />
            </button>
          </div>
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search for food, coffee, etc."
                className="w-full bg-[var(--card-bg)] text-[var(--text-color)] placeholder:text-[var(--text-color)]/50 rounded-lg px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-[var(--border-color)] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <IoSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-color)]/70 text-lg" />
            </div>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="md:hidden fixed inset-0 bg-[var(--header-bg)] z-40"
          tabIndex={0}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-[var(--text-color)]">
                Menu
              </h2>
              <button
                onClick={toggleMenu}
                aria-label="Close menu"
                className="p-1 text-[var(--text-color)]"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>

            {/* User Profile in Menu */}
            <div className="flex items-center gap-3 p-4 bg-[var(--menu-item-bg)] rounded-lg mb-6">
              <FaUserCircle aria-hidden="true" />
              <div className="text-[var(--text-color)]">
                <h3 className="text-md font-semibold">
                  {userData.name || "TEST USER"}
                </h3>
                <p className="text-xs text-[var(--text-color)]/70 font-medium">
                  {userData.role || "Role"}
                </p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-3 rounded-lg bg-[var(--menu-item-bg)] hover:bg-[var(--menu-item-bg-hover)]"
              aria-label={
                isDarkMode ? "Switch to light theme" : "Switch to dark theme"
              }
            >
              {isDarkMode ? (
                <FaSun
                  className="text-xl text-[var(--text-color)]"
                  aria-hidden="true"
                />
              ) : (
                <FaMoon
                  className="text-xl text-[var(--text-color)]"
                  aria-hidden="true"
                />
              )}
              <span className="text-[var(--text-color)]">
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            {userData.role === "Admin" && (
              <button
                onClick={() => handleNavigation("/dashboard")}
                className="flex items-center gap-3 w-full p-3 rounded-lg bg-[var(--menu-item-bg)] hover:bg-[var(--menu-item-bg-hover)]"
                aria-label="Dashboard"
              >
                <TbLayoutDashboardFilled
                  className="text-xl text-[var(--text-color)]"
                  aria-hidden="true"
                />
                <span className="text-[var(--text-color)]">Dashboard</span>
              </button>
            )}
            <button
              className="flex items-center gap-3 w-full p-3 rounded-lg bg-[var(--menu-item-bg)] hover:bg-[var(--menu-item-bg-hover)]"
              aria-label="Notifications"
              onClick={toggleNotifications}
            >
              <FaBell
                className="text-xl text-[var(--text-color)]"
                aria-hidden="true"
              />
              <span className="text-[var(--text-color)]">Notifications</span>
            </button>

            {/* Logout Button to Mobile Menu */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-lg bg-[var(--menu-item-bg)] hover:bg-[var(--menu-item-bg-hover)]"
              aria-label="Logout"
            >
              <FaSignOutAlt
                className="text-xl text-[var(--text-color)]"
                aria-hidden="true"
              />
              <span className="text-[var(--text-color)]">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Header (above 834px) */}
      <div className="hidden md:flex flex-col md:flex-row justify-between items-center py-2 px-4 sm:px-6 md:px-8 gap-4 md:gap-0">
        <div
          onClick={() => navigate("/")}
          className="logo flex items-center gap-2 cursor-pointer"
        >
          <FaKitchenSet
            className="h-8 w-8 text-[var(--text-color)]"
            alt="RestOS logo"
          />
          <h1 className="text-2xl font-bold text-[var(--text-color)]">
            RestOS
          </h1>
        </div>

        <form
          onSubmit={handleSearch}
          className="search flex items-center gap-4 bg-[var(--card-bg)] backdrop-blur-sm px-3 sm:px-4 md:px-5 py-2 w-full md:w-[400px] lg:w-[500px] rounded-lg border border-[var(--border-color)] shadow-sm"
        >
          <IoSearch
            className="text-xl text-[var(--text-color)]"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search for food, coffee, etc."
            className="bg-transparent outline-none text-[var(--text-color)] placeholder:text-[var(--text-color)]/50 text-sm w-full transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search"
          />
          <button type="submit" className="sr-only">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {userData.role === "Admin" && (
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center bg-[var(--card-bg)] text-[var(--text-color)] rounded-full h-10 w-10 cursor-pointer hover:bg-[var(--menu-item-bg-hover)] transition-colors"
              aria-label="Dashboard"
            >
              <TbLayoutDashboardFilled className="text-xl" />
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--card-bg)] transition-colors"
            aria-label={
              isDarkMode ? "Switch to light theme" : "Switch to dark theme"
            }
          >
            {isDarkMode ? (
              <FaSun
                className="text-xl text-[var(--text-color)]"
                aria-hidden="true"
              />
            ) : (
              <FaMoon
                className="text-xl text-[var(--text-color)]"
                aria-hidden="true"
              />
            )}
          </button>
          <button
            className="bell flex items-center justify-center bg-[var(--card-bg)] text-[var(--text-color)] rounded-full h-10 w-10 cursor-pointer relative"
            aria-label="Notifications"
            onClick={toggleNotifications}
          >
            <FaBell
              className="text-xl text-[var(--text-color)]"
              aria-hidden="true"
            />
            <span className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-2 w-2"></span>
          </button>
          <button
            className="profile flex items-center gap-2 cursor-pointer bg-[var(--card-bg)] p-3 rounded-lg"
            aria-label="User profile"
          >
            <FaUserCircle
              className="text-2xl text-[var(--text-color)]"
              aria-hidden="true"
            />
            <div className="text-[var(--text-color)] flex flex-col items-start">
              <h2 className="text-md font-semibold">
                {userData.name || "TEST USER"}
              </h2>
              <p className="text-xs text-[var(--text-color)]/70 font-medium">
                {userData.role || "Role"}
              </p>
            </div>
          </button>
          {/* Logout Button to Desktop Header */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center bg-[var(--card-bg)] text-[var(--text-color)] rounded-full h-10 w-10 cursor-pointer hover:bg-[var(--menu-item-bg-hover)] transition-colors"
            aria-label="Logout"
          >
            <FaSignOutAlt className="text-xl" />
          </button>
        </div>
      </div>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div
          ref={notificationRef}
          className="fixed right-0 mt-2 bg-[var(--header-bg)] border border-[var(--border-color)] rounded-lg shadow-lg z-50 w-full md:w-[400px] max-h-[80vh] overflow-y-auto"
          style={{ top: "60px", right: "20px" }}
        >
          <div className="p-4 border-b border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-[var(--text-color)]">
                Notifications
              </h2>
              <div className="flex items-center">
                <button
                  className="p-2 rounded-full hover:bg-[var(--card-bg)] transition-colors"
                  aria-label="User profile"
                >
                  <div className="flex items-center gap-2">
                    <FaUserCircle className="text-[var(--text-color)]" />
                    <span className="text-[var(--text-color)]">Sienna</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-[var(--border-color)]">
              {Object.keys(notificationData).map((tab) => (
                <button
                  key={tab}
                  className={`py-2 px-4 ${
                    activeTab === tab
                      ? "border-b-2 border-[var(--text-color)] text-[var(--text-color)]"
                      : "text-[var(--text-color)]/70"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Content */}
          <div className="p-4">
            {notificationData[activeTab].length === 0 ? (
              <div className="text-center py-8 text-[var(--text-color)]/70">
                No notifications
              </div>
            ) : (
              notificationData[activeTab].map((notification) => (
                <div
                  key={notification.id}
                  className="mb-4 pb-4 border-b border-[var(--border-color)] last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                      <img
                        src={notification.avatar}
                        alt={notification.user}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-semibold text-[var(--text-color)]">
                          {notification.user}
                        </span>
                        <span className="text-[var(--text-color)]/70">
                          {notification.action}
                        </span>
                        <span className="font-semibold text-[var(--text-color)]">
                          {notification.project}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-[var(--text-color)]/70 mb-2">
                        <span>{notification.time}</span>
                        <span className="mx-1">•</span>
                        <span>{notification.department}</span>
                      </div>
                      
                      {notification.files && (
                        <div className="bg-[var(--card-bg)] rounded-lg p-2 my-2">
                          {notification.files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-[var(--header-bg)] p-1 rounded">
                                  <img
                                    src="/api/placeholder/80/80"
                                    alt="File preview"
                                    className="w-10 h-10 object-cover rounded"
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-color)]">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-[var(--text-color)]/70">
                                    {file.size}
                                  </p>
                                </div>
                              </div>
                              <button
                                className="p-1 hover:bg-[var(--border-color)] rounded"
                                aria-label="Download"
                              >
                                <FaDownload className="text-[var(--text-color)]/70" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {notification.comment && (
                        <div className="bg-[var(--card-bg)] rounded-lg p-3 my-2 text-[var(--text-color)]">
                          {notification.comment}
                        </div>
                      )}
                      
                      {notification.requiresAction && (
                        <div className="flex gap-2 mt-2">
                          <button className="px-4 py-2 bg-[var(--card-bg)] text-[var(--text-color)] rounded hover:bg-[var(--menu-item-bg-hover)]">
                            Decline
                          </button>
                          <button className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">
                            Accept
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;