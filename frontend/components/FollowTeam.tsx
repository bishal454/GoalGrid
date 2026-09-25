"use client";

import React, { useEffect, useState } from "react";
import { FlagIcon } from "./LiveScore";
import { getCurrentUser, getFavoriteTeamsKey } from "../lib/auth";

interface TeamOption {
  id?: number;
  name: string;
  info: string;
  category: string; // league code
  crest?: string;
  conference?: string;
}

const WORLDCUP_TEAMS: TeamOption[] = [
  { name: "Argentina", info: "Group A - CONMEBOL", category: "WC" },
  { name: "Brazil", info: "Group B - CONMEBOL", category: "WC" },
  { name: "United States", info: "Group D - CONCACAF", category: "WC" },
  { name: "Mexico", info: "Group A - CONCACAF", category: "WC" },
  { name: "Canada", info: "Group B - CONCACAF", category: "WC" },
  { name: "France", info: "Group C - UEFA", category: "WC" },
];

const CLUB_TEAMS: TeamOption[] = [
  // Premier League
  { name: "Manchester City", info: "Etihad Stadium - Premier League", category: "PL" },
  { name: "Arsenal", info: "Emirates Stadium - Premier League", category: "PL" },
  { name: "Manchester United", info: "Old Trafford - Premier League", category: "PL" },
  { name: "Chelsea", info: "Stamford Bridge - Premier League", category: "PL" },
  { name: "Liverpool", info: "Anfield - Premier League", category: "PL" },
  // LaLiga
  { name: "Real Madrid", info: "Santiago Bernabeu - LaLiga", category: "PD" },
  { name: "Barcelona", info: "Camp Nou - LaLiga", category: "PD" },
  { name: "Atletico Madrid", info: "Metropolitano - LaLiga", category: "PD" },
  // Serie A
  { name: "Inter Milan", info: "San Siro - Serie A", category: "SA" },
  { name: "AC Milan", info: "San Siro - Serie A", category: "SA" },
  { name: "Juventus", info: "Allianz Stadium - Serie A", category: "SA" },
  // Champions League
  { name: "Bayern Munich", info: "Allianz Arena - UCL", category: "CL" },
  { name: "Bayer Leverkusen", info: "BayArena - UCL", category: "CL" },
];

interface FollowTeamProps {
  onFollowChange?: (followedTeams: string[]) => void;
  appMode?: "club" | "worldcup";
}

