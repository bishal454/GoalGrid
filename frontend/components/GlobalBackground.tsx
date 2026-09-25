"use client";

import React, { useEffect, useRef } from "react";

export default function GlobalBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Initial configuration load
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const activeTheme = savedTheme || (prefersDark ? "dark" : "light");

    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedBgAnim = localStorage.getItem("bgAnimation");
    const activeBgAnim = savedBgAnim || "on";

    if (activeBgAnim === "off") {
      document.documentElement.classList.add("no-bg-animation");
    } else {
      document.documentElement.classList.remove("no-bg-animation");
    }

    // 2. Play state sync
    const syncVideoState = () => {
      const video = videoRef.current;
      if (!video) return;
      
      // Explicitly set muted to true to guarantee browser autoplay works
      video.muted = true;
      
      const isOff = document.documentElement.classList.contains("no-bg-animation");
      if (isOff) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    // Robust autoplay bypass: play on first click/touchstart
    const playOnInteraction = () => {
      const video = videoRef.current;
      if (!video) return;
      const isOff = document.documentElement.classList.contains("no-bg-animation");
      if (!isOff) {
        video.play().then(() => {
          window.removeEventListener("click", playOnInteraction);
          window.removeEventListener("touchstart", playOnInteraction);
        }).catch(() => {});
      }
    };

    window.addEventListener("click", playOnInteraction);
    window.addEventListener("touchstart", playOnInteraction);

    // Delay slightly to ensure browser has registered the video element
    const timeoutId = setTimeout(syncVideoState, 150);

    window.addEventListener("bg-animation-changed", syncVideoState);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("bg-animation-changed", syncVideoState);
      window.removeEventListener("click", playOnInteraction);
      window.removeEventListener("touchstart", playOnInteraction);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 w-full h-full select-none overflow-hidden"
      style={{
        zIndex: -1,
        pointerEvents: "none"
      }}
    >
      <video
        ref={videoRef}
        src="/video2.mp4"
        className="w-full h-full object-cover bg-video-element"
        autoPlay
        muted
        loop
        playsInline
        style={{
          pointerEvents: "none"
        }}
      />
      <div 
        className="absolute inset-0 bg-video-overlay bg-white/25 dark:bg-[#090a0f]/50 backdrop-blur-[2px] bg-gradient-to-tr from-emerald-500/10 via-cyan-400/5 to-lime-500/10 dark:from-transparent dark:via-transparent dark:to-transparent transition-colors duration-300"
        style={{
          pointerEvents: "none"
        }}
      />
    </div>
  );
}
