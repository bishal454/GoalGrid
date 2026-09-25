"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function JourneyHub() {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);

  // Auto-play slides unless hovered
  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoPlay]);

  interface IconProps {
    className?: string;
  }

  // SVG Icons
  const Icons = {
    Globe: ({ className }: IconProps) => (
      <svg className={className || "advert-logo-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l.406.34c.125.104.224.239.29.392l.04.093c.117.275.385.456.683.456h.75c.22 0 .43-.089.585-.246l.49-.49a1.004 1.004 0 0 1 .71-.294h.194c.3 0 .583.135.772.368l.309.381c.115.143.177.32.177.502v.036c0 .517.347.96.844 1.077l.11.026c.21.047.35.23.35.446V9.75m-6-3.75h.008v.008H12V6m2.25 9h.008v.008h-.008V15m0-5.25h.008v.008h-.008V9.75M9 10.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 9 10.5ZM12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      </svg>
    ),
    PartnerMap: ({ className }: IconProps) => (
      <svg className={className || "advert-logo-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.46c.924-.627 2.115-.98 3.197-.98.375 0 .74.043 1.092.126.541.127.958.552.958 1.111v3.298c0 .762-.73 1.309-1.464 1.157-1.104-.229-2.316-.279-3.415.108l-.291.103c-1.12.398-2.366.398-3.487 0l-.291-.103c-1.144-.407-2.422-.407-3.566 0L4.17 19.38c-.733.26-1.488-.28-1.488-1.06V15.02c0-.559.417-.984.958-1.11 1.092-.257 2.284-.257 3.376 0L8.5 14.36c.642.215 1.328.215 1.97 0l1.492-.5c1.092-.365 2.284-.365 3.376 0l1.165.39Z" />
      </svg>
    ),
    Map: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-3.46c.924-.627 2.115-.98 3.197-.98.375 0 .74.043 1.092.126.541.127.958.552.958 1.111v3.298c0 .762-.73 1.309-1.464 1.157-1.104-.229-2.316-.279-3.415.108l-.291.103c-1.12.398-2.366.398-3.487 0l-.291-.103c-1.144-.407-2.422-.407-3.566 0L4.17 19.38c-.733.26-1.488-.28-1.488-1.06V15.02c0-.559.417-.984.958-1.11 1.092-.257 2.284-.257 3.376 0L8.5 14.36c.642.215 1.328.215 1.97 0l1.492-.5c1.092-.365 2.284-.365 3.376 0l1.165.39Z" />
      </svg>
    ),
    Bell: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
    Wifi: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856a9.75 9.75 0 0 1 13.788 0M1.924 8.674a14.25 14.25 0 0 1 20.152 0M12.53 18.22a1.875 1.875 0 1 1-2.652 0 1.875 1.875 0 0 1 2.652 0Z" />
      </svg>
    ),
    Robot: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a.75.75 0 0 1-1.074-.765 6 6 0 0 0 1.957-2.99C3.282 15.587 3 13.86 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    Heatmap: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    Gavel: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
      </svg>
    ),
    DocumentKey: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    Settings: ({ className }: IconProps) => (
      <svg className={className || "advert-card-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-9 0h15" />
      </svg>
    ),
    Fan: ({ className }: IconProps) => (
      <svg className={className || "advert-col-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12a6 6 0 0 1 12 0m-12 0a6 6 0 0 0 12 0M6 12h12M12 6v12M9.6 9.6l4.8 4.8m-4.8 0l4.8-4.8" />
      </svg>
    ),
    Store: ({ className }: IconProps) => (
      <svg className={className || "advert-col-icon"} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.5a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
      </svg>
    )
  };

  return (
    <div 
      className="advert-container"
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
    >
      {/* Header Slide Controls */}
      <nav className="advert-tabs">
        <button
          onClick={() => setActiveSlide(0)}
          className={activeSlide === 0 ? "advert-tab-btn-active" : "advert-tab-btn"}
          type="button"
        >
          Spectator Hub
        </button>
        <button
          onClick={() => setActiveSlide(1)}
          className={activeSlide === 1 ? "advert-tab-btn-active" : "advert-tab-btn"}
          type="button"
        >
          Partner Portal
        </button>
        <button
          onClick={() => setActiveSlide(2)}
          className={activeSlide === 2 ? "advert-tab-btn-active" : "advert-tab-btn"}
          type="button"
        >
          Unified AI Portal
        </button>
      </nav>

      {/* SLIDE 1: SPECTATOR HUB */}
      {activeSlide === 0 && (
        <div className="advert-slide">
          <div className="advert-header">
            <div className="advert-brand">
              <Icons.Globe />
              <span className="advert-logo-text">Globus 2026</span>
            </div>
            <h3 className="advert-title">
              Secure Your Ultimate 2026 World Cup Experience.
            </h3>
          </div>

          <div className="advert-grid">
            {/* Card 1 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Map />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Save Your Followed Stadium Routes</h4>
                <p className="advert-card-desc">
                  Effortlessly recall personalized transit plans to any stadium.
                </p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Bell />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Receive Matchday Gate Delays</h4>
                <p className="advert-card-desc">
                  Get instant real-time alerts on stadium-specific issues before you arrive.
                </p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Wifi />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Unlock 5G Premium Fan Pass</h4>
                <p className="advert-card-desc">
                  Enjoy high-speed data for streaming and sharing inside and outside.
                </p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Robot />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Autonomous Re-Routing</h4>
                <p className="advert-card-desc">
                  Missed a train? Our agent automatically books the next best option for you.
                </p>
              </div>
            </div>
          </div>

          <div className="advert-footer-single">
            <Link href="/signup" className="advert-btn">
              Create My Fan Profile
            </Link>
          </div>
        </div>
      )}

      {/* SLIDE 2: COMMERCIAL PARTNER PORTAL */}
      {activeSlide === 1 && (
        <div className="advert-slide">
          <div className="advert-header">
            <div className="advert-brand">
              <Icons.PartnerMap />
              <span className="advert-logo-text">Globus 2026</span>
            </div>
            <span className="advert-subtitle">Commercial Partner Portal</span>
            <h3 className="advert-title">
              Secure and Scale Your World Cup Business Strategy.
            </h3>
          </div>

          <div className="advert-grid">
            {/* Card 1 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Heatmap />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Demographic Heatmaps</h4>
                <p className="advert-card-desc">
                  See real-time fan concentrations to optimize kiosk placement.
                </p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Gavel />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Bid On Premier Vendor Stalls</h4>
                <p className="advert-card-desc">
                  Access prime high-footfall locations like Gourmet Plaza near arenas.
                </p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.DocumentKey />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Direct Leasing Agreements</h4>
                <p className="advert-card-desc">
                  Simplify compliance with direct, secure rental agreements.
                </p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="advert-card">
              <div className="advert-card-icon-wrap">
                <Icons.Settings />
              </div>
              <div className="advert-card-body">
                <h4 className="advert-card-title">Real-Time Stock Adjustments</h4>
                <p className="advert-card-desc">
                  Get automated insights and suggestions to handle World Cup inventory surges.
                </p>
              </div>
            </div>
          </div>

          <div className="advert-footer-single">
            <Link href="/signup" className="advert-btn">
              Create Partner Profile
            </Link>
          </div>
        </div>
      )}

      {/* SLIDE 3: UNIFIED AI PORTAL */}
      {activeSlide === 2 && (
        <div className="advert-slide">
          <div className="advert-header">
            <span className="advert-logo-text !text-[11px] tracking-[0.2em] opacity-80">Offside AI & Globus 2026</span>
            <span className="advert-subtitle !text-zinc-400 !font-extrabold normal-case">Don't just plan, EXECUTE</span>
            <h3 className="advert-title !text-base mt-2">
              Join Offside AI / Globus 2026
            </h3>
          </div>

          <div className="advert-unified-row">
            {/* Vertical side branding */}
            <div className="advert-side-vertical">
              Powered by GCP Agent Builder & MongoDB
            </div>

            {/* SVG Pulsing lines */}
            <svg className="advert-lines-svg" viewBox="0 0 400 100" fill="none">
              <path d="M60,50 L170,50" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={2} />
              <path d="M230,50 L340,50" stroke="rgba(255, 255, 255, 0.08)" strokeWidth={2} />
              <path className="advert-pulse-line" d="M60,50 L170,50" strokeWidth={2} />
              <path className="advert-pulse-line" d="M340,50 L230,50" strokeWidth={2} />
            </svg>

            {/* Left Column: Fan Journey */}
            <div className="advert-unified-col">
              <span className="advert-col-title">Your Fan Journey</span>
              <Icons.Fan />
              <p className="advert-col-text">
                Live re-routing, delay alerts, 5G pass. Enjoy the match; we handle the trip.
              </p>
            </div>

            {/* Center: AI Robot Circle */}
            <div className="advert-agent-hub">
              <div className="advert-agent-circle">
                <Icons.Robot className="advert-agent-icon" />
              </div>
              <span className="advert-agent-text">
                Gemini-powered Autonomous Agent
              </span>
            </div>

            {/* Right Column: Business Venture */}
            <div className="advert-unified-col">
              <span className="advert-col-title">Your Business Venture</span>
              <Icons.Store />
              <p className="advert-col-text">
                Prime stalls, traffic insights, stock management. Maximize your presence; we optimize operations.
              </p>
            </div>
          </div>

          <div className="advert-footer-dual">
            <Link href="/signup" className="advert-btn-outline">
              Join as a Fan
            </Link>
            <Link href="/signup" className="advert-btn">
              Join as a Partner
            </Link>
          </div>
        </div>
      )}

      {/* Slider Indicator Dots */}
      <div className="advert-indicator-dots">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={activeSlide === idx ? "advert-dot-active" : "advert-dot"}
            aria-label={`Go to slide ${idx + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
