import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    // Only apply text and border colors based on theme
    // Set text and border colors
    document.documentElement.style.setProperty(
      '--text-color',
      theme === 'light' ? '#1a1a1a' : '#f3f4f6'
    );
    document.documentElement.style.setProperty(
      '--border-color', 
      theme === 'light' ? '#e5e7eb' : '#374151'
    );
    
    // Set background colors for light theme
    if (theme === 'light') {
      document.documentElement.style.setProperty('--header-bg', '#f8fafc');
      document.documentElement.style.setProperty('--main-bg', '#ffffff');
      document.documentElement.style.setProperty('--nav-bg', '#f1f5f9');
      document.documentElement.style.setProperty('--card-bg', '#f8fafc');
    } else {
      // Reset to original dark mode colors
      document.documentElement.style.setProperty('--header-bg', '#1a1a1a');
      document.documentElement.style.setProperty('--main-bg', '#1f1f1f');
      document.documentElement.style.setProperty('--nav-bg', '#262626');
      document.documentElement.style.setProperty('--card-bg', '#1a1a1a');
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
