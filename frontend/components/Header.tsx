"use client";

import Link from "next/link";
import React from "react";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser, StoredUser } from "../lib/auth";

export default function Header() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [appMode, setAppMode] = useState<"club" | "worldcup">("club");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [bgAnim, setBgAnim] = useState<"on" | "off">("on");

  useEffect(() => {
    setUser(getCurrentUser());
    async function fetchConfig() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.app_mode) {
            setAppMode(data.app_mode);
          }
        }
      } catch {
        // Fallback silently to default
      }
    }
    fetchConfig();

    // Theme initialization
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const activeTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.background = "#090a0f";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.background = "#edf5f2";
    }

    // Background animation initialization
    const savedBgAnim = localStorage.getItem("bgAnimation") as "on" | "off" | null;
    const activeBgAnim = savedBgAnim || "on";
    setBgAnim(activeBgAnim);
    if (activeBgAnim === "off") {
      document.documentElement.classList.add("no-bg-animation");
    } else {
      document.documentElement.classList.remove("no-bg-animation");
    }

    const syncState = () => {
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

    window.addEventListener("theme-changed", syncState);
    window.addEventListener("bg-animation-changed", syncState);

    setTimeout(() => {
      window.dispatchEvent(new Event("bg-animation-changed"));
    }, 100);

    return () => {
      window.removeEventListener("theme-changed", syncState);
      window.removeEventListener("bg-animation-changed", syncState);
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

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="header-container">
      <div className="header-accent" />
      <div className="header-wrapper">
        <div className="header-inner">
          <Link href="/" className="flex items-center gap-3 logo-container" style={{ textDecoration: 'none' }}>
            <span className="font-extrabold text-2xl tracking-tighter text-emerald-500 hover:scale-105 transition-transform">O</span>
            <div className="h-6 w-px bg-emerald-500/20" />
            <span className="text-sm font-extrabold uppercase tracking-widest text-emerald-500 logo-text">OFFSIDE AI</span>
          </Link>

          <nav className="nav-menu">
            <Link href="/" className="nav-link-active">
              Home
            </Link>
            <a 
              href="#live-scores-box" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("live-scores-box")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="nav-link"
            >
              Live Scores
            </a>
            <a 
              href="#favorites-box" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("favorites-box")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="nav-link"
            >
              {appMode === "club" ? "Club Schedules" : "2026 Schedule"}
            </a>
            <a 
              href="/dashboard"
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  alert("Please login first to access AI Tactical Match Analytics.");
                  window.location.href = "/login?redirect=dashboard";
                }
              }}
              className="nav-link"
            >
              AI Analytics
            </a>
          </nav>

          <div className="header-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              aria-label="Toggle theme"
              type="button"
            >
              {theme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-yellow-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9.75-9h-2.25m-13.5 0H3m16.5-6.364l-1.591 1.591M6.343 17.657l-1.591 1.591m12.728 0l-1.591-1.591M6.343 6.343L4.752 4.752M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z" />
                </svg>
              )}
            </button>
            <button
              onClick={toggleBgAnim}
              className="theme-toggle-btn relative"
              aria-label="Toggle background animation"
              title={bgAnim === "on" ? "Turn background animation OFF" : "Turn background animation ON"}
              type="button"
            >
              {bgAnim === "on" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-emerald-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-zinc-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.843 4.5H13.5m-3.75-3.75H4.5A2.25 2.25 0 0 0 2.25 12v3.75m11.25-11.25H9M3 3l18 18" />
                </svg>
              )}
            </button>
            <span className="badge-container">
              <span className="badge-dot" />
              {appMode === "club" ? "Club Season Live" : "FIFA 2026 Live"}
            </span>
            {user ? (
              <div className="flex items-center gap-2.5">
                <Link 
                  href="/dashboard" 
                  className="rounded-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 px-3.5 py-1.5 text-xs font-bold shadow-sm hover:bg-emerald-700 dark:hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                >
                  Dashboard ➔
                </Link>
                <div className="user-menu">
                  <span className="user-chip">{user.name.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{user.name}</span>
                  <button type="button" className="logout-button" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-actions">
                <Link className="login-link" href="/login">Login</Link>
                <Link className="signup-link" href="/signup">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