export default function FollowTeam({ onFollowChange, appMode = "club" }: FollowTeamProps) {
  const [followed, setFollowed] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeLeague, setActiveLeague] = useState(appMode === "club" ? "PL" : "WC");
  const [mounted, setMounted] = useState(false);
  const [activeUserName, setActiveUserName] = useState("Guest");
  const [clubTeams, setClubTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  
  // Dynamic leagues list from backend config
  const [leagues, setLeagues] = useState<{ value: string; label: string }[]>([]);

  // Expanded squad loading states
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [squadData, setSquadData] = useState<any | null>(null);
  const [loadingSquad, setLoadingSquad] = useState(false);

  // Keep active league in sync when appMode changes
  useEffect(() => {
    setActiveLeague(appMode === "club" ? "PL" : "WC");
    setExpandedTeamId(null);
    setSquadData(null);
  }, [appMode]);

  // Load configuration and leagues dynamically
  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/config`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.supported_leagues) && data.supported_leagues.length > 0) {
            setLeagues(data.supported_leagues);
            // Default active league to first value if not in list
            const exists = data.supported_leagues.some((l: any) => l.value === activeLeague);
            if (!exists && appMode === "club") {
              setActiveLeague(data.supported_leagues[0].value);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch leagues for FollowTeam.", err);
      }
    }
    fetchLeagues();
  }, [appMode]);

  // Load dynamic teams from the backend when active league changes
  useEffect(() => {
    let active = true;
    async function loadTeams() {
      try {
        setLoadingTeams(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/competitions/${activeLeague}/teams`);
        if (!res.ok) {
          throw new Error("Failed to fetch teams");
        }
        const data = await res.json();
        if (active && data && Array.isArray(data.teams)) {
          const mapped = data.teams.map((t: any) => ({
            id: t.id,
            name: t.shortName || t.name,
            info: t.venue ? `${t.venue}${t.clubColors ? " - " + t.clubColors : ""}` : t.name,
            category: activeLeague,
            crest: t.crest,
            conference: t.conference // Map the conference attribute
          }));
          setClubTeams(mapped);
        }
      } catch (err) {
        console.warn("Could not load dynamic teams, falling back to static list.", err);
        if (active) {
          // Fall back to static mock list
          const fallbackList = appMode === "club" ? CLUB_TEAMS : WORLDCUP_TEAMS;
          const filteredFallback = fallbackList
            .filter(t => t.category === activeLeague)
            .map((t, idx) => ({ ...t, id: -(idx + 1) })); // Negative ID for fallback
          setClubTeams(filteredFallback);
        }
      } finally {
        if (active) {
          setLoadingTeams(false);
        }
      }
    }
    
    loadTeams();
    return () => {
      active = false;
    };
  }, [activeLeague, appMode]);

  // Filter teams based on selected league (if club mode) and search term
  const filteredTeams = clubTeams.filter(team => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    
    return (
      team.name.toLowerCase().includes(query) ||
      team.info.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    const storageKey = getFavoriteTeamsKey();
    setActiveUserName(user?.name || "Guest");
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFollowed(parsed);
        if (onFollowChange) onFollowChange(parsed);
      } catch (error) {
        console.error(error);
      }
    }
  }, [onFollowChange, appMode]);

  const toggleFollow = (teamName: string) => {
    const storageKey = getFavoriteTeamsKey();
    const updated = followed.includes(teamName)
      ? followed.filter(team => team !== teamName)
      : [...followed, teamName];

    setFollowed(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    if (onFollowChange) onFollowChange(updated);
  };

  const handleTeamClick = async (team: TeamOption) => {
    if (!team.id) return;

    if (expandedTeamId === team.id) {
      setExpandedTeamId(null);
      setSquadData(null);
      return;
    }

    setExpandedTeamId(team.id);
    setSquadData(null);

    // Simulated local fallback squad logic for static negative IDs
    if (team.id < 0) {
      setSquadData({
        coach: { name: "Simulated Coach" },
        squad: [
          { id: 101, name: "Simulated Player A", position: "Defence", shirtNumber: 2 },
          { id: 102, name: "Simulated Player B", position: "Midfield", shirtNumber: 8 },
          { id: 103, name: "Simulated Player C", position: "Offence", shirtNumber: 10 },
        ]
      });
      return;
    }

    try {
      setLoadingSquad(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/teams/${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch squad");
      const data = await res.json();
      if (!data || !data.squad || data.squad.length === 0) {
        throw new Error("Empty squad data from backend");
      }
      setSquadData(data);
    } catch (err) {
      console.warn("Failed to load squad details from backend. Using dynamic mock fallback:", err);
      
      // Dynamic high-quality coach mapping for major clubs
      const nameLower = team.name.toLowerCase();
      let coachName = "Head Coach";
      if (nameLower.includes("liverpool")) coachName = "Arne Slot";
      else if (nameLower.includes("manchester city") || nameLower.includes("man city")) coachName = "Pep Guardiola";
      else if (nameLower.includes("arsenal")) coachName = "Mikel Arteta";
      else if (nameLower.includes("manchester united") || nameLower.includes("man united")) coachName = "Rúben Amorim";
      else if (nameLower.includes("chelsea")) coachName = "Enzo Maresca";
      else if (nameLower.includes("real madrid")) coachName = "Carlo Ancelotti";
      else if (nameLower.includes("barcelona")) coachName = "Hansi Flick";
      else if (nameLower.includes("tottenham")) coachName = "Ange Postecoglou";
      else if (nameLower.includes("bayern")) coachName = "Vincent Kompany";
      else if (nameLower.includes("inter milan") || nameLower.includes("inter")) coachName = "Simone Inzaghi";
      else if (nameLower.includes("ac milan")) coachName = "Paulo Fonseca";
      else if (nameLower.includes("juventus")) coachName = "Thiago Motta";
      else if (nameLower.includes("leverkusen")) coachName = "Xabi Alonso";
      else if (nameLower.includes("aston villa")) coachName = "Unai Emery";
      else if (nameLower.includes("newcastle")) coachName = "Eddie Howe";
      else if (nameLower.includes("inter miami")) coachName = "Gerardo Martino";

      // Mock players representing realistic squad listings
      const mockPlayers = [
        { id: 20001, name: `${team.name} Captain`, position: "Midfield", shirtNumber: 8 },
        { id: 20002, name: `${team.name} Playmaker`, position: "Midfield", shirtNumber: 10 },
        { id: 20003, name: `${team.name} Striker`, position: "Offence", shirtNumber: 9 },
        { id: 20004, name: `${team.name} Winger`, position: "Offence", shirtNumber: 11 },
        { id: 20005, name: `${team.name} Center Back`, position: "Defence", shirtNumber: 4 },
        { id: 20006, name: `${team.name} Fullback`, position: "Defence", shirtNumber: 2 },
        { id: 20007, name: `${team.name} Center Defender`, position: "Defence", shirtNumber: 5 },
        { id: 20008, name: `${team.name} Goalkeeper`, position: "Goalkeeper", shirtNumber: 1 }
      ];

      setSquadData({
        coach: { name: coachName },
        squad: mockPlayers
      });
    } finally {
      setLoadingSquad(false);
    }
  };

  const renderTeamCard = (team: TeamOption) => {
    const isFollowing = followed.includes(team.name);
    const isExpanded = expandedTeamId === team.id;
    return (
      <div
        key={team.name}
        className={`${isFollowing ? "team-card-active" : "team-card"} flex flex-col items-start gap-0 transition-all cursor-pointer`}
        onClick={() => handleTeamClick(team)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="team-info">
            {team.crest ? (
              <img 
                src={team.crest} 
                alt={team.name} 
                className="h-8 w-8 object-contain flex-shrink-0 bg-white rounded-md p-0.5 border border-zinc-200/50 shadow-sm" 
              />
            ) : (
              <FlagIcon team={team.name} className="h-8 w-8" />
            )}
            <div className="team-details">
              <h4 className="team-name">{team.name}</h4>
              <p className="team-meta">{team.info}</p>
            </div>
          </div>

          <button
            className={isFollowing ? "btn-star-active" : "btn-star"}
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // Prevent expanding the card
              toggleFollow(team.name);
            }}
          >
            {isFollowing ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.19-.443.807-.443.996 0l2.22 5.168 5.603.45a.563.563 0 0 1 .318.966l-4.22 3.618 1.27 5.437c.1.43-.374.773-.748.528L12 17.524l-4.72 2.853c-.374.245-.848-.1-.748-.528l1.27-5.436-4.22-3.618a.563.563 0 0 1 .318-.966l5.603-.45 2.22-5.169Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Expanded Squad section */}
        {isExpanded && (
          <div className="squad-container w-full mt-3" onClick={(e) => e.stopPropagation()}>
            {loadingSquad ? (
              <div className="squad-loading flex items-center gap-2 py-2">
                <div className="squad-spinner" />
                <span>Loading squad...</span>
              </div>
            ) : squadData ? (
              <>
                {squadData.coach && squadData.coach.name && (
                  <div className="mb-2">
                    <span className="squad-coach font-semibold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Coach: {squadData.coach.name}</span>
                  </div>
                )}
                <h5 className="squad-title text-zinc-500 font-bold text-[10px] uppercase tracking-wider mb-2">Squad Players</h5>
                {squadData.squad && squadData.squad.length > 0 ? (
                  <div className="squad-scroll max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                    {squadData.squad.map((player: any) => (
                      <div key={player.id} className="squad-player-card flex items-center justify-between py-1 border-b border-zinc-100 last:border-0 text-xs">
                        <div className="player-main flex items-center gap-2">
                          <span className="player-number font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600">
                            {player.shirtNumber || "#"}
                          </span>
                          <span className="player-name-text font-medium text-zinc-800">{player.name}</span>
                        </div>
                        <span className="player-position text-[10px] text-zinc-400 font-medium">
                          {player.position || "Player"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 py-2">No squad info found.</div>
                )}
              </>
            ) : (
              <div className="text-xs text-zinc-500 py-2">Failed to load squad details.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="skeleton-container">
        <div className="skeleton-title" />
        <div className="space-y-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  // Group MLS teams by Conference
  const easternTeams = filteredTeams.filter(t => t.conference === "Eastern");
  const westernTeams = filteredTeams.filter(t => t.conference === "Western");

  return (
    <div className="followteam-container">
      <div className="followteam-header">
        <h2 className="followteam-title font-extrabold tracking-tight">
          {appMode === "club" ? "Follow Club Teams" : "Follow Your Teams"}
        </h2>
        <p className="followteam-subtitle">
          Saved for {activeUserName}. Select teams to highlight their schedule.
        </p>
      </div>

      {appMode === "club" && leagues.length > 0 && (
        <div className="league-tabs">
          {leagues.map(tab => {
            const getShortLabel = (val: string, lbl: string) => {
              if (val === "PL") return "PL";
              if (val === "PD") return "LaLiga";
              if (val === "SA") return "Serie A";
              if (val === "BL1") return "Bundesliga";
              if (val === "FL1") return "Ligue 1";
              if (val === "CL") return "UCL";
              if (val === "ELC") return "Champ";
              if (val === "DED") return "Eredivisie";
              if (val === "PPL") return "PPL";
              if (val === "CLI") return "Copa Lib";
              if (val === "MLS") return "MLS";
              return lbl.split(" ")[0];
            };
            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveLeague(tab.value);
                  setSearch(""); // Reset search on tab switch
                  setExpandedTeamId(null);
                  setSquadData(null);
                }}
                className={activeLeague === tab.value ? "league-tab-active" : "league-tab"}
                type="button"
              >
                {getShortLabel(tab.value, tab.label)}
              </button>
            );
          })}
        </div>
      )}

      <div className="team-search-wrap">
        <svg className="team-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />
        </svg>
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="team-search-input font-medium"
          placeholder={appMode === "club" ? "Search club teams..." : "Search teams..."}
          type="search"
        />
      </div>

      <div className="team-list">
        {loadingTeams ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-medium animate-pulse flex items-center justify-center gap-2">
            <div className="squad-spinner" />
            <span>Loading teams...</span>
          </div>
        ) : activeLeague === "MLS" ? (
          <div className="space-y-6 w-full">
            {/* Eastern Conference */}
            {easternTeams.length > 0 && (
              <div className="conference-section">
                <h3 className="conference-heading text-pink-600 border-b border-pink-100 pb-1 mb-3 text-xs font-extrabold uppercase tracking-wider flex items-center justify-between animate-fade-in">
                  <span>Eastern Conference</span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{easternTeams.length} teams</span>
                </h3>
                <div className="space-y-3">
                  {easternTeams.map(team => renderTeamCard(team))}
                </div>
              </div>
            )}
            
            {/* Western Conference */}
            {westernTeams.length > 0 && (
              <div className="conference-section">
                <h3 className="conference-heading text-sky-600 border-b border-sky-100 pb-1 mb-3 text-xs font-extrabold uppercase tracking-wider flex items-center justify-between animate-fade-in">
                  <span>Western Conference</span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{westernTeams.length} teams</span>
                </h3>
                <div className="space-y-3">
                  {westernTeams.map(team => renderTeamCard(team))}
                </div>
              </div>
            )}

            {!loadingTeams && easternTeams.length === 0 && westernTeams.length === 0 && (
              <div className="team-empty text-center text-zinc-400 text-xs italic py-4">No conference teams found.</div>
            )}
          </div>
        ) : (
          <div className="space-y-3 w-full">
            {filteredTeams.map(team => renderTeamCard(team))}
            {filteredTeams.length === 0 && (
              <div className="team-empty text-center text-zinc-400 text-xs italic py-4">No teams found in this category.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
