import React, { useEffect, useRef, useState } from "react";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import {
  FaBell,
  FaMoon,
  FaSun,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";
import { IoClose, IoMenu, IoSearch } from "react-icons/io5";
import logo from "../../assets/images/logo.png";
import { useTheme } from "../../context/ThemeContext";
import { useDispatch, useSelector } from "react-redux";
import { removeUser } from "../../redux/slices/userSlice"; // Import removeUser
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../https";

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  const isDarkMode =
    theme === "dark" ||
    (theme === "light" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const userData = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: () => logout(), // Use the logout function instead
    onSuccess: (data) => {
      console.log(data);
      dispatch(removeUser());
      navigate("/auth");
    },
    onError: (error) => {
      console.log(error);
    },
  });

  // Handle logout
  const handleLogout = () => {
    if (!userData.isAuth) {
      console.log("User is not authenticated.");
      return;
    }
    logoutMutation.mutate();
  };

  // All existing useEffect hooks remain the same
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (isSearchExpanded) setIsSearchExpanded(false);
        if (isMenuOpen) setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSearchExpanded, isMenuOpen]);

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
  };

  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    if (newMenuState && isSearchExpanded) {
      setIsSearchExpanded(false);
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
        <div onClick={() => navigate("/")} className="logo flex items-center gap-2 cursor-pointer">
          <img src={logo} className="h-8 w-8" alt="RestOS logo" />
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
              <button onClick={()=> navigate("/dashboard")}
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
            >
              <FaBell
                className="text-xl text-[var(--text-color)]"
                aria-hidden="true"
              />
              <span className="text-[var(--text-color)]">Notifications</span>
            </button>

            {/* Added Logout Button to Mobile Menu */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-lg bg-[var(--menu-item-bg)] hover:bg-[var(--menu-item-bg-hover)]"
              aria-label="Logout"
            >
              <FaSignOutAlt
                onClick={handleLogout}
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
        <div onClick={() => navigate("/")} className="logo flex items-center gap-2 cursor-pointer">
          <img src={logo} className="h-8 w-8" alt="RestOS logo" />
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
            <button onClick={()=> navigate("/dashboard")}
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
            className="bell flex items-center justify-center bg-[var(--card-bg)] text-[var(--text-color)] rounded-full h-10 w-10 cursor-pointer"
            aria-label="Notifications"
          >
            <FaBell
              className="text-2xl text-[var(--text-color)]"
              aria-hidden="true"
            />
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
          {/* Added Logout Button to Desktop Header */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center bg-[var(--card-bg)] text-[var(--text-color)] rounded-full h-10 w-10 cursor-pointer hover:bg-[var(--menu-item-bg-hover)] transition-colors"
            aria-label="Logout"
          >
            <FaSignOutAlt onClick={handleLogout} className="text-xl" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
