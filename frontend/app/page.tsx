"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import LiveScore from "../components/LiveScore";
import FollowTeam from "../components/FollowTeam";
import ScheduleRAG from "../components/ScheduleRAG";
import LeagueStandings from "../components/LeagueStandings";
import JourneyHub from "../components/JourneyHub";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function Home() {
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);
  const [appMode, setAppMode] = useState<"club" | "worldcup">("club");

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.app_mode) {
            setAppMode(data.app_mode);
          }
        }
      } catch (err) {
        console.warn("Could not reach backend config endpoint. Defaulting to club mode.", err);
      }
    }
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen text-zinc-950 dark:text-white font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-300 relative">
      <Header />

      {/* Immersive Welcome Showcase Banner */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative glass-card overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/30 dark:bg-zinc-950/20 p-8 sm:p-10 shadow-2xl transition-all duration-300">
          
          {/* Subtle Cybernetic Glowing Accents */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left side: Immersive MEETS OFFSIDE AI Title block */}
            <div className="lg:col-span-4 space-y-4 text-center lg:text-left">
              {/* Shield Logo Badge */}
              <div className="flex justify-center lg:justify-start items-center gap-2 text-zinc-900 dark:text-white">
                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                <span className="text-[11px] font-mono font-bold text-zinc-500 tracking-widest uppercase">Offside AI Hub</span>
              </div>

              <div className="space-y-1">
                <span className="text-3xl font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider block font-sans">
                  MEET
                </span>
                <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-widest leading-none font-sans">
                  <span className="bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">OFFSIDE</span>
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent ml-2">AI</span>
                </h2>
              </div>

              <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-snug">
                The Ultimate Football Intelligence & Logistics Ecosystem
              </p>
            </div>

            {/* Right side: 4 Vertical cards layout */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              {/* Card 1: Seating */}
              <div className="flex flex-col items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-emerald-500/25 dark:border-emerald-500/15 hover:border-emerald-500 transition-all duration-300 text-center hover:shadow-lg group">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🎫
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider font-sans block">
                    SMART SEATING & PRICING
                  </span>
                  <p className="text-[9px] text-zinc-650 dark:text-zinc-400 leading-relaxed">
                    Real-time demand-based seating & stadium occupancy availability.
                  </p>
                </div>
              </div>

              {/* Card 2: Scout */}
              <div className="flex flex-col items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-violet-500/25 dark:border-violet-500/15 hover:border-violet-500 transition-all duration-300 text-center hover:shadow-lg group">
                <div className="h-12 w-12 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🧠
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider font-sans block">
                    ADVANCED SCOUT ANALYTICS
                  </span>
                  <p className="text-[9px] text-zinc-650 dark:text-zinc-400 leading-relaxed">
                    Holistic performance profiles & deep match strategy insights.
                  </p>
                </div>
              </div>

              {/* Card 3: Planner */}
              <div className="flex flex-col items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-teal-500/25 dark:border-teal-500/15 hover:border-teal-500 transition-all duration-300 text-center hover:shadow-lg group">
                <div className="h-12 w-12 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🚇
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider font-sans block">
                    INTELLIGENT TRAVEL PLANNER
                  </span>
                  <p className="text-[9px] text-zinc-650 dark:text-zinc-400 leading-relaxed">
                    Streamlined, multi-leg logistics, stay bookings, and route agents.
                  </p>
                </div>
              </div>

              {/* Card 4: Safety */}
              <div className="flex flex-col items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-blue-500/25 dark:border-blue-500/15 hover:border-blue-500 transition-all duration-300 text-center hover:shadow-lg group">
                <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <div className="space-y-1.5 flex-grow">
                  <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-wider font-sans block">
                    VERIFIED SAFETY HUB
                  </span>
                  <p className="text-[9px] text-zinc-650 dark:text-zinc-400 leading-relaxed">
                    Proactive risk management & security operations control checks.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* SVG Connector Node Diagram */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <div className="lg:col-span-4 flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/25">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">THE SINGLE PLATFORM</span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold">Unifying feeds, routes, and pricing profiles.</span>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col md:flex-row items-center gap-4 text-left bg-zinc-150/40 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-850 p-4 rounded-2xl">
              <div className="hidden md:block w-32 h-10 relative">
                {/* SVG connector lines */}
                <svg className="w-full h-full text-zinc-300 dark:text-zinc-800" viewBox="0 0 120 40" fill="none">
                  <path d="M10 20 L40 20" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M40 20 C60 10, 80 10, 110 10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M40 20 C60 30, 80 30, 110 30" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="40" cy="20" r="4" className="fill-emerald-500" />
                  <circle cx="110" cy="10" r="3" className="fill-violet-400" />
                  <circle cx="110" cy="30" r="3" className="fill-teal-400" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Resolves data conflicts to build a unified profile from multiple matchday feeds and planning variables, enabling seamless execution of all travel logistics and predictive stats.
              </p>
            </div>
          </div>

          {/* Bottom Ticker Status Bar */}
          <div className="mt-6 w-full bg-white/20 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-850 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-[10px] font-mono font-bold text-zinc-650 dark:text-zinc-400 tracking-wider uppercase">
            <span className="text-zinc-600 dark:text-zinc-500">🛡️ POWERED BY PROPRIETARY INTEGRATED COGNITIVE ARCHITECTURE</span>
            <span className="hidden lg:inline text-zinc-300 dark:text-zinc-800">|</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              AUTONOMOUS AGENT NETWORK: OPERATIONAL
            </span>
            <span className="hidden lg:inline text-zinc-300 dark:text-zinc-800">|</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              DATA STREAM: ACTIVE
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>

        </div>
      </section>

      {/* Centered rectangular box for LiveScore */}
      <section id="live-scores-box" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <LiveScore appMode={appMode} />
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white transition-colors">
            {appMode === "club" ? "Club Football Leagues Dashboard" : "World Cup 2026 Dashboard"}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 transition-colors">
            {appMode === "club"
              ? "Live matches across European and world leagues, personalized team tracking, and intelligent schedules."
              : "Real match feeds, user-based favorite teams, and focused schedule filtering."}
          </p>
        </div>

        <div id="favorites-box" className="grid gap-8 md:grid-cols-3">
          <section className="md:col-span-1">
            <FollowTeam onFollowChange={setFollowedTeams} appMode={appMode} />
          </section>

          <section className="md:col-span-2 flex flex-col gap-6">
            <LeagueStandings />
            <JourneyHub />
          </section>
        </div>

        <section className="pt-4">
          <ScheduleRAG followedTeams={followedTeams} appMode={appMode} />
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs mt-12 transition-colors duration-300" style={{ borderColor: "var(--header-border)", background: "var(--card-bg)", color: "var(--text-secondary)" }}>
        <p>Offside AI 2026. Match intelligence dashboard.</p>
      </footer>
    </div>
  );
}
