"use client";

import React, { useEffect, useState } from "react";

export default function FloatingSettings() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [bgAnim, setBgAnim] = useState<"on" | "off">("on");

  // Sync internal state with document root classes
  const syncStateFromDocument = () => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.style.background = "#090a0f";
    } else {
      document.documentElement.style.background = "#edf5f2";
    }

    const isAnimOff = document.documentElement.classList.contains("no-bg-animation");
    setBgAnim(isAnimOff ? "off" : "on");
  };

  useEffect(() => {
    syncStateFromDocument();

    window.addEventListener("theme-changed", syncStateFromDocument);
    window.addEventListener("bg-animation-changed", syncStateFromDocument);

    return () => {
      window.removeEventListener("theme-changed", syncStateFromDocument);
      window.removeEventListener("bg-animation-changed", syncStateFromDocument);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.background = "#090a0f";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.background = "#edf5f2";
    }
    
    window.dispatchEvent(new Event("theme-changed"));
  };

  const toggleBgAnim = () => {
    const nextBgAnim = bgAnim === "on" ? "off" : "on";
    setBgAnim(nextBgAnim);
    localStorage.setItem("bgAnimation", nextBgAnim);

    if (nextBgAnim === "off") {
      document.documentElement.classList.add("no-bg-animation");
    } else {
      document.documentElement.classList.remove("no-bg-animation");
    }

    window.dispatchEvent(new Event("bg-animation-changed"));
  };

  return (
    <div 
      className="fixed top-2 right-48 z-50 flex items-center gap-1.5 p-1 rounded-xl border backdrop-blur-md shadow-md"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "0 10px 25px -5px var(--card-shadow)"
      }}
    >
      {/* Theme toggle button */}
      <button
        onClick={toggleTheme}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors cursor-pointer"
        aria-label="Toggle theme"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        type="button"
      >
        {theme === "light" ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5 text-yellow-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25m-13.5 0H3m16.5-6.364l-1.591 1.591M6.343 17.657l-1.591 1.591m12.728 0l-1.591-1.591M6.343 6.343L4.752 4.752M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
          </svg>
        )}
      </button>

      {/* Animation toggle button */}
      <button
        onClick={toggleBgAnim}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer relative"
        aria-label="Toggle background animation"
        title={bgAnim === "on" ? "Turn background animation OFF" : "Turn background animation ON"}
        type="button"
      >
        {bgAnim === "on" ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5 text-emerald-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5 text-zinc-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.843 4.5H13.5m-3.75-3.75H4.5A2.25 2.25 0 0 0 2.25 12v3.75m11.25-11.25H9M3 3l18 18" />
          </svg>
        )}
      </button>
    </div>
  );
}
