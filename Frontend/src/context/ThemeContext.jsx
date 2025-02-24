import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    // Set text and border colors based on theme
    // Set text and border colors
    document.documentElement.style.setProperty(
      "--text-color",
      theme === "light" ? "#1a1a1a" : "#f3f4f6"
    );
    document.documentElement.style.setProperty(
      "--border-color",
      theme === "light" ? "#e5e7eb" : "#374151"
    );

    // Set background colors for light theme
    if (theme === "light") {
      document.documentElement.style.setProperty("--header-bg", "#e0e0e0");
      document.documentElement.style.setProperty("--main-bg", "#f0f0f0");
      document.documentElement.style.setProperty("--nav-bg", "#f1f5f9");
      document.documentElement.style.setProperty("--card-bg", "#f8fafc");
    } else {
      // Reset to original dark mode colors
      document.documentElement.style.setProperty("--header-bg", "#1a1a1a");
      document.documentElement.style.setProperty("--main-bg", "#1f1f1f");
      document.documentElement.style.setProperty("--nav-bg", "#262626");
      document.documentElement.style.setProperty("--card-bg", "#1a1a1a");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to access theme context
const useTheme = () => useContext(ThemeContext);

export { useTheme };
