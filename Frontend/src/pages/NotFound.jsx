import { useTheme } from "../context/ThemeContext";
import { Link } from "react-router-dom";
import { LuMoveLeft } from "react-icons/lu";

import React, { useEffect } from "react";

const NotFound = () => {
  useEffect(() => {
    document.title = "RestOS | Not Found";
  }, []);
  const { theme } = useTheme();

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center bg-[var(--main-bg)] text-[var(--text-color)]">
      <div className="rounded-lg p-8 max-w-md w-full">
        <h1 className="mb-2 text-6xl font-bold">404</h1>
        <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>

        <p className="mb-8 text-lg opacity-90">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"
          style={{
            backgroundColor:
              theme === "light" ? "var(--header-bg)" : "var(--nav-bg)",
            borderColor: "var(--border-color)",
            color: "var(--text-color)",
          }}
          className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-medium transition-colors hover:opacity-90"
        >
          <LuMoveLeft className="h-5 w-5" />
          Back to Home
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
