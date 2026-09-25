"use client";

import React, { useState, useEffect } from "react";
import { FlagIcon } from "./LiveScore";
import "./LeagueStandings.css";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const STANDINGS_LEAGUES = [
  { value: "PL", label: "Premier League" },
  { value: "PD", label: "LaLiga" },
  { value: "SA", label: "Serie A" },
  { value: "BL1", label: "Bundesliga" },
  { value: "FL1", label: "Ligue 1" },
  { value: "MLS", label: "MLS" },
];

interface StandingEntry {
  position: number;
  team: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form?: string;
}

export default function LeagueStandings() {
  const [selectedLeague, setSelectedLeague] = useState("PL");
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchStandings() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${BACKEND_URL}/api/v1/competitions/${selectedLeague}/standings`);
        if (!res.ok) {
          throw new Error("Failed to load league standings table");
        }
        const data = await res.json();
        if (active) {
          const table = data.standings?.[0]?.table || [];
          setStandings(table);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Could not fetch standings table.");
          setLoading(false);
        }
      }
    }
    fetchStandings();
    return () => {
      active = false;
    };
  }, [selectedLeague]);

  const renderFormIndicator = (formStr?: string) => {
    if (!formStr) return null;
    // Normalize format from either "W,D,L" or "WDL"
    const results = formStr.includes(",") 
      ? formStr.split(",") 
      : formStr.split("");

    return (
      <div className="flex gap-1 justify-center items-center">
        {results.slice(0, 5).map((res, idx) => {
          const r = res.trim().toUpperCase();
          let bgClass = "bg-zinc-600";
          let char = "D";
          if (r === "W") {
            bgClass = "bg-emerald-500 shadow-emerald-500/20";
            char = "W";
          } else if (r === "L") {
            bgClass = "bg-rose-500 shadow-rose-500/20";
            char = "L";
          } else if (r === "D") {
            bgClass = "bg-zinc-500/80 shadow-zinc-500/20";
            char = "D";
          }
          return (
            <span 
              key={idx} 
              className={`w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-sm ${bgClass}`}
              title={char === "W" ? "Won" : char === "L" ? "Lost" : "Drew"}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="standings-card-dark">
      <div className="standings-header">
        <h3 className="standings-title">League Standings</h3>
        
        {/* Modern Select Dropdown tab bar */}
        <div className="standings-tabs-container scrollbar-none">
          {STANDINGS_LEAGUES.map((league) => (
            <button
              key={league.value}
              onClick={() => setSelectedLeague(league.value)}
              className={`standings-tab-btn ${selectedLeague === league.value ? "active" : ""}`}
              type="button"
            >
              {league.value === "MLS" ? "MLS" : league.value}
            </button>
          ))}
        </div>
      </div>

      <div className="standings-content">
        {loading ? (
          <div className="standings-loading">
            <div className="loader-ring-dark" />
            <p className="mt-3 text-xs font-bold text-zinc-400">Loading standings...</p>
          </div>
        ) : error ? (
          <div className="standings-error">
            <p>{error}</p>
          </div>
        ) : standings.length === 0 ? (
          <div className="standings-empty">
            <p>No standings data available for this competition.</p>
          </div>
        ) : (
          <div className="standings-table-wrapper scrollbar-thin">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="w-10 text-center">Pos</th>
                  <th className="text-left">Club</th>
                  <th className="w-10 text-center">PL</th>
                  <th className="w-10 text-center hidden sm:table-cell">W</th>
                  <th className="w-10 text-center hidden sm:table-cell">D</th>
                  <th className="w-10 text-center hidden sm:table-cell">L</th>
                  <th className="w-12 text-center">GD</th>
                  <th className="w-12 text-center text-emerald-600 dark:text-emerald-400">Pts</th>
                  <th className="w-28 text-center hidden md:table-cell">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((entry) => {
                  const isTopFour = entry.position <= 4;
                  const isRelegation = entry.position >= standings.length - 2;

                  return (
                    <tr 
                      key={entry.team.id} 
                      className={`standing-row ${isTopFour ? "top-four-border" : ""} ${isRelegation ? "relegation-border" : ""}`}
                    >
                      <td className="text-center font-mono font-bold text-xs">
                        <span className={`pos-badge ${isTopFour ? "pos-top" : isRelegation ? "pos-low" : "pos-normal"}`}>
                          {entry.position}
                        </span>
                      </td>
                      <td className="text-left py-2">
                        <div className="flex items-center gap-2.5">
                          {entry.team.crest ? (
                            <img 
                              src={entry.team.crest} 
                              alt="" 
                              className="w-5 h-5 object-contain flex-shrink-0 bg-white rounded p-0.5 shadow-sm border border-zinc-700/10"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <FlagIcon team={entry.team.name} className="w-5 h-5" />
                          )}
                          <span className="team-name text-[12px] font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px] sm:max-w-[180px]">
                            {entry.team.shortName || entry.team.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-center font-semibold text-zinc-700 dark:text-zinc-300 text-xs">{entry.playedGames}</td>
                      <td className="text-center text-zinc-500 dark:text-zinc-400 text-xs hidden sm:table-cell">{entry.won}</td>
                      <td className="text-center text-zinc-500 dark:text-zinc-400 text-xs hidden sm:table-cell">{entry.draw}</td>
                      <td className="text-center text-zinc-500 dark:text-zinc-400 text-xs hidden sm:table-cell">{entry.lost}</td>
                      <td className={`text-center font-mono text-xs ${entry.goalDifference > 0 ? "text-emerald-500/90 font-bold" : entry.goalDifference < 0 ? "text-rose-500/90" : "text-zinc-500"}`}>
                        {entry.goalDifference > 0 ? `+${entry.goalDifference}` : entry.goalDifference}
                      </td>
                      <td className="text-center font-black text-zinc-900 dark:text-white text-[13px]">{entry.points}</td>
                      <td className="text-center hidden md:table-cell">{renderFormIndicator(entry.form)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="standings-footer">
        <div className="flex items-center gap-4 text-[9px] font-semibold text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> Top 4 (UCL)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> Relegation
          </span>
        </div>
      </div>
    </div>
  );
}
