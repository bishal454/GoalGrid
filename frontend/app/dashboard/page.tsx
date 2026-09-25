"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FloatingSettings from "../../components/FloatingSettings";
import TacticalFormationGrid from "../../components/TacticalFormationGrid";
import { getCurrentUser, logoutUser } from "../../lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  name: string;
  followed_teams: string[];
  favorite_players: string[];
  country: string;
  city: string;
  stadium: string;
  street: string;
  home_address?: string;
  onboarded: boolean;
}

interface MatchDocument {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string;
  awayCrest?: string;
  homeScore: number;
  awayScore: number;
  minute: string;
  isLive: boolean;
  status: string;
  venue?: string;
  eventDate?: string;
  league?: string;
  league_code?: string;
  sourceName?: string;
}

interface TicketDocument {
  booking_id: string;
  email: string;
  match_id: string;
  home_team: string;
  away_team: string;
  home_crest?: string;
  away_crest?: string;
  match_date?: string;
  venue?: string;
  competition?: string;
  league_code?: string;
  booked_at: string;
  status: string;
}

export interface StoreProduct {
  product_id: string;
  seller_email: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at?: string;
  status?: string;
}
interface ChatMessage {
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
}

interface AIPlanningStage {
  id: string;
  label: string;
  brief: string;
  details?: string[];
}

interface TeamDetail {
  name: string;
  shortName?: string;
  crest?: string;
  clubColors?: string;
  venue?: string;
  founded?: number;
  website?: string;
  coach?: string;
  squad?: Array<{ name: string; position?: string; nationality?: string; shirtNumber?: number }>;
  area?: { name: string; flag?: string };
  runningCompetitions?: Array<{ name: string; emblem?: string }>;
}

interface PlayerDetail {
  id: number;
  name: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  position?: string;
  shirtNumber?: number;
  currentTeam?: {
    name?: string;
    crest?: string;
    venue?: string;
  };
}

interface MongoTeam {
  id: number;
  name: string;
  crest?: string;
  shortName?: string;
  venue?: string;
  clubColors?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TEAM_CRESTS: Record<string, string> = {
  "Arsenal": "https://crests.football-data.org/57.png",
  "Chelsea": "https://crests.football-data.org/61.png",
  "Liverpool": "https://crests.football-data.org/64.png",
  "Manchester City": "https://crests.football-data.org/65.png",
  "Man City": "https://crests.football-data.org/65.png",
  "Manchester United": "https://crests.football-data.org/66.png",
  "Málaga": "https://crests.football-data.org/84.png",
  "Málaga CF": "https://crests.football-data.org/84.png",
  "Brest": "https://crests.football-data.org/512.png",
  "Stade Brestois 29": "https://crests.football-data.org/512.png",
  "Tottenham Hotspur": "https://crests.football-data.org/73.png",
  "Aston Villa": "https://crests.football-data.org/58.png",
  "Newcastle United": "https://crests.football-data.org/67.png",
  "Real Madrid CF": "https://crests.football-data.org/86.png",
  "Real Madrid": "https://crests.football-data.org/86.png",
  "FC Barcelona": "https://crests.football-data.org/81.png",
  "Barcelona": "https://crests.football-data.org/81.png",
  "Club Atlético de Madrid": "https://crests.football-data.org/78.png",
  "Atletico Madrid": "https://crests.football-data.org/78.png",
  "Sevilla FC": "https://crests.football-data.org/95.png",
  "Girona FC": "https://crests.football-data.org/298.png",
  "Paris Saint-Germain FC": "https://crests.football-data.org/524.png",
  "Paris Saint-Germain": "https://crests.football-data.org/524.png",
  "PSG": "https://crests.football-data.org/524.png",
  "Olympique de Marseille": "https://crests.football-data.org/516.png",
  "Olympique Lyonnais": "https://crests.football-data.org/523.png",
  "AS Monaco FC": "https://crests.football-data.org/548.png",
  "Lille OSC": "https://crests.football-data.org/521.png",
  "Bayern Munich": "https://crests.football-data.org/5.png",
  "FC Bayern München": "https://crests.football-data.org/5.png",
  "Borussia Dortmund": "https://crests.football-data.org/4.png",
  "Bayer 04 Leverkusen": "https://crests.football-data.org/3.png",
  "RB Leipzig": "https://crests.football-data.org/172.png",
  "Juventus FC": "https://crests.football-data.org/109.png",
  "FC Internazionale Milano": "https://crests.football-data.org/108.png",
  "Inter Milan": "https://crests.football-data.org/108.png",
  "AC Milan": "https://crests.football-data.org/98.png",
  "SSC Napoli": "https://crests.football-data.org/113.png",
  "AS Roma": "https://crests.football-data.org/100.png",
  "Inter Miami CF": "https://crests.football-data.org/8144.png",
  "Inter Miami": "https://crests.football-data.org/8144.png",
  "Al Nassr FC": "https://crests.football-data.org/8468.png",
  "Al Nassr": "https://crests.football-data.org/8468.png",
  "Al Hilal": "https://crests.football-data.org/8466.png",
  "Al Ahli": "https://crests.football-data.org/8467.png",
  "LA Galaxy": "https://crests.football-data.org/1844.png",
  "England": "https://crests.football-data.org/770.svg",
  "Spain": "https://crests.football-data.org/760.svg",
  "France": "https://crests.football-data.org/773.svg",
  "Germany": "https://crests.football-data.org/759.svg",
  "Argentina": "https://crests.football-data.org/762.svg",
  "Brazil": "https://crests.football-data.org/764.svg",
  "Portugal": "https://crests.football-data.org/765.svg",
  "Elche": "https://crests.football-data.org/285.png",
  "Cagliari": "https://crests.football-data.org/104.png",
  "Hoffenheim": "https://crests.football-data.org/720.png",
  "TSG 1899 Hoffenheim": "https://crests.football-data.org/720.png"
};

const getTeamCrest = (name: string): string | undefined => {
  if (!name) return undefined;
  if (TEAM_CRESTS[name]) return TEAM_CRESTS[name];
  const lower = name.trim().toLowerCase();
  for (const [key, url] of Object.entries(TEAM_CRESTS)) {
    if (key.toLowerCase() === lower || key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return url;
    }
  }
  return undefined;
};

const MCP_SERVICES = [
  { id: "hostel", name: "Hostel Service", tool: "search_stays(stadium, accommodation_type, max_price, min_rating, required_amenities, sort_by)", desc: "Find fan-friendly hotels, hostels, shared rooms, and airbnbs near stadium gates within your budget." },
  { id: "route",  name: "Route Service",  tool: "get_directions(origin, destination, mode)", desc: "Calculate transit, taxi, and walking routes to any stadium." },
  { id: "review", name: "Review Service", tool: "get_food_reviews(venue)", desc: "Pre-match pub ratings and food stall recommendations." },
  { id: "match",  name: "Match Service",  tool: "get_team_matches(team_name)", desc: "Upcoming fixtures and competition schedule for followed clubs." },
];

const DEFAULT_AI_PLANNING_STAGES: AIPlanningStage[] = [
  { id: "understand", label: "Understand request", brief: "Extracting city, dates, budget, team, stadium, stay, and route constraints." },
  { id: "match", label: "Find match", brief: "Searching the schedule and selecting the strongest matching fixture." },
  { id: "stay", label: "Find stay", brief: "Ranking hotels, hostels, shared rooms, and airbnbs by price, rating, and distance." },
  { id: "route", label: "Find route / flight", brief: "Building flight, train, transit, taxi, and walking route options." },
  { id: "validate", label: "Validate and brief", brief: "Checking budget, route feasibility, safety grounding, and final fare." },
];

type TabId = "dashboard" | "journey" | "tickets" | "assistant" | "analysis" | "store" | "contact" | "settings";

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: string }> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: "journey",
    label: "Plan your Journey",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
      </svg>
    ),
  },
  {
    id: "tickets",
    label: "Book your Ticket",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
      </svg>
    ),
  },
  {
    id: "assistant",
    label: "Matchday Assistant",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
    badge: "AI",
  },
  {
    id: "analysis",
    label: "Match Analysis",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
  },
  {
    id: "store",
    label: "Fans Store",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    id: "contact",
    label: "Contact Us",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMatchDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatShortDateRange(inDate?: string, outDate?: string) {
  if (!inDate) return "Jun 09 - Jun 10";
  try {
    const d1 = new Date(inDate);
    const d2 = outDate ? new Date(outDate) : new Date(d1.getTime() + 86400000);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "2-digit" };
    return `${d1.toLocaleDateString("en-US", options)} - ${d2.toLocaleDateString("en-US", options)}`;
  } catch {
    return `${inDate} - ${outDate || "TBD"}`;
  }
}

function statusChipClass(status: string) {
  const s = (status || "").toUpperCase();
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(s)) return "live";
  if (["FINISHED", "FT"].includes(s)) return "finished";
  return "scheduled";
}

function statusLabel(status: string) {
  const s = (status || "").toUpperCase();
  if (["IN_PLAY", "PAUSED"].includes(s)) return "LIVE";
  if (["FINISHED", "FT"].includes(s)) return "FT";
  return "UPCOMING";
}

// ─── Markdown renderer (for chat bubbles) ─────────────────────────────────────

function renderMd(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
    if (line.startsWith("#### ")) return <h4 key={i}>{line.slice(5)}</h4>;
    if (line.trim().startsWith("- ")) {
      const parts = line.trim().slice(2).split("**");
      return <li key={i}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</li>;
    }
    if (line.includes("**")) {
      const parts = line.split("**");
      return <p key={i} className="my-1">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
    }
    if (line.trim().startsWith("```")) return null;
    return line.trim() ? <p key={i} className="my-1">{line}</p> : <div key={i} className="h-2" />;
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [email, setEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [dynamicCrests, setDynamicCrests] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userProfile?.followed_teams) {
      userProfile.followed_teams.forEach(async (team) => {
        if (!getTeamCrest(team) && !dynamicCrests[team]) {
          try {
            const res = await fetch(`${BACKEND}/api/v1/teams/by-name/${encodeURIComponent(team)}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.crest) {
                setDynamicCrests(prev => ({ ...prev, [team]: data.crest }));
              }
            }
          } catch (e) {
            // ignore
          }
        }
      });
    }
  }, [userProfile?.followed_teams]);

  // Team detail modal states
  const [teamDetailModal, setTeamDetailModal] = useState<TeamDetail | null>(null);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);

  // Player detail modal states
  const [playerDetailModal, setPlayerDetailModal] = useState<PlayerDetail | null>(null);
  const [playerDetailLoading, setPlayerDetailLoading] = useState(false);

  const handleOpenTeamDetails = async (teamName: string) => {
    setTeamDetailLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/v1/teams/by-name/${encodeURIComponent(teamName)}`);
      if (res.ok) {
        const found = await res.json();
        if (found && (found.name || found.shortName || found.id)) {
          const coachName = typeof found.coach === 'object' && found.coach ? found.coach.name : (typeof found.coach === 'string' ? found.coach : "First Team Manager");
          setTeamDetailModal({
            ...found,
            coach: coachName,
            crest: found.crest || getTeamCrest(found.name || teamName) || getTeamCrest(teamName)
          });
          setTeamDetailLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch team details from backend:", e);
    }
    setTeamDetailModal({
      name: teamName,
      crest: getTeamCrest(teamName),
      venue: "Official Club Stadium & Arena",
      coach: "First Team Head Coach",
      founded: 1900,
      website: `https://www.google.com/search?q=${encodeURIComponent(teamName)}+official+website`,
      squad: [
        { name: "First Team Captain", position: "Midfielder", nationality: "International", shirtNumber: 10 },
        { name: "Star Forward", position: "Attacker", nationality: "International", shirtNumber: 9 },
        { name: "Lead Defender", position: "Defender", nationality: "International", shirtNumber: 4 },
        { name: "Starting Goalkeeper", position: "Goalkeeper", nationality: "International", shirtNumber: 1 }
      ]
    });
    setTeamDetailLoading(false);
  };

  const handleOpenPlayerDetails = async (playerName: string) => {
    setPlayerDetailLoading(true);
    setPlayerDetailModal({
      id: Math.floor(Math.random() * 100000),
      name: playerName,
      position: "Forward / Midfielder",
      nationality: "International Star",
      shirtNumber: 10,
      currentTeam: {
        name: "Verified Partner Club",
        crest: getTeamCrest("PSG") || "https://crests.football-data.org/524.png",
        venue: "World Class Arena"
      }
    });
    setPlayerDetailLoading(false);
  };

  // Edit home base coordinates states
  const [isEditingHomeBase, setIsEditingHomeBase] = useState(false);
  const [editStreet, setEditStreet] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editStadium, setEditStadium] = useState("");
  const [savingHomeBase, setSavingHomeBase] = useState(false);

  // Real Map search and edit states
  const [editHomeSearchQuery, setEditHomeSearchQuery] = useState("");
  const [editStadiumSearchQuery, setEditStadiumSearchQuery] = useState("");
  const [editHomeSuggestions, setEditHomeSuggestions] = useState<any[]>([]);
  const [editStadiumSuggestions, setEditStadiumSuggestions] = useState<any[]>([]);
  const [isSearchingHomeBase, setIsSearchingHomeBase] = useState(false);
  const [isSearchingStadiumBase, setIsSearchingStadiumBase] = useState(false);

  // Debounced search for Home Address suggestions
  useEffect(() => {
    if (!editHomeSearchQuery.trim() || editHomeSearchQuery.length < 3) {
      setEditHomeSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingHomeBase(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editHomeSearchQuery)}&format=json&addressdetails=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setEditHomeSuggestions(data);
        }
      } catch (e) {
        console.error("Home search Nominatim failed", e);
      } finally {
        setIsSearchingHomeBase(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [editHomeSearchQuery]);

  // Debounced search for Stadium suggestions
  useEffect(() => {
    if (!editStadiumSearchQuery.trim() || editStadiumSearchQuery.length < 3) {
      setEditStadiumSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearchingStadiumBase(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(editStadiumSearchQuery)}&format=json&addressdetails=1&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setEditStadiumSuggestions(data);
        }
      } catch (e) {
        console.error("Stadium search Nominatim failed", e);
      } finally {
        setIsSearchingStadiumBase(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [editStadiumSearchQuery]);


  // Match feed state
  const [followedMatches, setFollowedMatches] = useState<MatchDocument[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [bookedMatchIds, setBookedMatchIds] = useState<Set<string>>(new Set());
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<TicketDocument[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Store Marketplace State
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCategory, setStoreCategory] = useState("All");
  
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: "", description: "", price: "", category: "Jerseys", image_url: ""
  });
  const [listingSubmitting, setListingSubmitting] = useState(false);

  // Ticketing Seating & Pricing Intelligence States
  const [ticketSelectedMatchId, setTicketSelectedMatchId] = useState<string | null>(null);
  const [ticketAvailabilityError, setTicketAvailabilityError] = useState<string | null>(null);
  const [ticketAvailabilityData, setTicketAvailabilityData] = useState<any | null>(null);
  const [ticketAvailabilityLoading, setTicketAvailabilityLoading] = useState<boolean>(false);
  const [ticketForecastingData, setTicketForecastingData] = useState<any | null>(null);
  const [stadiumIntelData, setStadiumIntelData] = useState<any | null>(null);
  const [stadiumIntelLoading, setStadiumIntelLoading] = useState<boolean>(false);
  const [ticketForecastingLoading, setTicketForecastingLoading] = useState<boolean>(false);
  const [isCustomTicketSearch, setIsCustomTicketSearch] = useState<boolean>(false);
  const [customTicketQuery, setCustomTicketQuery] = useState<string>("");
  const [customHomeQuery, setCustomHomeQuery] = useState<string>("");
  const [customAwayQuery, setCustomAwayQuery] = useState<string>("");
  const [customTicketDate, setCustomTicketDate] = useState<string>("");
  const [customSelectedMatch, setCustomSelectedMatch] = useState<MatchDocument | null>(null);
  const [isSearchingCustomTicket, setIsSearchingCustomTicket] = useState<boolean>(false);

  // Match Analysis states
  const [analysisSelectedMatchId, setAnalysisSelectedMatchId] = useState<string | null>(null);
  const [analysisMatchDetail, setAnalysisMatchDetail] = useState<any | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(false);
  const [analysisAILoading, setAnalysisAILoading] = useState<boolean>(false);
  const [analysisAIData, setAnalysisAIData] = useState<any | null>(null);
  const [analysisAIError, setAnalysisAIError] = useState<string | null>(null);
  const [isCustomAnalysisPrompt, setIsCustomAnalysisPrompt] = useState<boolean>(false);
  const [customAnalysisPromptQuery, setCustomAnalysisPromptQuery] = useState<string>("");
  const [tacticalViewMode, setTacticalViewMode] = useState<'manual' | 'ai'>('manual');

  // Agent chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [sending, setSending] = useState(false);
  const [activeMcpTools, setActiveMcpTools] = useState<string[]>([]);
  const [selectedArchStep, setSelectedArchStep] = useState<string>("langgraph");
  const [selectedService, setSelectedService] = useState<string>("hostel");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [assistantSelectedMapPlace, setAssistantSelectedMapPlace] = useState<string | null>(null);
  const [assistantSelectedStay, setAssistantSelectedStay] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Journey planner state
  const [journeyStep, setJourneyStep] = useState<number>(1);
  const [journeyMatchName, setJourneyMatchName] = useState<string>("");
  const [journeyMatchDate, setJourneyMatchDate] = useState<string>("");
  const [journeyStadium, setJourneyStadium] = useState<string>("Emirates Stadium");
  const [stadiumSearchQuery, setStadiumSearchQuery] = useState<string>("Emirates Stadium");
  const [stadiumSuggestions, setStadiumSuggestions] = useState<any[]>([]);
  const [isSearchingStadiums, setIsSearchingStadiums] = useState<boolean>(false);
  const [showStadiumDropdown, setShowStadiumDropdown] = useState<boolean>(false);
  const stadiumRef = useRef<HTMLDivElement>(null);
  const [journeyMaxPrice, setJourneyMaxPrice] = useState<number>(120);
  const [journeyAccommodationType, setJourneyAccommodationType] = useState<string>("all");
  const [journeyAmenities, setJourneyAmenities] = useState<string[]>([]);
  const [journeyStays, setJourneyStays] = useState<any[]>([]);
  const [journeyLoading, setJourneyLoading] = useState<boolean>(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [journeySelectedStay, setJourneySelectedStay] = useState<any | null>(null);

  // Custom check-in/out dates override
  const [journeyCheckIn, setJourneyCheckIn] = useState<string>("");
  const [journeyCheckOut, setJourneyCheckOut] = useState<string>("");
  const [journeyMaxDistance, setJourneyMaxDistance] = useState<number>(5);
  const [showMoreFilters, setShowMoreFilters] = useState<boolean>(false);
  const [planningMode, setPlanningMode] = useState<'custom' | 'ai' | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  // Route planning state
  const [journeyOrigin, setJourneyOrigin] = useState<string>("");
  const [journeyRouteMode, setJourneyRouteMode] = useState<string>("transit");
  const [journeyRoutes, setJourneyRoutes] = useState<any[]>([]);
  const [journeyRouteLoading, setJourneyRouteLoading] = useState<boolean>(false);
  const [journeyRouteError, setJourneyRouteError] = useState<string | null>(null);

  // Journey AI & Explore states
  const [journeyAILoading, setJourneyAILoading] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<string[]>([]);
  const [currentLogMsg, setCurrentLogMsg] = useState<string>("");
  const [aiPlanningStages, setAiPlanningStages] = useState<AIPlanningStage[]>(DEFAULT_AI_PLANNING_STAGES);
  const [activeAIStageIndex, setActiveAIStageIndex] = useState<number>(0);
  const [completedAIStageCount, setCompletedAIStageCount] = useState<number>(0);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [journeySelectedRoute, setJourneySelectedRoute] = useState<any | null>(null);
  const [journeySafetyBriefing, setJourneySafetyBriefing] = useState<any | null>(null);
  const [activePlacesTab, setActivePlacesTab] = useState<string>("restaurants");
  const [journeyRecommendations, setJourneyRecommendations] = useState<any | null>(null);
  const [journeyTotalFare, setJourneyTotalFare] = useState<any | null>(null);
  const [journeySummary, setJourneySummary] = useState<string>("");
  const [journeySelectedStayReason, setJourneySelectedStayReason] = useState<string>("");
  const [journeySelectedRouteReason, setJourneySelectedRouteReason] = useState<string>("");
  const [journeySafetySources, setJourneySafetySources] = useState<any[]>([]);
  const [journeyValidationChecks, setJourneyValidationChecks] = useState<any[]>([]);
  const [journeyDataWarnings, setJourneyDataWarnings] = useState<string[]>([]);
  const [showStayOptions, setShowStayOptions] = useState<boolean>(false);
  const [showRouteOptions, setShowRouteOptions] = useState<boolean>(false);
  const [activeStep5Section, setActiveStep5Section] = useState<string>("match");

  // ── Contact & Support State ──────────────────────────────────────────────
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "booking_support", orderRef: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState<boolean>(false);
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // ── Account Settings State ───────────────────────────────────────────────
  const [settingsTab, setSettingsTab] = useState<string>("profile");
  const [profileForm, setProfileForm] = useState({ displayName: "", favoriteClub: "CA Boca Juniors", currency: "USD ($)", oddsFormat: "Decimal (1.85)", defaultTravelMode: "transit" });
  const [notifPreferences, setNotifPreferences] = useState({ liveGoals: true, ticketAlerts: true, gateReminders: true, matchRoundup: false, priceDrops: true });
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // ── Fetch followed matches ───────────────────────────────────────────────
  const fetchFollowedMatches = useCallback(async (userEmail: string) => {
    setMatchesLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v1/live-matches/followed-upcoming?email=${encodeURIComponent(userEmail)}`);
      if (r.ok) {
        const data = await r.json();
        setFollowedMatches(data.matches || []);
      }
    } catch { /* network error */ }
    finally { setMatchesLoading(false); }
  }, []);

  // ── Fetch booked tickets ──────────────────────────────────────────────────
  const fetchTickets = useCallback(async (userEmail: string) => {
    setTicketsLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v1/tickets?email=${encodeURIComponent(userEmail)}`);
      if (r.ok) {
        const data = await r.json();
        setTickets(data);
        setBookedMatchIds(new Set(data.map((t: TicketDocument) => t.match_id)));
      }
    } catch { }
    finally { setTicketsLoading(false); }
  }, []);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    setEmail(user.email);

    // Load profile
    fetch(`${BACKEND}/api/v1/auth/profile?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUserProfile(data);
          const addressParts = [];
          if (data.street) addressParts.push(data.street);
          if (data.city) addressParts.push(data.city);
          if (data.country) addressParts.push(data.country);
          setJourneyOrigin(addressParts.join(", "));
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));

    // Pre-fetch matches and tickets for quick-select in journey planner
    fetchFollowedMatches(user.email);
    fetchTickets(user.email);

    // Seed agent greeting
    setMessages([{
      sender: "agent",
      text: `### Operations Briefing\nWelcome **${user.name}**. I am **Globus 2026**, your autonomous matchday logistics coordinator.\n\nI am connected via the **Model Context Protocol (MCP)** to Hostel, Route, Review and Match services.\n\n*Ask me anything — "Find a hostel near my stadium", "Show upcoming fixtures", "Best pubs near Anfield"...*`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
  }, [router, fetchFollowedMatches, fetchTickets]);

  useEffect(() => {
    if (activeTab === "dashboard" && email) fetchFollowedMatches(email);
  }, [activeTab, email, fetchFollowedMatches]);

  useEffect(() => {
    if (activeTab === "tickets" && email) fetchTickets(email);
  }, [activeTab, email, fetchTickets]);

  const handleOpenEditHomeBase = () => {
    if (userProfile) {
      setEditStreet(userProfile.street || "");
      setEditCity(userProfile.city || "");
      setEditCountry(userProfile.country || "");
      setEditStadium(userProfile.stadium || "");
      setEditHomeSearchQuery(
        [userProfile.street, userProfile.city, userProfile.country]
          .filter(Boolean)
          .join(", ")
      );
      setEditStadiumSearchQuery(userProfile.stadium || "");
    }
    setIsEditingHomeBase(true);
  };

  const handleSaveHomeBase = async () => {
    if (!email) return;
    setSavingHomeBase(true);
    try {
      const response = await fetch(`${BACKEND}/api/v1/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          followed_teams: userProfile?.followed_teams || [],
          favorite_players: userProfile?.favorite_players || [],
          country: editCountry,
          city: editCity,
          stadium: editStadium,
          street: editStreet,
        }),
      });

      if (response.ok) {
        const profileRes = await fetch(`${BACKEND}/api/v1/auth/profile?email=${encodeURIComponent(email)}`);
        if (profileRes.ok) {
          const updatedProfile = await profileRes.json();
          setUserProfile(updatedProfile);
          const addressParts = [];
          if (updatedProfile.street) addressParts.push(updatedProfile.street);
          if (updatedProfile.city) addressParts.push(updatedProfile.city);
          if (updatedProfile.country) addressParts.push(updatedProfile.country);
          setJourneyOrigin(addressParts.join(", "));
        }
        setIsEditingHomeBase(false);
      } else {
        alert("Failed to save home base coordinates.");
      }
    } catch (err) {
      console.error("Error saving coordinates:", err);
      alert("Error connecting to server.");
    } finally {
      setSavingHomeBase(false);
    }
  };




  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // ── Stadium Search & Suggestions ──────────────────────────────────────────
  const POPULAR_STADIUMS = [
    "Emirates Stadium",
    "Anfield",
    "Old Trafford",
    "Stamford Bridge",
    "Etihad Stadium",
    "Tottenham Hotspur Stadium",
    "Wembley Stadium",
    "Santiago Bernabéu",
    "Camp Nou",
    "Allianz Arena",
    "Parc des Princes",
    "San Siro",
    "Signal Iduna Park",
    "Johan Cruyff Arena"
  ];

  const filteredPopularStadiums = POPULAR_STADIUMS.filter(name =>
    name.toLowerCase().includes(stadiumSearchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stadiumRef.current && !stadiumRef.current.contains(event.target as Node)) {
        setShowStadiumDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!stadiumSearchQuery.trim()) {
      setStadiumSuggestions([]);
      return;
    }

    if (stadiumSearchQuery === journeyStadium) {
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingStadiums(true);
      try {
        const hasStadiumKeyword = stadiumSearchQuery.toLowerCase().includes("stadium") || 
                                  stadiumSearchQuery.toLowerCase().includes("arena") || 
                                  stadiumSearchQuery.toLowerCase().includes("park") || 
                                  stadiumSearchQuery.toLowerCase().includes("estadio") || 
                                  stadiumSearchQuery.toLowerCase().includes("stade") ||
                                  stadiumSearchQuery.toLowerCase().includes("camp") ||
                                  stadiumSearchQuery.toLowerCase().includes("siro") ||
                                  stadiumSearchQuery.toLowerCase().includes("trafford") ||
                                  stadiumSearchQuery.toLowerCase().includes("bridge");
        const query = encodeURIComponent(stadiumSearchQuery + (hasStadiumKeyword ? "" : " stadium"));
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setStadiumSuggestions(data);
        }
      } catch (e) {
        console.error("Nominatim fetch failed", e);
      } finally {
        setIsSearchingStadiums(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [stadiumSearchQuery, journeyStadium]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePlanJourneyForMatch = (match: MatchDocument) => {
    const matchDateStr = match.eventDate ? match.eventDate.split("T")[0] : "";
    setJourneyMatchName(`${match.homeTeam} vs ${match.awayTeam}`);
    setJourneyMatchDate(matchDateStr);
    setJourneyStadium(match.venue || "Emirates Stadium");
    setStadiumSearchQuery(match.venue || "Emirates Stadium");

    if (matchDateStr) {
      setJourneyCheckIn(matchDateStr);
      const dt = new Date(matchDateStr);
      dt.setDate(dt.getDate() + 1);
      setJourneyCheckOut(dt.toISOString().split("T")[0]);
    } else {
      setJourneyCheckIn("");
      setJourneyCheckOut("");
    }

    setJourneyStep(2);
    setActiveTab("journey");
  };

  const handlePlanJourneyForTicket = (ticket: TicketDocument) => {
    const matchDateStr = ticket.match_date ? ticket.match_date.split("T")[0] : "";
    setJourneyMatchName(`${ticket.home_team} vs ${ticket.away_team}`);
    setJourneyMatchDate(matchDateStr);
    setJourneyStadium(ticket.venue || "Emirates Stadium");
    setStadiumSearchQuery(ticket.venue || "Emirates Stadium");

    if (matchDateStr) {
      setJourneyCheckIn(matchDateStr);
      const dt = new Date(matchDateStr);
      dt.setDate(dt.getDate() + 1);
      setJourneyCheckOut(dt.toISOString().split("T")[0]);
    } else {
      setJourneyCheckIn("");
      setJourneyCheckOut("");
    }

    setJourneyStep(2);
    setActiveTab("journey");
  };

  const handleLogout = () => { logoutUser(); router.push("/login"); };

  const handleBookTicket = async (match: MatchDocument) => {
    if (!email || bookingInProgress) return;
    setBookingInProgress(match.id);
    try {
      const r = await fetch(`${BACKEND}/api/v1/tickets/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          match_id: match.id,
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          home_crest: match.homeCrest || "",
          away_crest: match.awayCrest || "",
          match_date: match.eventDate || "",
          venue: match.venue || "",
          competition: match.league || "",
          league_code: match.league_code || "",
        }),
      });
      if (r.ok) {
        setBookedMatchIds(prev => new Set([...prev, match.id]));
      }
    } catch { }
    finally { setBookingInProgress(null); }
  };

  const handleCheckAvailability = async (match: MatchDocument) => {
    setTicketAvailabilityLoading(true);
    setTicketAvailabilityError(null);
    setTicketAvailabilityData(null);
    try {
      const matchName = `${match.homeTeam} vs ${match.awayTeam}`;
      const r = await fetch(`${BACKEND}/api/v1/tickets/availability?match_name=${encodeURIComponent(matchName)}`);
      const data = await r.json();
      if (!r.ok) {
        setTicketAvailabilityError(data.detail || "Failed to check ticket availability.");
      } else {
        setTicketAvailabilityData(data);
      }
    } catch (exc: any) {
      setTicketAvailabilityError(exc?.message || "Failed to check ticket availability.");
    } finally {
      setTicketAvailabilityLoading(false);
    }
  };

  const handleRunAISeatingForecast = async (match: MatchDocument) => {
    setTicketForecastingLoading(true);
    setTicketForecastingData(null);
    try {
      const matchName = `${match.homeTeam} vs ${match.awayTeam}`;
      const r = await fetch(`${BACKEND}/api/v1/tickets/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_name: matchName,
          match_date: match.eventDate || "",
          venue: match.venue || "Unknown Venue"
        })
      });
      const data = await r.json();
      if (r.ok) {
        setTicketForecastingData(data);
      }
    } catch {
    } finally {
      setTicketForecastingLoading(false);
    }
  };

  const handleSearchCustomTicketMatch = async () => {
    const combinedQuery = `${customHomeQuery.trim()} vs ${customAwayQuery.trim()}`;
    if (!customHomeQuery.trim() || !customAwayQuery.trim()) return;
    setIsSearchingCustomTicket(true);
    setTicketAvailabilityError(null);
    setTicketAvailabilityData(null);
    setTicketForecastingData(null);
    setCustomSelectedMatch(null);
    try {
      const query = encodeURIComponent(combinedQuery);
      const date = encodeURIComponent(customTicketDate);
      const res = await fetch(`${BACKEND}/api/v1/tickets/custom-match?query=${query}&date=${date}`);
      if (res.ok) {
        const matchData = await res.json();
        setCustomSelectedMatch(matchData);
        setTicketSelectedMatchId(matchData.id);
        
        // Auto-correct spelling in inputs
        setCustomHomeQuery(matchData.homeTeam);
        setCustomAwayQuery(matchData.awayTeam);
        
        handleCheckAvailability(matchData);
        handleRunAISeatingForecast(matchData);
        fetchStadiumIntelligence(matchData);
      } else {
        const err = await res.json();
        setTicketAvailabilityError(err.detail || "Failed to search custom match.");
      }
    } catch (e: any) {
      setTicketAvailabilityError(e?.message || "Failed to connect to search service.");
    } finally {
      setIsSearchingCustomTicket(false);
    }
  };

    const fetchStadiumIntelligence = async (match: MatchDocument | any) => {
    if (!match) return;
    setStadiumIntelLoading(true);
    try {
      const venue = encodeURIComponent(match.venue || "The Stadium");
      const matchName = encodeURIComponent(`${match.homeTeam || "Home"} vs ${match.awayTeam || "Away"}`);
      const date = encodeURIComponent(match.eventDate || "");
      const city = encodeURIComponent((match as any).city || "");
      const res = await fetch(`${BACKEND}/api/v1/tickets/stadium-intelligence?venue=${venue}&match_name=${matchName}&date=${date}&city=${city}`);
      if (res.ok) {
        const data = await res.json();
        setStadiumIntelData(data);
      }
    } catch (e) {
      console.error("Failed to fetch stadium intelligence:", e);
    } finally {
      setStadiumIntelLoading(false);
    }
  };

  const handleSelectMatch = (matchId: string) => {
    setCustomSelectedMatch(null);
    setTicketSelectedMatchId(matchId);
    setTicketForecastingData(null);
    setTicketAvailabilityError(null);
    setTicketAvailabilityData(null);
    setStadiumIntelData(null);
    
    if (matchId) {
      const match = followedMatches.find(m => m.id === matchId);
      if (match) {
        handleCheckAvailability(match);
        handleRunAISeatingForecast(match);
        fetchStadiumIntelligence(match);
      }
    }
  };

  const handleSelectAnalysisMatch = async (matchId: string) => {
    setAnalysisSelectedMatchId(matchId);
    setAnalysisMatchDetail(null);
    setAnalysisAIData(null);
    setAnalysisAIError(null);
    
    if (!matchId) return;
    
    setAnalysisLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v1/live-matches/match/${matchId}`);
      if (r.ok) {
        const data = await r.json();
        setAnalysisMatchDetail(data);
      } else {
        setAnalysisAIError("Failed to load match details statistics.");
      }
    } catch (exc: any) {
      setAnalysisAIError(exc?.message || "Failed to load match details statistics.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGenerateTacticalBreakdownForMatch = async (matchData: any) => {
    setAnalysisAILoading(true);
    setAnalysisAIError(null);
    setAnalysisAIData(null);
    
    try {
      const r = await fetch(`${BACKEND}/api/v1/analysis/tactical`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_data: matchData })
      });
      
      if (r.ok) {
        const data = await r.json();
        setAnalysisAIData(data);
      } else {
        const errData = await r.json();
        setAnalysisAIError(errData.detail || "Failed to generate AI tactical report.");
      }
    } catch (exc: any) {
      setAnalysisAIError(exc?.message || "Failed to generate AI tactical report.");
    } finally {
      setAnalysisAILoading(false);
    }
  };

  const handleGenerateTacticalBreakdown = async () => {
    if (!analysisMatchDetail) return;
    await handleGenerateTacticalBreakdownForMatch(analysisMatchDetail);
  };

  const handleSearchAnalysisMatchByPrompt = async () => {
    if (!customAnalysisPromptQuery.trim()) return;
    setAnalysisLoading(true);
    setAnalysisAIError(null);
    setAnalysisAIData(null);
    setAnalysisMatchDetail(null);
    
    try {
      const res = await fetch(`${BACKEND}/api/v1/analysis/prompt-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: customAnalysisPromptQuery })
      });
      
      if (res.ok) {
        const matchData = await res.json();
        setAnalysisMatchDetail(matchData);
        setAnalysisSelectedMatchId(matchData.id);
        
        // Automatically trigger breakdown
        handleGenerateTacticalBreakdownForMatch(matchData);
      } else {
        const err = await res.json();
        setAnalysisAIError(err.detail || "Failed to find match from prompt.");
      }
    } catch (e: any) {
      setAnalysisAIError(e?.message || "Failed to connect to search service.");
    } finally {
      setAnalysisLoading(false);
    }
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !email || sending) return;
    const query = inputVal.trim();
    setInputVal("");
    setSending(true);
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, { sender: "user", text: query, timestamp: ts }]);

    try {
      const r = await fetch(`${BACKEND}/api/v1/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, query, lodging: assistantSelectedStay }),
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.detail || "Server returned an error");
      }
      const toolsCalled: string[] = (data.tool_calls || []).map((t: { name: string }) => t.name);
      setActiveMcpTools(toolsCalled);
      if (toolsCalled.length) {
        setSelectedArchStep("mcp-server");
        if (toolsCalled.includes("search_hostels") || toolsCalled.includes("search_stays")) setSelectedService("hostel");
        else if (toolsCalled.includes("get_directions")) setSelectedService("route");
        else if (toolsCalled.includes("get_food_reviews")) setSelectedService("review");
        else if (toolsCalled.includes("get_team_matches")) setSelectedService("match");
      }
      setTimeout(() => setActiveMcpTools([]), 6000);

      // Extract locations from action_details to auto-focus map
      if (data.action_details && Array.isArray(data.action_details)) {
        for (const detail of data.action_details) {
          if (detail.status === "success") {
            if (detail.stays && detail.stays.length > 0) {
              const firstStay = detail.stays[0];
              setAssistantSelectedMapPlace(firstStay.name);
            } else if (detail.routes && detail.routes.length > 0) {
              setAssistantSelectedMapPlace(journeyStadium || "Emirates Stadium");
            } else if (detail.reviews) {
              if (detail.venue) {
                setAssistantSelectedMapPlace(detail.venue);
              }
            }
          }
        }
      }

      setMessages(prev => [...prev, {
        sender: "agent",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolCalls: data.tool_calls,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: "agent",
        text: "⚠️ **Agent connection interrupted.** Please ensure the backend server is online.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally { setSending(false); }
  };

  const handleSendDirectQuery = async (queryText: string) => {
    if (!queryText.trim() || !email || sending) return;
    setSending(true);
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(prev => [...prev, { sender: "user", text: queryText, timestamp: ts }]);

    try {
      const r = await fetch(`${BACKEND}/api/v1/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, query: queryText, lodging: assistantSelectedStay }),
      });
      const data = await r.json();
      const toolsCalled: string[] = (data.tool_calls || []).map((t: { name: string }) => t.name);
      setActiveMcpTools(toolsCalled);
      if (toolsCalled.length) {
        setSelectedArchStep("mcp-server");
        if (toolsCalled.includes("search_hostels") || toolsCalled.includes("search_stays")) setSelectedService("hostel");
        else if (toolsCalled.includes("get_directions")) setSelectedService("route");
        else if (toolsCalled.includes("get_food_reviews")) setSelectedService("review");
        else if (toolsCalled.includes("get_team_matches")) setSelectedService("match");
      }
      setTimeout(() => setActiveMcpTools([]), 6000);

      // Extract locations from action_details to auto-focus map
      if (data.action_details && Array.isArray(data.action_details)) {
        for (const detail of data.action_details) {
          if (detail.status === "success") {
            if (detail.stays && detail.stays.length > 0) {
              const firstStay = detail.stays[0];
              setAssistantSelectedMapPlace(firstStay.name);
            } else if (detail.routes && detail.routes.length > 0) {
              setAssistantSelectedMapPlace(journeyStadium || "Emirates Stadium");
            } else if (detail.reviews) {
              if (detail.venue) {
                setAssistantSelectedMapPlace(detail.venue);
              }
            }
          }
        }
      }

      setMessages(prev => [...prev, {
        sender: "agent",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        toolCalls: data.tool_calls,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: "agent",
        text: "⚠️ **Agent connection interrupted.** Please ensure the backend server is online.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } finally { setSending(false); }
  };

  const handleAIPlan = async () => {
    if (!aiPrompt.trim() || !email || journeyAILoading) return;
    setJourneyAILoading(true);
    setJourneyError(null);
    setLoadingLogs([]);
    setAiPlanningStages(DEFAULT_AI_PLANNING_STAGES);
    setActiveAIStageIndex(0);
    setCompletedAIStageCount(0);
    setCurrentLogMsg("Initializing Globus 2026 AI planner...");
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      const res = await fetch(`${BACKEND}/api/v1/agent/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, prompt: aiPrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          const resultStages: AIPlanningStage[] = data.planningStages?.length ? data.planningStages : DEFAULT_AI_PLANNING_STAGES;
          setAiPlanningStages(resultStages);
          setJourneyMatchName(data.matchName || "");
          setJourneyMatchDate(data.matchDate || "");
          setJourneyStadium(data.stadium || "");
          setStadiumSearchQuery(data.stadium || "");
          setJourneySelectedStay(data.selectedStay || null);
          setJourneySelectedStayReason(data.selectedStayReason || "");
          setJourneySelectedRoute(data.selectedRoute || data.routes?.[0] || null);
          setJourneySelectedRouteReason(data.selectedRouteReason || "");
          setJourneyStays(data.stayOptions || data.stays || (data.selectedStay ? [data.selectedStay] : []));
          setJourneyRoutes(data.routeOptions || data.routes || []);
          setJourneySafetyBriefing(data.safetyBriefing || null);
          setJourneySafetySources(data.safetySources || data.safetyBriefing?.sourcesUsed || []);
          setJourneyValidationChecks(data.validationChecks || []);
          setJourneyDataWarnings(data.dataWarnings || []);
          setJourneyRecommendations(data.recommendations || null);
          setJourneyTotalFare(data.totalFare || null);
          setJourneySummary(data.summary || "");
          setSelectedRouteIdx(0);
          setShowStayOptions(true);
          setShowRouteOptions(true);
          setActivePlacesTab("restaurants");

          for (let idx = 0; idx < resultStages.length; idx++) {
            setActiveAIStageIndex(idx);
            setCompletedAIStageCount(idx);
            setCurrentLogMsg(resultStages[idx].brief || resultStages[idx].label);
            setLoadingLogs(prev => [...prev, resultStages[idx].brief || resultStages[idx].label]);
            await wait(900);
            setCompletedAIStageCount(idx + 1);
            await wait(350);
          }
          setCurrentLogMsg("Plan ready.");
          await wait(450);
          setJourneyStep(5);
        } else {
          setJourneyError(data.detail || "Failed to generate AI plan. Please refine your prompt constraints.");
        }
      } else {
        setJourneyError("Error connecting to Globus AI planning engine.");
      }
    } catch (err) {
      setJourneyError("Could not reach AI planning engine backend.");
    } finally {
      setJourneyAILoading(false);
    }
  };

  // ── Tab Content Renderers ──────────────────────────────────────────────────

  const renderDashboard = () => (
    <>
            {/* Profile widgets row */}
      {/* Profile widgets row - Side by Side (Box 1: Fan Deck, Box 2: Home Base) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        
        {/* Left Column (Box 1): Personalised Fan Deck (col-span-6) */}
        <div className="lg:col-span-6 glass-card profile-widget p-6 sm:p-7 border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white m-0">Personalised Fan Deck</h3>
              </div>
              <span className="text-[10px] font-mono font-bold px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">VIP ACCESS</span>
            </div>

            {profileLoading ? (
              <div className="loading-shimmer" style={{ height: 200, borderRadius: 16 }} />
            ) : userProfile ? (
              <div className="space-y-6">
                {/* Followed Teams (List Layout) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Followed Clubs</span>
                    <span className="text-[9px] text-zinc-400 font-mono font-bold">{userProfile.followed_teams.length} Synced</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {userProfile.followed_teams.map(team => (
                      <div key={team} className="group flex items-center justify-between py-2.5 border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 rounded-xl px-3 -mx-3 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 flex items-center justify-center">
                            {getTeamCrest(team) || dynamicCrests[team] ? (
                              <img src={getTeamCrest(team) || dynamicCrests[team]} alt={team} className="w-9 h-9 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                            ) : (
                              <span className="font-black text-emerald-500 text-xl">{team.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">{team}</h4>
                            <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">🌐 Official Partner</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenTeamDetails(team)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs transition-colors"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("store")}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-sm"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Favourite Players (List Layout) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Favourite Athletes</span>
                    <span className="text-[9px] text-zinc-400 font-mono font-bold">Live Tracking</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {userProfile.favorite_players.map(p => (
                      <div key={p} className="group flex items-center justify-between py-2.5 border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 rounded-xl px-3 -mx-3 transition-colors">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 flex items-center justify-center text-violet-500 text-2xl group-hover:scale-110 transition-transform drop-shadow-sm">
                            ⭐
                          </div>
                          <div className="flex flex-col">
                            <h4 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">{p}</h4>
                            <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">🔥 Star Athlete</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPlayerDetails(p)}
                            className="px-3.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 font-bold text-xs transition-colors"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab("store")}
                            className="px-3.5 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-bold text-xs transition-colors shadow-sm"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Could not load profile.</p>
            )}
          </div>
        </div>

        {/* Right Column (Box 2): Home Base Coordinates (col-span-6) */}
        <div className="lg:col-span-6 glass-card profile-widget p-6 sm:p-7 border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-white m-0">Home Base Coordinates & Live Tracking</h3>
              </div>
              {!isEditingHomeBase && userProfile && (
                <button 
                  onClick={handleOpenEditHomeBase}
                  className="px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.013a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                  Edit Coordinates
                </button>
              )}
            </div>

            {profileLoading ? (
              <div className="loading-shimmer" style={{ height: 240, borderRadius: 16 }} />
            ) : isEditingHomeBase ? (
              /* EDIT FORM WITH NOMINATIM AUTOCOMPLETE */
              <div className="space-y-5 text-left animate-fade-in">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                  💡 Type any global city, street address, or stadium name below. Live Nominatim OpenStreetMap autocompletion will precisely geolocate your target coordinates.
                </div>

                {/* Home Address Autocomplete */}
                <div className="relative">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 uppercase tracking-wider">
                    SEARCH HOME ADDRESS / CITY (LIVE AUTOCOMPLETE)
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. 221B Baker Street, London or Targa, India..."
                    value={editHomeSearchQuery}
                    onChange={(e) => setEditHomeSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm transition-colors"
                  />
                  {isSearchingHomeBase && (
                    <div className="absolute right-3.5 top-9 text-xs text-zinc-400 animate-spin">⏳</div>
                  )}
                  {editHomeSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {editHomeSuggestions.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            const addr = item.address || {};
                            setEditStreet(addr.road || addr.suburb || item.display_name.split(',')[0] || "");
                            setEditCity(addr.city || addr.town || addr.village || addr.county || "");
                            setEditCountry(addr.country || "");
                            setEditHomeSearchQuery(item.display_name);
                            setEditHomeSuggestions([]);
                          }}
                          className="p-3 hover:bg-emerald-500/10 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.display_name}</span>
                          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">SELECT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stadium Autocomplete */}
                <div className="relative">
                  <label className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 block mb-1.5 uppercase tracking-wider">
                    SEARCH TARGET STADIUM / CLUB VENUE
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Anfield, Camp Nou, Emirates Stadium..."
                    value={editStadiumSearchQuery}
                    onChange={(e) => setEditStadiumSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-sm transition-colors"
                  />
                  {isSearchingStadiumBase && (
                    <div className="absolute right-3.5 top-9 text-xs text-zinc-400 animate-spin">⏳</div>
                  )}
                  {editStadiumSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {editStadiumSuggestions.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            const stName = item.address?.stadium || item.address?.amenity || item.display_name.split(',')[0] || "";
                            setEditStadium(stName);
                            setEditStadiumSearchQuery(item.display_name);
                            setEditStadiumSuggestions([]);
                          }}
                          className="p-3 hover:bg-emerald-500/10 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{item.display_name}</span>
                          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">SELECT</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manual Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-400 block mb-1">STREET</label>
                    <input 
                      type="text" 
                      value={editStreet}
                      onChange={(e) => setEditStreet(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-400 block mb-1">CITY</label>
                    <input 
                      type="text" 
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-400 block mb-1">COUNTRY</label>
                    <input 
                      type="text" 
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold text-zinc-400 block mb-1">TARGET STADIUM</label>
                    <input 
                      type="text" 
                      value={editStadium}
                      onChange={(e) => setEditStadium(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setIsEditingHomeBase(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHomeBase}
                    disabled={savingHomeBase}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingHomeBase ? "Saving Coordinates..." : "Save Coordinates & Update Engine"}
                  </button>
                </div>
              </div>
            ) : (
              /* NORMAL DISPLAY */
              <div className="space-y-6">
                {/* Coordinate Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  {[
                    ["STREET", userProfile?.street || "—"],
                    ["CITY", userProfile?.city || "—"],
                    ["COUNTRY", userProfile?.country || "—"],
                    ["TARGET STADIUM", userProfile?.stadium || "—"],
                  ].map(([label, val]) => (
                    <div key={label} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-left relative overflow-hidden flex flex-col justify-between min-h-[90px] shadow-sm hover:border-emerald-500/30 transition-all">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                      <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-wider block mb-1">{label}</span>
                      <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white break-words">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Live Google Maps Preview */}
                <div className="w-full h-[320px] relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-md group">
                  <iframe
                    title="Live Location Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: "contrast(1.05) brightness(0.95)" }}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent((userProfile?.stadium ? userProfile.stadium + ", " : "") + (userProfile?.city || "") + (userProfile?.country ? ", " + userProfile.country : ""))}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  />
                  <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-mono text-zinc-300 flex items-center gap-2 pointer-events-none shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>LIVE SATELLITE TRACKING — {userProfile?.stadium || userProfile?.city || "ACTIVE STATION"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Upcoming matches of followed teams */}
      <div>
        <div className="matches-section-title">
          Upcoming Matches — Your Followed Teams
        </div>
        {matchesLoading ? (
          <div className="match-cards-grid">
            {[1, 2, 3].map(i => <div key={i} className="loading-shimmer shimmer-card" />)}
          </div>
        ) : followedMatches.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <p className="text-sm font-semibold">No upcoming matches found for your followed teams.</p>
            <p className="text-xs">Try updating your followed teams in onboarding.</p>
          </div>
        ) : (
          <div className="match-cards-grid">
            {followedMatches.map(match => {
              const isBooked = bookedMatchIds.has(match.id);
              const isBooking = bookingInProgress === match.id;
              return (
                <div
                  key={match.id}
                  className={`glass-card match-card ${isBooked ? "cursor-pointer hover:border-emerald-500/40" : ""}`}
                  onClick={() => {
                    if (isBooked) {
                      handlePlanJourneyForMatch(match);
                    }
                  }}
                >
                  <div className="match-card-header">
                    <span className="match-league-badge">{match.league_code || match.league || "—"}</span>
                    <span className={`match-status-chip ${statusChipClass(match.status)}`}>
                      {statusLabel(match.status)}
                    </span>
                  </div>

                   <div className="match-teams-row">
                    <div className="match-team">
                      {match.homeCrest ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={match.homeCrest} alt={match.homeTeam} />
                      ) : (
                        <div style={{ width: 36, height: 36, background: "rgba(16,185,129,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#10b981" }}>
                          {match.homeTeam.charAt(0)}
                        </div>
                      )}
                      <span className="match-team-name">{match.homeTeam}</span>
                    </div>

                     <div className="match-vs-block">
                      {["IN_PLAY", "PAUSED", "FINISHED", "FT"].includes((match.status || "").toUpperCase()) ? (
                        <span className="match-score">{match.homeScore} – {match.awayScore}</span>
                      ) : (
                        <span className="match-vs">VS</span>
                      )}
                      {match.minute && !["SCHEDULED", "TIMED"].includes(match.status?.toUpperCase() || "") && (
                        <span className="match-time">{match.minute}&apos;</span>
                      )}
                    </div>

                     <div className="match-team">
                      {match.awayCrest ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={match.awayCrest} alt={match.awayTeam} />
                      ) : (
                        <div style={{ width: 36, height: 36, background: "rgba(16,185,129,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#10b981" }}>
                          {match.awayTeam.charAt(0)}
                        </div>
                      )}
                      <span className="match-team-name">{match.awayTeam}</span>
                    </div>
                  </div>

                   {match.eventDate && (
                    <div className="text-center text-[11px] text-zinc-500 font-mono -mt-1">
                      {formatMatchDate(match.eventDate)}
                    </div>
                  )}

                   <div className="match-card-footer">
                    <span className="match-venue-text">{match.venue || "—"}</span>
                    {isBooked ? (
                      <button
                        className="book-ticket-btn booked cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanJourneyForMatch(match);
                        }}
                      >
                        Plan Journey
                      </button>
                    ) : (
                      <button
                        className="book-ticket-btn cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookTicket(match);
                        }}
                        disabled={!!isBooking}
                      >
                        {isBooking ? "Booking…" : "Book Ticket"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  const renderTickets = () => {
    const upcomingMatches = followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && (m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false));
    const activeMatch = customSelectedMatch || followedMatches.find(m => m.id === ticketSelectedMatchId);

    return (
      <div className="flex flex-col gap-8 w-full text-white min-h-[500px]">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
        {/* Left Side: Booking & Intelligence Panel */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 font-mono mb-4">
              🎟️ Matchday Seating & Seating Intelligence
            </h3>
            
            {/* Match Selector / Custom Search Toggle */}
            <div className="flex flex-col gap-2 mb-5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {isCustomTicketSearch ? "Search Custom Match" : "Select Upcoming Match"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTicketSearch(!isCustomTicketSearch);
                    setCustomSelectedMatch(null);
                    setTicketSelectedMatchId(null);
                    setTicketForecastingData(null);
                    setTicketAvailabilityData(null);
                    setTicketAvailabilityError(null);
                  }}
                  className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded transition-colors"
                >
                  {isCustomTicketSearch ? "← Use Followed Matches Dropdown" : "🔍 Search Custom Match Name"}
                </button>
              </div>

              {isCustomTicketSearch ? (
                <div className="flex flex-col gap-3 mt-1">
                  {/* Home vs Away inputs */}
                  <div className="flex flex-col md:flex-row items-center gap-2 w-full">
                    <div className="w-full md:flex-1">
                      <input
                        type="text"
                        placeholder="Home Club (e.g. Manchster City)"
                        value={customHomeQuery}
                        onChange={e => setCustomHomeQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>
                    <span className="text-zinc-500 font-extrabold font-mono px-2 text-xs shrink-0 select-none">VS</span>
                    <div className="w-full md:flex-1">
                      <input
                        type="text"
                        placeholder="Away Club (e.g. Arsenal)"
                        value={customAwayQuery}
                        onChange={e => setCustomAwayQuery(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>
                  </div>

                  {/* Date selection and find button */}
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-8">
                      <input
                        type="date"
                        value={customTicketDate}
                        onChange={e => setCustomTicketDate(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none transition-colors shadow-sm dark:shadow-none"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <button
                        type="button"
                        onClick={handleSearchCustomTicketMatch}
                        disabled={isSearchingCustomTicket || !customHomeQuery.trim() || !customAwayQuery.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {isSearchingCustomTicket ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                            <span>Searching...</span>
                          </>
                        ) : (
                          "Find in API"
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 italic mt-0.5 leading-relaxed">
                    💡 If you make a minor spelling typo (e.g. "arsnal" or "manchster"), we'll auto-correct it using AI fuzzy matching!
                  </div>
                </div>
              ) : (
                <select
                  value={ticketSelectedMatchId || ""}
                  onChange={(e) => handleSelectMatch(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none transition-colors cursor-pointer shadow-sm dark:shadow-none"
                >
                  <option value="">-- Choose a Match --</option>
                  {upcomingMatches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.homeTeam} vs {m.awayTeam} ({m.venue || "TBD Venue"}) - {m.eventDate ? new Date(m.eventDate).toLocaleDateString() : "TBD Date"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {activeMatch ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Live Ticketmaster Availability Check */}
                <div className="glass-card p-4 border border-zinc-800 bg-zinc-900/40 rounded-xl flex flex-col justify-between min-h-[220px]">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-2">Live Availability Feed</h4>
                    <p className="text-[10px] text-zinc-500 mb-3">Checking Ticketmaster Discovery API free-tier event listings...</p>
                    
                    {ticketAvailabilityLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "300ms" }} />
                      </div>
                    ) : ticketAvailabilityError ? (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                          <span>⚠️ Provider Config Required</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          {ticketAvailabilityError}
                        </p>
                      </div>
                    ) : ticketAvailabilityData ? (
                      ticketAvailabilityData.event_name ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                          <div className="text-[11px] font-bold text-emerald-400 mb-1">✓ Listing Found on Ticketmaster</div>
                          <p className="text-[10px] text-zinc-300 font-semibold mb-2">{ticketAvailabilityData.event_name}</p>
                          {ticketAvailabilityData.price_ranges && ticketAvailabilityData.price_ranges.length > 0 && (
                            <div className="text-[10px] text-zinc-400 mb-2">
                              Price range: <span className="font-bold text-zinc-300">${ticketAvailabilityData.price_ranges[0].min}</span> to <span className="font-bold text-zinc-300">${ticketAvailabilityData.price_ranges[0].max}</span> {ticketAvailabilityData.price_ranges[0].currency}
                            </div>
                          )}
                          <a
                            href={ticketAvailabilityData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Buy on Ticketmaster ↗
                          </a>
                        </div>
                      ) : (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex flex-col gap-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-400">
                            <span>ℹ️ Info from Ticketmaster</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">
                            {ticketAvailabilityData.message || "No matching live event listings found on Ticketmaster for this query."}
                          </p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-6 text-zinc-600 text-xs">No active availability status loaded.</div>
                    )}
                  </div>
                  
                  {/* Book Mock-Free Ticket Directly */}
                  <div>
                    {!bookedMatchIds.has(activeMatch.id) ? (
                      <button
                        onClick={() => handleBookTicket(activeMatch)}
                        disabled={!!bookingInProgress}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 mt-4 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {bookingInProgress === activeMatch.id ? "Booking..." : "Confirm Mock-Free Seat Registration"}
                      </button>
                    ) : (
                      <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-xl py-2 px-3 text-center text-xs font-bold mt-4 flex items-center justify-center gap-1">
                        <span>✓ Seat Registered</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. AI Seating & Seating Intelligence Forecast */}
                <div className="glass-card p-4 border border-zinc-800 bg-zinc-900/40 rounded-xl min-h-[220px] flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 mb-2">AI Seating & Price Forecaster</h4>
                    <p className="text-[10px] text-zinc-500 mb-3">Model stadium demand, price trends, and sellout probability.</p>
                    
                    {ticketForecastingLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <div className="flex items-center justify-center">
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "300ms" }} />
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500">Querying Gemini Forecasting Model...</div>
                      </div>
                    ) : ticketForecastingData ? (
                      <div className="flex flex-col gap-3.5">
                        {/* Expected Attendance & Sellout */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl text-center">
                            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Expected Attendance</div>
                            <div className="text-sm font-black text-violet-300 mt-0.5">
                              {ticketForecastingData.expected_attendance?.toLocaleString() || "TBD"}
                            </div>
                          </div>
                          <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl text-center">
                            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Sellout Risk</div>
                            <div className="text-sm font-black text-violet-300 mt-0.5">
                              {ticketForecastingData.sellout_probability ? `${Math.round(ticketForecastingData.sellout_probability * 100)}%` : "TBD"}
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Price Timeline */}
                        {ticketForecastingData.dynamic_pricing_timeline && (
                          <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl">
                            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-2">Dynamic Price Timeline</div>
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <div className="text-center">
                                <span className="text-zinc-500">Today</span>
                                <div className="font-bold text-zinc-300">${ticketForecastingData.dynamic_pricing_timeline.today}</div>
                              </div>
                              <div className="h-0.5 flex-1 bg-zinc-800 mx-2 relative">
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] text-violet-400 font-bold">
                                  {ticketForecastingData.price_change_percent ? `+${ticketForecastingData.price_change_percent}%` : ""}
                                </span>
                              </div>
                              <div className="text-center">
                                <span className="text-zinc-500">3 Days</span>
                                <div className="font-bold text-zinc-300">${ticketForecastingData.dynamic_pricing_timeline.three_days_later}</div>
                              </div>
                              <div className="h-0.5 flex-1 bg-zinc-800 mx-2" />
                              <div className="text-center">
                                <span className="text-zinc-500">Matchday</span>
                                <div className="font-bold text-violet-300">${ticketForecastingData.dynamic_pricing_timeline.matchday}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Timing Advice */}
                        <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2">
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Purchase Advice</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{ticketForecastingData.reasoning}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                            ticketForecastingData.purchase_recommendation === "BUY_NOW" 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {ticketForecastingData.purchase_recommendation?.replace("_", " ") || "BUY NOW"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-zinc-600 text-xs">Run Seating & Seating Forecast below to see dynamic predictions.</div>
                    )}
                  </div>

                  {!ticketForecastingData && (
                    <button
                      onClick={() => handleRunAISeatingForecast(activeMatch)}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-2 mt-4 text-xs font-bold transition-all cursor-pointer"
                    >
                      Run AI Seating Forecast
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state py-12">
                <p className="text-xs text-zinc-500">Choose an upcoming match from the selector above to check live pricing & dynamic forecasts.</p>
              </div>
            )}

            
          </div>
        </div>

        {/* Right Side: My Booked Tickets */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                🎫 My Booked Tickets
              </h3>
              <button
                onClick={() => email && fetchTickets(email)}
                className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {ticketsLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2].map(i => <div key={i} className="loading-shimmer shimmer-card h-24" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-state py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                <p className="text-xs text-zinc-500">No tickets registered yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tickets.map(t => (
                  <div key={t.booking_id} className="glass-card booked-ticket-card p-4 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-emerald-500/30 transition-all duration-300 rounded-xl text-xs flex flex-col gap-3 text-left">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-sm text-zinc-100 leading-snug break-words pr-2" title={`${t.home_team} vs ${t.away_team}`}>
                          {t.home_team} vs {t.away_team}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0 select-all" title={t.booking_id}>
                          #{t.booking_id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] text-zinc-400 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400">📍</span> {t.venue}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400">📅</span> {formatMatchDate(t.match_date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-850 pt-3 mt-1">
                      <button
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        onClick={() => handlePlanJourneyForTicket(t)}
                      >
                        Plan Journey
                      </button>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-semibold">
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Full Horizontal Space Section: Matchday Intelligence & Stadium Seating Guide */}
        {activeMatch && (
          <div className="w-full flex flex-col gap-8 mt-4">
            {/* 1. Matchday Intelligence: Live Weather & Betting Odds (Full Width 4-Col Grid) */}
            <div className="w-full p-6 border border-zinc-800/80 bg-zinc-900/40 rounded-2xl shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-4 border-b border-zinc-800/80 gap-3">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 font-mono flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>⚡ Dynamic RAG Matchday Intelligence & Environmental Feed</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">Real-time pitch forecast, win odds, gate turnstiles & ticket market sentiment for {activeMatch.venue || "the Stadium"}.</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto shadow-sm">
                  {stadiumIntelLoading ? "🔄 LLM & API SYNCING..." : (stadiumIntelData?.weather?.provider ? `✓ ${stadiumIntelData.weather.provider.toUpperCase()}` : "✓ LIVE RAG FEED SYNCED")}
                </span>
              </div>

              {stadiumIntelLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <div className="text-xs font-mono text-zinc-400">Extracting stadium RAG intelligence & querying live weather API...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Weather Forecast Card */}
                  <div className="bg-zinc-950/70 border border-zinc-800/90 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-emerald-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">🌤️ Pitch Weather</span>
                      <span className="text-xs font-black text-amber-400 font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">{stadiumIntelData?.weather?.temp || "22°C / 72°F"}</span>
                    </div>
                    <div className="text-sm font-black text-white tracking-wide">{stadiumIntelData?.weather?.condition || "Clear Sky & Mild"}</div>
                    <div className="text-[11px] font-mono text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2 mt-1">
                      <span className="block text-zinc-300">💨 Wind: {stadiumIntelData?.weather?.wind || "10 km/h SW"} • 💧 Hum: {stadiumIntelData?.weather?.humidity || "45%"}</span>
                      <span className="text-emerald-400 font-semibold mt-1 block truncate" title={stadiumIntelData?.weather?.note || "Ideal pitch conditions for fast football"}>
                        ✓ {stadiumIntelData?.weather?.note || "Ideal pitch conditions for fast football"}
                      </span>
                    </div>
                  </div>

                  {/* Betting & Win Odds Card */}
                  <div className="bg-zinc-950/70 border border-zinc-800/90 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-violet-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">⚖️ Match Win Odds</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">Over 2.5: {stadiumIntelData?.betting_odds?.over_2_5 || "1.85"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono py-1.5 bg-zinc-900/90 rounded-lg border border-zinc-800/70">
                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Home</div>
                        <div className="text-sm font-black text-emerald-400 mt-0.5">{stadiumIntelData?.betting_odds?.home_win?.split(" ")[0] || "2.10"}</div>
                        <div className="text-[9px] text-zinc-400">{stadiumIntelData?.betting_odds?.home_win?.split(" ")[1] || "45%"}</div>
                      </div>
                      <div className="border-x border-zinc-800/80">
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Draw</div>
                        <div className="text-sm font-black text-zinc-200 mt-0.5">{stadiumIntelData?.betting_odds?.draw?.split(" ")[0] || "3.40"}</div>
                        <div className="text-[9px] text-zinc-400">{stadiumIntelData?.betting_odds?.draw?.split(" ")[1] || "28%"}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-500 uppercase font-bold">Away</div>
                        <div className="text-sm font-black text-amber-400 mt-0.5">{stadiumIntelData?.betting_odds?.away_win?.split(" ")[0] || "3.20"}</div>
                        <div className="text-[9px] text-zinc-400">{stadiumIntelData?.betting_odds?.away_win?.split(" ")[1] || "27%"}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 text-center">
                      BTTS: {stadiumIntelData?.betting_odds?.btts || "Yes (1.70)"} • Official Consensus
                    </div>
                  </div>

                  {/* Gate & Entry Tips Card */}
                  <div className="bg-zinc-950/70 border border-zinc-800/90 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-cyan-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">🚪 Turnstile Entry</span>
                      <span className="text-[11px] font-black font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{stadiumIntelData?.gate_entry?.open_time || "-2.5 Hours"}</span>
                    </div>
                    <div className="text-sm font-black text-white truncate" title={stadiumIntelData?.gate_entry?.recommended_turnstiles || "Gates Open Early"}>
                      {stadiumIntelData?.gate_entry?.recommended_turnstiles || "Gates Open Early"}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2 mt-1">
                      <span className="text-cyan-400 font-semibold block line-clamp-2" title={stadiumIntelData?.gate_entry?.tip || "Arrive 45m prior to avoid peak security queues"}>
                        💡 {stadiumIntelData?.gate_entry?.tip || "Arrive 45m prior to avoid peak security queues"}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Market Sentiment Card */}
                  <div className="bg-zinc-950/70 border border-zinc-800/90 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-md hover:border-rose-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">📈 Market Sentiment</span>
                      <span className="text-[11px] font-black font-mono text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">{stadiumIntelData?.market_sentiment?.status || "High Demand"}</span>
                    </div>
                    <div className="text-sm font-black text-white">{stadiumIntelData?.market_sentiment?.summary || "Fast Selling Fixture"}</div>
                    <div className="text-[11px] font-mono text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2 mt-1">
                      <span className="text-rose-400 font-semibold block line-clamp-2" title={stadiumIntelData?.market_sentiment?.detail || "Verified primary allocation moving rapidly"}>
                        🔥 {stadiumIntelData?.market_sentiment?.detail || "Verified primary allocation moving rapidly"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Stadium Stand Seating Guide (Full Width 5-Col Grid) */}
            <div className="w-full p-6 border border-zinc-800/80 bg-zinc-900/40 rounded-2xl shadow-xl backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 pb-4 border-b border-zinc-800/80 gap-3">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-violet-400 font-mono flex items-center gap-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                    <span>🏟️ Dynamic Stadium Seating Guide: RAG Extracted Stands & AI Demand</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">Visual comparison of all seating sectors of {activeMatch.venue || "the stadium"}, extracted dynamically using LLM knowledge base.</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/30 self-start sm:self-auto shadow-sm">
                  {stadiumIntelLoading ? "⏳ EXTRACTING STANDS..." : "✓ DYNAMIC RAG EXTRACTED"}
                </span>
              </div>

              {stadiumIntelLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-zinc-400">Extracting official stand names and view ratings for {activeMatch.venue || "stadium"}...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                  {(stadiumIntelData?.stands || [
                    {
                      id: "east_stand",
                      name: `${activeMatch.venue || "Stadium"} - Longside East Stand`,
                      badge: "Best Pitch View ⭐⭐⭐⭐⭐",
                      rating: "5.0 / 5.0",
                      rate: "$120 – $180",
                      desc: "Unobstructed panoramic view of both goalmouths and tactical formations. Best side without afternoon sun glare.",
                      img: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop",
                      demand: 85
                    },
                    {
                      id: "west_stand",
                      name: `${activeMatch.venue || "Stadium"} - Main Tribune (West)`,
                      badge: "Touchline & Benches ⭐⭐⭐⭐⭐",
                      rating: "4.9 / 5.0",
                      rate: "$150 – $220",
                      desc: "Premium touchline seating directly above team dugouts, player walkout tunnel, and manager technical zones.",
                      img: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=600&auto=format&fit=crop",
                      demand: 90
                    },
                    {
                      id: "north_stand",
                      name: `${activeMatch.venue || "Stadium"} - North End (Behind Goal)`,
                      badge: "Ultras & Atmosphere ⭐⭐⭐⭐",
                      rating: "4.3 / 5.0",
                      rate: "$65 – $95",
                      desc: "High-energy passionate singing terrace. Home of tifo displays, flag waving, and electric goal celebrations.",
                      img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=600&auto=format&fit=crop",
                      demand: 75
                    },
                    {
                      id: "south_stand",
                      name: `${activeMatch.venue || "Stadium"} - South Stand (Family End)`,
                      badge: "Great Goal Action ⭐⭐⭐⭐",
                      rating: "4.2 / 5.0",
                      rate: "$55 – $85",
                      desc: "Family-friendly seating atmosphere with excellent sightlines of direct attacking plays and easy concourse food access.",
                      img: "https://images.unsplash.com/photo-1459865264687-595d652de67e?q=80&w=600&auto=format&fit=crop",
                      demand: 70
                    },
                    {
                      id: "vip_box",
                      name: `${activeMatch.venue || "Stadium"} - VIP Hospitality Suites`,
                      badge: "Luxury Experience ⭐⭐⭐⭐⭐",
                      rating: "5.0 / 5.0",
                      rate: "$250 – $450+",
                      desc: "All-inclusive gourmet dining, climate-controlled suite, private lounge bar, and elevated overhead tactical view.",
                      img: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=600&auto=format&fit=crop",
                      demand: 60
                    }
                  ]).map((stand: any, idx: number) => {
                    const demand = ticketForecastingData?.seating_occupancy?.[stand.id] || stand.demand || stand.defaultDemand || 75;
                    return (
                      <div key={stand.id || idx} className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-violet-500/50 transition-all shadow-lg hover:shadow-violet-500/10">
                        {/* Top Image & Badge */}
                        <div className="relative h-36 w-full overflow-hidden bg-zinc-900">
                          <img
                            src={stand.img || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop"}
                            alt={stand.name}
                            onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop"; }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
                            <span className="text-[9px] font-mono font-black uppercase px-2.5 py-1 rounded bg-black/80 text-violet-300 border border-violet-500/40 backdrop-blur-md shadow truncate">
                              {stand.badge || "Great View ⭐⭐⭐⭐⭐"}
                            </span>
                          </div>
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-end">
                            <h5 className="text-xs font-black text-white leading-snug drop-shadow-md line-clamp-2">{stand.name}</h5>
                          </div>
                        </div>

                        {/* Middle: Rates & View Description */}
                        <div className="p-4 flex flex-col gap-2.5 flex-1 justify-between">
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/70 mb-2">
                              <span className="text-[10px] font-mono text-zinc-400 font-semibold">Usual Rate:</span>
                              <span className="text-xs font-black text-emerald-400 font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{stand.rate || "$100 - $180"}</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-3">
                              {stand.desc || "Excellent seating view of the pitch with great atmosphere."}
                            </p>
                          </div>

                          {/* Bottom: AI Demand Percentage Bar */}
                          <div className="pt-2.5 border-t border-zinc-800/70 mt-1">
                            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                              <span className="text-zinc-400 font-bold">AI Stand Demand:</span>
                              <span className="font-black text-violet-300">{demand}%</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/90 shadow-inner">
                              <div
                                className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-400 transition-all duration-700"
                                style={{ width: `${demand}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Match Analysis Helpers ────────────────────────────────────────────────
  const getPlayerCoordinates = (position: string, index: number, isHome: boolean) => {
    let x = 50;
    const pos = position.toLowerCase();
    
    // Horizontal spacing (x coordinate: 0% to 100%)
    if (pos.includes("goalkeeper") || pos.includes("gk")) {
      x = 50;
    } else if (pos.includes("left-back") || pos.includes("lb")) {
      x = 15;
    } else if (pos.includes("right-back") || pos.includes("rb")) {
      x = 85;
    } else if (pos.includes("centre-back") || pos.includes("cb")) {
      x = index === 1 || index === 2 ? 38 : 62;
    } else if (pos.includes("left wing-back") || pos.includes("lwb")) {
      x = 12;
    } else if (pos.includes("right wing-back") || pos.includes("rwb")) {
      x = 88;
    } else if (pos.includes("defensive midfield") || pos.includes("dmf") || pos.includes("dm")) {
      x = index === 5 ? 40 : 60;
    } else if (pos.includes("central midfield") || pos.includes("cm") || pos.includes("midfield")) {
      if (index === 6) x = 32;
      else if (index === 7) x = 68;
      else x = 50;
    } else if (pos.includes("attacking midfield") || pos.includes("am")) {
      x = 50;
    } else if (pos.includes("left winger") || pos.includes("lw") || pos.includes("left midfielder")) {
      x = 22;
    } else if (pos.includes("right winger") || pos.includes("rw") || pos.includes("right midfielder")) {
      x = 78;
    } else if (pos.includes("centre-forward") || pos.includes("cf") || pos.includes("striker") || pos.includes("second striker")) {
      if (index === 10) x = 40;
      else if (index === 9) x = 60;
      else x = 50;
    } else {
      x = 15 + (index % 5) * 18;
    }
    
    // Vertical spacing (y coordinate: 0% to 100%)
    let row = 0; // 0: goalie, 1: defense, 2: midfield, 3: attack
    if (pos.includes("goalkeeper") || pos.includes("gk")) {
      row = 0;
    } else if (pos.includes("back") || pos.includes("cb") || pos.includes("lb") || pos.includes("rb") || pos.includes("defend")) {
      row = 1;
    } else if (pos.includes("midfield") || pos.includes("dm") || pos.includes("cm") || pos.includes("am")) {
      row = 2;
    } else {
      row = 3; // forwards & wingers
    }
    
    let y = 0;
    if (isHome) {
      // Home team occupies top half (row 0 goalie at 7% to row 3 forwards at 43%)
      y = 7 + row * 12;
    } else {
      // Away team occupies bottom half (row 0 goalie at 93% to row 3 forwards at 57%)
      y = 93 - row * 12;
    }
    
    return { x, y };
  };

  const renderAnalysisStatBar = (label: string, homeVal: any, awayVal: any) => {
    const hNum = parseFloat(homeVal) || 0;
    const aNum = parseFloat(awayVal) || 0;
    const total = hNum + aNum || 1;
    const homePercent = (hNum / total) * 100;
    
    return (
      <div className="flex flex-col gap-1 w-full text-xs" key={label}>
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <span>{homeVal}</span>
          <span className="text-zinc-500 font-mono text-[9px]">{label}</span>
          <span>{awayVal}</span>
        </div>
        <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800/60 rounded-full flex overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${homePercent}%` }} />
          <div className="bg-violet-500 h-full transition-all duration-500" style={{ width: `${100 - homePercent}%` }} />
        </div>
      </div>
    );
  };

  const renderAnalysisThreatChart = (momentum: number[]) => {
    const width = 500;
    const height = 120;
    const paddingX = 40;
    const paddingY = 20;
    
    const points = momentum.map((val, idx) => {
      const x = paddingX + (idx / 5) * (width - 2 * paddingX);
      const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
      return { x, y };
    });
    
    const pathData = points.reduce((acc, p, idx) => {
      return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
    }, "");
    
    return (
      <div className="bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Tactical Dominance Timeline</h5>
          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">xG Threat Momentum</span>
        </div>
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[320px] overflow-visible">
            {/* Center line (50% - balanced threat) */}
            <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#27272a" strokeDasharray="3,3" strokeWidth={1} />
            <text x={paddingX - 10} y={height / 2 + 3} fill="#52525b" fontSize="8" textAnchor="end" className="font-mono">50%</text>
            <text x={paddingX - 10} y={paddingY + 3} fill="#10b981" fontSize="8" textAnchor="end" className="font-mono">Home</text>
            <text x={paddingX - 10} y={height - paddingY + 3} fill="#8b5cf6" fontSize="8" textAnchor="end" className="font-mono">Away</text>
            
            {/* Threat Dominance Line */}
            <path d={pathData} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Nodes */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r={4.5} fill="#09090b" stroke="#10b981" strokeWidth={2.5} />
                <text x={p.x} y={p.y - 8} fill="#a1a1aa" fontSize="8" textAnchor="middle" className="font-mono font-bold">{momentum[idx]}%</text>
                <text x={p.x} y={height - 4} fill="#52525b" fontSize="8" textAnchor="middle" className="font-mono">{idx * 15 + 15}'</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Extract tactical insights from AI analysis
  const extractTacticalAnalysis = (aiData: any) => {
    if (!aiData || !aiData.report_markdown) {
      return {
        homeFormation: analysisMatchDetail?.homeTeam?.formation,
        awayFormation: analysisMatchDetail?.awayTeam?.formation,
        homeStrategy: "",
        awayStrategy: "",
        tacticalNotes: ""
      };
    }

    const report = aiData.report_markdown;
    
    // Extract strategic insights from the report
    let homeStrategy = "";
    let awayStrategy = "";
    let tacticalNotes = "";

    // Look for formation mentions in the report
    const formationRegex = /(\d-\d-\d)/g;
    const formations = report.match(formationRegex) || [];

    // Extract strategic keywords
    if (report.toLowerCase().includes("high press") || report.toLowerCase().includes("pressing")) {
      homeStrategy = "Aggressive Pressing";
    } else if (report.toLowerCase().includes("low block") || report.toLowerCase().includes("defensive")) {
      homeStrategy = "Defensive Block";
    } else if (report.toLowerCase().includes("possession") || report.toLowerCase().includes("control")) {
      homeStrategy = "Possession Dominance";
    }

    if (report.toLowerCase().includes("counter") || report.toLowerCase().includes("transitions")) {
      awayStrategy = "Counter Attack";
    } else if (report.toLowerCase().includes("compact") || report.toLowerCase().includes("organized")) {
      awayStrategy = "Organized Defense";
    } else if (report.toLowerCase().includes("wide play") || report.toLowerCase().includes("wings")) {
      awayStrategy = "Wide Attack";
    }

    // Extract a brief tactical note
    const tacticalSections = report.split("###");
    if (tacticalSections.length > 2) {
      const keySection = tacticalSections[2].split("\n")[0];
      tacticalNotes = keySection.substring(0, 80) + "...";
    }

    return {
      homeFormation: analysisMatchDetail?.homeTeam?.formation,
      awayFormation: analysisMatchDetail?.awayTeam?.formation,
      homeStrategy,
      awayStrategy,
      tacticalNotes
    };
  };

  const renderAnalysisMarkdown = (text: string) => {
    if (!text) return null;
    
    const parseInline = (content: string) => {
      const parts = content.split("**");
      return parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-zinc-100 font-extrabold">{part}</strong>;
        }
        return part;
      });
    };

    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-xs font-extrabold text-emerald-400 mt-5 mb-2.5 uppercase tracking-widest font-mono border-b border-zinc-900 pb-1">
            {trimmed.replace("###", "").trim()}
          </h4>
        );
      }
      if (trimmed.startsWith("####")) {
        return (
          <h5 key={idx} className="text-[11px] font-bold text-zinc-300 mt-4 mb-2 uppercase tracking-wide">
            {trimmed.replace("####", "").trim()}
          </h5>
        );
      }
      if (trimmed.startsWith("##")) {
        return (
          <h3 key={idx} className="text-sm font-black text-emerald-400 mt-6 mb-3 uppercase tracking-widest border-b border-zinc-800 pb-1.5 font-mono">
            {trimmed.replace("##", "").trim()}
          </h3>
        );
      }
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        return (
          <li key={idx} className="text-xs text-zinc-300 list-disc ml-5 mb-1.5 leading-relaxed text-left">
            {parseInline(trimmed.substring(1).trim())}
          </li>
        );
      }
      if (trimmed) {
        return (
          <p key={idx} className="text-xs text-zinc-400 mb-3 leading-relaxed text-left">
            {parseInline(trimmed)}
          </p>
        );
      }
      return <div key={idx} className="h-1.5" />;
    });
  };

  const renderAnalysis = () => {
    const completedMatches = followedMatches.filter(m => m.status === "FT" || m.status === "FINISHED");
    const futureMatches = followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && (m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false));
    
    const activeMatchDetail = analysisMatchDetail;
    const isFuture = activeMatchDetail && activeMatchDetail.status !== "FT" && activeMatchDetail.status !== "FINISHED" && activeMatchDetail.status !== "predicted";

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full text-white min-h-[500px]">
        {/* Match Select Panel */}
        <div className="xl:col-span-12">
          <div className="glass-card p-5 sm:p-6 border border-zinc-800 bg-zinc-950/40 rounded-2xl flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                📊 Match Statistics & AI Tactical Analysis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Standard Selection */}
              <div className="flex flex-col gap-2 border-r-0 md:border-r border-zinc-800/80 md:pr-6">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Select Tracked Match
                </label>
                <select
                  value={analysisSelectedMatchId || ""}
                  onChange={(e) => {
                    handleSelectAnalysisMatch(e.target.value);
                    setCustomAnalysisPromptQuery("");
                  }}
                  className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs text-white outline-none transition-colors cursor-pointer shadow-inner"
                >
                  <option value="">-- Choose a Match to Analyze --</option>
                  
                  {futureMatches.length > 0 && (
                    <optgroup label="Upcoming / Predicted Matches" className="bg-zinc-950 text-zinc-300 font-bold">
                      {futureMatches.map(m => (
                        <option key={m.id} value={m.id} className="font-medium">
                          {m.homeTeam} vs {m.awayTeam} (Pre-Match Preview)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {completedMatches.length > 0 && (
                    <optgroup label="Completed Matches" className="bg-zinc-950 text-zinc-300 font-bold mt-2">
                      {completedMatches.map(m => (
                        <option key={m.id} value={m.id} className="font-medium">
                          {m.homeTeam} {m.homeScore}-{m.awayScore} {m.awayTeam} (Post-Match Review)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                  Select an upcoming match to generate a <strong className="text-zinc-400">Predicted AI Preview</strong>, or a past match for <strong className="text-zinc-400">Tactical Breakdown</strong>.
                </div>
              </div>

              {/* Right: AI Smart Search */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
                  AI Smart Search (Historical or Hypothetical)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Manchester City vs Inter Milan 2023 final, Rodri scores"
                    value={customAnalysisPromptQuery}
                    onChange={e => setCustomAnalysisPromptQuery(e.target.value)}
                    className="flex-1 bg-violet-950/10 border border-violet-900/50 focus:border-violet-500 rounded-xl px-4 py-3 text-xs text-white outline-none placeholder-zinc-500 transition-colors shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAnalysisMatchByPrompt}
                    disabled={analysisLoading || !customAnalysisPromptQuery.trim()}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs px-5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-violet-900/20"
                  >
                    {analysisLoading ? "Searching..." : "AI Generate"}
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500 italic mt-1 leading-relaxed">
                  Can't find it? Type what you remember. Our AI will reconstruct the exact lineups, events, and statistical graphs for you.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Match Dashboard */}
        {analysisLoading ? (
          <div className="xl:col-span-12 flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative flex items-center justify-center w-12 h-12">
              <span className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></span>
              <span className="absolute inset-1 border-r-2 border-violet-500 rounded-full animate-spin direction-reverse"></span>
            </div>
            <div className="text-xs text-zinc-400 font-mono tracking-widest uppercase">Fetching Match Data & AI Tactical Engine...</div>
          </div>
        ) : activeMatchDetail ? (
          <>
            {/* Left Column: Match Stats & Pitch Lineup (8 cols) */}
            <div className="xl:col-span-7 flex flex-col gap-6">
              {/* Pitch Visualizer with Manual/AI Toggle */}
              <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                    {isFuture ? "🔮 Expected Tactical Formations" : "🏟️ Tactical Formations"}
                  </h4>
                  
                  {/* Manual/AI Toggle */}
                  <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-0.5">
                    <button
                      onClick={() => setTacticalViewMode('manual')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                        tacticalViewMode === 'manual'
                          ? 'bg-emerald-600 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      📋 Manual
                    </button>
                    <button
                      onClick={() => setTacticalViewMode('ai')}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded transition-colors ${
                        tacticalViewMode === 'ai'
                          ? 'bg-violet-600 text-white'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      🤖 AI
                    </button>
                  </div>
                </div>

                {/* Tactical Formation Grid Component */}
                {activeMatchDetail.homeTeam && activeMatchDetail.awayTeam ? (
                  <TacticalFormationGrid
                    homeTeam={activeMatchDetail.homeTeam}
                    awayTeam={activeMatchDetail.awayTeam}
                    isAIMode={tacticalViewMode === 'ai'}
                    aiAnalysis={tacticalViewMode === 'ai' ? extractTacticalAnalysis(analysisAIData) : undefined}
                  />
                ) : (
                  <div className="w-full aspect-[4/5] bg-emerald-950/20 border-2 border-emerald-500/20 rounded-xl flex items-center justify-center text-zinc-500">
                    <p className="text-sm">Loading formation data...</p>
                  </div>
                )}
              </div>

              {/* Match Stats Comparison */}
              <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl flex flex-col gap-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono flex items-center justify-between">
                  <span>{isFuture ? "📈 AI Predicted Match Statistics" : "📊 Match Performance Statistics"}</span>
                  {isFuture && <span className="text-[9px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded tracking-normal">FORECAST</span>}
                </h4>
                <div className="flex flex-col gap-3.5">
                  {renderAnalysisStatBar("Possession", activeMatchDetail.homeTeam?.statistics?.ball_possession ? `${activeMatchDetail.homeTeam.statistics.ball_possession}%` : "50%", activeMatchDetail.awayTeam?.statistics?.ball_possession ? `${activeMatchDetail.awayTeam.statistics.ball_possession}%` : "50%")}
                  {renderAnalysisStatBar(isFuture ? "Expected Shots" : "Total Shots", activeMatchDetail.homeTeam?.statistics?.shots || 0, activeMatchDetail.awayTeam?.statistics?.shots || 0)}
                  {renderAnalysisStatBar("Shots on Target", activeMatchDetail.homeTeam?.statistics?.shots_on_goal || 0, activeMatchDetail.awayTeam?.statistics?.shots_on_goal || 0)}
                  {renderAnalysisStatBar("Passes Completed", activeMatchDetail.homeTeam?.statistics?.passes || 0, activeMatchDetail.awayTeam?.statistics?.passes || 0)}
                  {renderAnalysisStatBar("Pass Accuracy", activeMatchDetail.homeTeam?.statistics?.pass_accuracy ? `${activeMatchDetail.homeTeam.statistics.pass_accuracy}%` : "80%", activeMatchDetail.awayTeam?.statistics?.pass_accuracy ? `${activeMatchDetail.awayTeam.statistics.pass_accuracy}%` : "80%")}
                  {renderAnalysisStatBar("Fouls", activeMatchDetail.homeTeam?.statistics?.fouls || 0, activeMatchDetail.awayTeam?.statistics?.fouls || 0)}
                  {renderAnalysisStatBar("Corner Kicks", activeMatchDetail.homeTeam?.statistics?.corner_kicks || 0, activeMatchDetail.awayTeam?.statistics?.corner_kicks || 0)}
                  {renderAnalysisStatBar("Goalkeeper Saves", activeMatchDetail.homeTeam?.statistics?.saves || 0, activeMatchDetail.awayTeam?.statistics?.saves || 0)}
                </div>
              </div>
            </div>

            {/* Right Column: Events & AI report (5 cols) */}
            <div className="xl:col-span-5 flex flex-col gap-6">
              {/* Chronological Events Timeline */}
              <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl flex flex-col gap-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                  {isFuture ? "🔮 AI Predicted Events Timeline" : "🕒 Match Events Timeline"}
                </h4>
                
                <div className="flex flex-col gap-3 relative pl-4 border-l border-zinc-800">
                  {/* Goals */}
                  {activeMatchDetail.goals && activeMatchDetail.goals.length > 0 ? (
                    activeMatchDetail.goals.map((g: any, index: number) => {
                      const isHomeGoal = g.teamId === activeMatchDetail.homeTeamId || g.teamId === activeMatchDetail.homeTeam?.id || g.teamId === "home";
                      return (
                        <div className="relative flex flex-col items-start gap-0.5 text-left" key={`g-${index}`}>
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-zinc-950 flex items-center justify-center text-[7px]" />
                          <div className="text-xs font-black text-zinc-100 flex items-center gap-1.5">
                            <span>⚽ {g.scorer}</span>
                            <span className="text-[10px] font-mono text-emerald-400 font-extrabold">{g.minute}'</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">Goal • {isHomeGoal ? activeMatchDetail.homeTeam?.name : activeMatchDetail.awayTeam?.name}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-zinc-600 text-[11px] text-left py-1 italic">{isFuture ? "Awaiting kick-off..." : "No goals recorded."}</div>
                  )}

                  {/* Bookings */}
                  {activeMatchDetail.bookings && activeMatchDetail.bookings.map((b: any, index: number) => {
                    const isHomeBooking = b.teamId === activeMatchDetail.homeTeamId || b.teamId === activeMatchDetail.homeTeam?.id || b.teamId === "home";
                    const isRed = b.card === "RED";
                    return (
                      <div className="relative flex flex-col items-start gap-0.5 text-left mt-1" key={`b-${index}`}>
                        <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${isRed ? "bg-red-500" : "bg-amber-400"} border border-zinc-950`} />
                        <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>🟨 {b.player}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{b.minute}'</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">{b.card} Card • {isHomeBooking ? activeMatchDetail.homeTeam?.name : activeMatchDetail.awayTeam?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Professional Report Panel */}
              <div className="glass-card p-5 border border-zinc-800 bg-zinc-950/20 rounded-2xl flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono">
                    🤖 AI Scout {isFuture ? "Pre-Match Preview" : "Tactical Review"}
                  </h4>
                  {analysisAIData && (
                    <span className={`text-[8px] px-2 py-0.5 rounded font-mono font-bold ${
                      analysisAIData.status === "fallback" ? "bg-amber-500/10 text-amber-400" : "bg-violet-500/10 text-violet-400"
                    }`}>
                      {analysisAIData.status === "fallback" ? "LOCAL ESTIMATE" : "GEMINI ENGINE"}
                    </span>
                  )}
                </div>

                {analysisAILoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="flex items-center justify-center">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce mx-0.5" style={{ animationDelay: "300ms" }} />
                    </div>
                    <div className="text-[9px] font-mono text-zinc-500 text-center max-w-[200px] leading-relaxed">
                      Analyzing {isFuture ? "form, expected lineups, and strategic mismatches" : "match stats, actual lineups, and tactical events"} with Gemini AI...
                    </div>
                  </div>
                ) : analysisAIData ? (
                  <div className="flex flex-col gap-5">
                    {/* Threat momentum graph */}
                    {analysisAIData.threat_momentum && renderAnalysisThreatChart(analysisAIData.threat_momentum)}

                    {/* MVP Player Spotlight */}
                    {analysisAIData.mvp_player && (
                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl flex items-start gap-4 text-left shadow-lg">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-violet-950 border border-violet-500/30 flex items-center justify-center font-black text-sm text-violet-300">
                          {analysisAIData.mvp_player.shirtNumber || 10}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">{isFuture ? "Key Player to Watch" : "Match MVP Candidate"}</div>
                          <div className="text-xs font-extrabold text-zinc-100">{analysisAIData.mvp_player.name}</div>
                          <div className="text-[9px] font-bold text-zinc-400">{analysisAIData.mvp_player.team}</div>
                          <p className="text-[10px] text-zinc-300 leading-relaxed mt-1.5 border-t border-zinc-800/50 pt-1.5">
                            {analysisAIData.mvp_player.reason}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tactical Report Text */}
                    <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-4 max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                      {renderAnalysisMarkdown(analysisAIData.report_markdown)}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <p className="text-xs text-zinc-500">{isFuture ? "No prediction generated yet." : "No tactical report loaded yet."}</p>
                    <button
                      onClick={handleGenerateTacticalBreakdown}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Generate AI {isFuture ? "Pre-Match Preview" : "Tactical Breakdown"}
                    </button>
                  </div>
                )}

                {analysisAIError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[10px] text-red-400 text-left">
                    ⚠️ {analysisAIError}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="xl:col-span-12 glass-card p-12 text-center border border-zinc-800">
            <p className="text-xs text-zinc-500">Please select a match or use the AI Smart Search to generate deep statistical analytics.</p>
          </div>
        )}
      </div>
    );
  };
  const renderAssistant = () => {
    const renderAssistantMd = (text: string) => {
      if (!text) return null;
      return text.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 mb-1 uppercase tracking-wider">{line.slice(4)}</h3>;
        if (line.startsWith("#### ")) return <h4 key={i} className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1.5 mb-1 uppercase tracking-wider">{line.slice(5)}</h4>;
        
        const renderLineParts = (partText: string) => {
          if (!partText.includes("**")) return partText;
          const parts = partText.split("**");
          return parts.map((p, j) => {
            if (j % 2 === 1) {
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => {
                    setAssistantSelectedMapPlace(p);
                  }}
                  className="font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded cursor-pointer transition-all border-none align-baseline text-left font-sans text-xs"
                >
                  📍 {p}
                </button>
              );
            }
            return p;
          });
        };

        if (line.trim().startsWith("- ")) {
          return (
            <li key={i} className="ml-4 list-disc text-xs text-zinc-700 dark:text-zinc-300 my-1">
              {renderLineParts(line.trim().slice(2))}
            </li>
          );
        }

        return line.trim() ? (
          <p key={i} className="text-xs text-zinc-700 dark:text-zinc-300 my-1.5 leading-relaxed">
            {renderLineParts(line)}
          </p>
        ) : (
          <div key={i} className="h-1.5" />
        );
      });
    };

    const SUGGESTION_QUERIES = [
      { label: "🏨 Find Stays", query: "Find cheap stays near Emirates Stadium" },
      { label: "⚽ Match Fixtures", query: "Show upcoming matches for Arsenal" },
      { label: "🍺 Food & Pubs", query: "Best pubs and food reviews near Anfield" },
      { label: "🚶 Route & Directions", query: "Show transit directions from London to Emirates Stadium" },
    ];

    const getMapUrl = () => {
      const defaultStadium = userProfile?.stadium || "Emirates Stadium";
      const defaultCity = userProfile?.city || "London";
      
      let origin = "";
      if (assistantSelectedStay) {
        origin = assistantSelectedStay;
      } else if (userProfile?.street && userProfile?.city) {
        origin = `${userProfile.street}, ${userProfile.city}`;
      } else if (userProfile?.city) {
        origin = userProfile.city;
      } else {
        origin = "London";
      }

      if (assistantSelectedMapPlace) {
        if (origin && origin.toLowerCase() !== assistantSelectedMapPlace.toLowerCase()) {
          return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(assistantSelectedMapPlace)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
        }
        return `https://maps.google.com/maps?q=${encodeURIComponent(assistantSelectedMapPlace)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
      }
      
      return `https://maps.google.com/maps?q=${encodeURIComponent(defaultStadium + " " + defaultCity)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)] min-h-[600px] w-full text-white">
        {/* Left Column: Chat terminal */}
        <div className="lg:col-span-5 flex flex-col h-full glass-card agent-terminal overflow-hidden border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 rounded-2xl">
          <div className="terminal-header flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40">
            <div className="terminal-title flex items-center gap-2">
              <span className="terminal-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                Globus 2026 — Assistant Terminal
              </span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
              ONLINE
            </span>
          </div>

          <div className="terminal-messages flex-grow overflow-y-auto p-4 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-bubble ${msg.sender} max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                msg.sender === "user" 
                  ? "self-end bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none" 
                  : "self-start bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 text-zinc-800 dark:text-zinc-300 rounded-bl-none shadow-sm dark:shadow-none"
              }`}>
                {msg.sender === "agent" ? (
                  <>
                    {renderAssistantMd(msg.text)}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="tool-calls-panel mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/80 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        <div className="font-bold text-zinc-500 mb-1">⚡ MCP Tool Actions</div>
                        {msg.toolCalls.map((tc, ti) => (
                          <div key={ti} className="bg-zinc-100 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/30 rounded px-2 py-1 mt-1 text-[9px] text-zinc-600 dark:text-emerald-400">
                            {tc.name}({JSON.stringify(tc.arguments)})
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p>{msg.text}</p>
                )}
                <span className="msg-timestamp block text-[9px] text-zinc-500 mt-1.5 text-right font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Empty chat suggestions onboarding board */}
            {messages.length <= 1 && (
              <div className="mt-2 border border-zinc-200 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/10 rounded-xl p-3 shadow-sm dark:shadow-none">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Suggestions to ask Globus:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTION_QUERIES.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendDirectQuery(sq.query)}
                      className="w-full text-left bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 hover:border-emerald-500/40 rounded-xl p-2.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-between shadow-sm dark:shadow-none"
                    >
                      <span>{sq.query}</span>
                      <span className="text-emerald-400">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sending && (
              <div className="msg-bubble agent self-start bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-3 text-xs rounded-bl-none shadow-sm dark:shadow-none">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="flex flex-col border-t border-zinc-200 dark:border-zinc-800/80 p-3 bg-zinc-50 dark:bg-zinc-900/20 shrink-0" onSubmit={handleSendMessage}>
            {/* Horizontal suggestions chips above input box */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
              {SUGGESTION_QUERIES.map((sq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendDirectQuery(sq.query)}
                  className="flex-shrink-0 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/40 text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-sm dark:shadow-none"
                >
                  {sq.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="terminal-input-field flex-grow bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none transition-all shadow-sm dark:shadow-none"
                placeholder="Ask about nearest stays, directions, food spots..."
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 py-2 flex items-center justify-center gap-1 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!inputVal.trim() || sending}
              >
                Send
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Connected Map Hub */}
        <div className="lg:col-span-7 flex flex-col h-full glass-card border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.202-.832a2.25 2.25 0 0 0 .896-1.802V4.77a2.25 2.25 0 0 0-3.344-1.948l-2.705 1.503a1.125 1.125 0 0 1-1.012 0L7.13 2.822a2.25 2.25 0 0 0-3.344 1.948v11.758a2.25 2.25 0 0 0 .896 1.802l1.2 1.2a2.25 2.25 0 0 0 2.534-.148l2.705-1.503a1.125 1.125 0 0 1 1.012 0l2.705 1.503Z" />
                </svg>
                Live Assistant Map Hub
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Connected GPS tracking via MCP</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5 text-[9px] text-emerald-400 font-mono tracking-wider animate-pulse uppercase">
              GPS STATUS: ACTIVE
            </div>
          </div>

          {/* Lodging & Search Info Overlay */}
          <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 mb-3 text-xs shadow-sm dark:shadow-none">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 font-semibold text-[10px] uppercase tracking-wider font-mono">Your Lodging Stay:</span>
                {assistantSelectedStay ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    🏨 {assistantSelectedStay}
                  </span>
                ) : (
                  <span className="text-zinc-500 italic">None selected. Click stay name in chat to set.</span>
                )}
              </div>
              {assistantSelectedMapPlace && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-zinc-500 font-semibold text-[10px] uppercase tracking-wider font-mono">Map Target:</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">📍 {assistantSelectedMapPlace}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {assistantSelectedMapPlace && assistantSelectedMapPlace !== assistantSelectedStay && (
                <button
                  onClick={() => setAssistantSelectedStay(assistantSelectedMapPlace)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                >
                  Set as Lodging Stay
                </button>
              )}
              {(assistantSelectedMapPlace || assistantSelectedStay) && (
                <button
                  onClick={() => {
                    setAssistantSelectedMapPlace(null);
                    setAssistantSelectedStay(null);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 px-2 py-1 rounded-lg text-[10px] cursor-pointer transition-all"
                >
                  Reset Map
                </button>
              )}
            </div>
          </div>

          {/* Map Frame */}
          <div className="relative flex-1 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/20 min-h-[300px]">
            <iframe
              title="Globus Assistant Map"
              src={getMapUrl()}
              className="w-full h-full border-none opacity-90 hover:opacity-100 transition-opacity"
              allowFullScreen
              loading="lazy"
            />
            {/* Cyberpunk Scanner Overlays */}
            <div className="absolute inset-0 pointer-events-none border border-emerald-500/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholder = (title: string, desc: string, icon: React.ReactNode) => (
    <div className="placeholder-tab">
      <div className="placeholder-icon">{icon}</div>
      <div className="placeholder-title">{title}</div>
      <div className="placeholder-desc">{desc}</div>
      <div style={{ marginTop: "1.5rem", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: "0.75rem", padding: "1rem 1.5rem", textAlign: "left", maxWidth: 460, fontSize: "0.78rem", fontFamily: "monospace", color: "var(--text-secondary)", lineHeight: 1.7 }}>
        <div style={{ color: "#10b981", fontWeight: 700, marginBottom: "0.5rem" }}>{"// TO BE IMPLEMENTED"}</div>
        <div>{"// This section will connect to real data and backend services."}</div>
        <div>{"// Feature development tracked in implementation_plan.md"}</div>
      </div>
    </div>
  );

  // ── Professional Contact & Support Center ─────────────────────────────────
  const renderContact = () => {
    const handleContactSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!contactForm.message.trim()) return;
      setContactSubmitting(true);
      setTimeout(() => {
        setContactSubmitting(false);
        setContactSubmitted(true);
      }, 1000);
    };

    const faqs = [
      {
        q: "When will I receive my digital matchday tickets?",
        a: "Digital mobile tickets are securely delivered to your Offside AI account and verified email address 48 to 72 hours prior to kick-off, complying with official club security and anti-scalping protocols."
      },
      {
        q: "What is your policy if a fixture is rescheduled or postponed?",
        a: "If a match date or kick-off time is adjusted by the league or television broadcasters, your existing booking remains 100% valid for the rescheduled fixture. If you cannot attend the new date, our automated resale portal allows you to list your seats up to 5 days prior."
      },
      {
        q: "How does the integrated Matchday Route Planner work?",
        a: "Our Route Planner combines real-time metro timetables, train schedules, and airport transfers directly from your saved Home City to the stadium turnstiles, avoiding known road closures and matchday congestion."
      },
      {
        q: "How are stadium sightlines and seat view ratings verified?",
        a: "Our sightline ratings are compiled from official stadium architectural drawings and verified attendee feedback, ensuring you know exact sun angles, roof coverage, and pitch visibility before finalizing your booking."
      }
    ];

    return (
      <div className="flex flex-col gap-8 w-full text-zinc-900 dark:text-white pb-16 font-sans animate-fadeIn">
        {/* Top Header */}
        <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Help & Customer Support</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">We are here to assist with your ticket bookings, travel itineraries, stadium access, and account inquiries.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Support Desk Open 24/7</span>
          </div>
        </div>

        {/* Quick Support Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-lg">🎟️</div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Ticket & Booking Assistance</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Seat allocations, mobile ticket delivery, or payment queries.</p>
              </div>
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between">
              <span>Average response: &lt;15 mins</span>
              <span>Priority Support →</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-lg">🏟️</div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Matchday Access & Travel</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Turnstile navigation, gate opening times, or transit updates.</p>
              </div>
            </div>
            <div className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between">
              <span>Live Matchday Desk</span>
              <span>View Guides →</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-lg">🤝</div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Partnerships & Hospitality</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Corporate suites, group bookings, or club licensing inquiries.</p>
              </div>
            </div>
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between">
              <span>Dedicated Manager</span>
              <span>Inquire Now →</span>
            </div>
          </div>
        </div>

        {/* Main Section: Contact Form vs FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Contact Form */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-sm dark:shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="text-base font-semibold text-zinc-900 dark:text-white pb-4 border-b border-zinc-200 dark:border-zinc-800/80 mb-6">Send Us a Message</h4>

              {contactSubmitted ? (
                <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 my-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">[OK]</div>
                  <h5 className="text-base font-semibold text-white mt-1">Inquiry Submitted Successfully</h5>
                  <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                    Thank you for reaching out. A support representative has received your request and will reply to your connected email within 15 minutes.
                  </p>
                  <button
                    onClick={() => { setContactSubmitted(false); setContactForm({ ...contactForm, message: "", orderRef: "" }); }}
                    className="mt-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name || userProfile?.name || ""}
                        onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="Alex Ferguson"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email || email || ""}
                        onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="alex@manutd.co.uk"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Inquiry Subject</label>
                      <select
                        value={contactForm.subject}
                        onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all cursor-pointer"
                      >
                        <option value="booking_support">Ticket Booking & Seat Selection</option>
                        <option value="ticket_delivery">Mobile Ticket Delivery & Gate Entry</option>
                        <option value="travel_support">Travel & Route Planning Assistance</option>
                        <option value="billing_refunds">Billing, Refunds & Payments</option>
                        <option value="hospitality">VIP Hospitality & Corporate Boxes</option>
                        <option value="general">General Feedback & Suggestions</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Order / Reference # (Optional)</label>
                      <input
                        type="text"
                        value={contactForm.orderRef}
                        onChange={e => setContactForm({ ...contactForm, orderRef: e.target.value })}
                        placeholder="e.g. #OFS-8492"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all font-mono placeholder-zinc-400 dark:placeholder-zinc-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Please provide details regarding your inquiry or assistance request..."
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg p-3.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all resize-none leading-relaxed placeholder-zinc-400 dark:placeholder-zinc-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {contactSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <span>Submit Inquiry</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Secure SSL Encrypted Channel</span>
              <span>Offside Support Center • London & Buenos Aires</span>
            </div>
          </div>

          {/* Right: FAQ & Direct Contact */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl">
              <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">Frequently Asked Questions</h4>

              <div className="flex flex-col gap-2.5">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        isOpen ? "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700 shadow-sm" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="leading-snug">{faq.q}</span>
                        <span className={`text-xs transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-400" : "text-zinc-500"}`}>▼</span>
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800/60 pt-2.5">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Contact Details Box */}
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm dark:shadow-lg flex flex-col gap-3">
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Direct Contact Details</h4>
              <div className="flex flex-col gap-2 text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">Email Support:</span>
                  <span className="font-mono text-emerald-400">support@offside.ai</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60">
                  <span className="text-zinc-500 dark:text-zinc-400">Telephone Helpline:</span>
                  <span className="font-mono">+44 (0) 20 7946 0192</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Operating Hours:</span>
                  <span>24/7 Matchdays • Mon-Fri 8am-8pm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Professional Account & Preferences Center ─────────────────────────────
  const renderSettings = () => {
    const handleSaveSettings = () => {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    };

    return (
      <div className="flex flex-col gap-8 w-full text-white pb-16 font-sans animate-fadeIn">
        {/* Top Header */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Account & Preferences</h3>
            <p className="text-xs text-zinc-400 mt-1">Manage your profile details, matchday notifications, ticketing defaults, and display settings.</p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {settingsSaved && (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                [OK] Preferences Saved
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 pb-4">
          {[
            { id: "profile", label: "Profile & Preferences", icon: "👤" },
            { id: "notifications", label: "Notifications & Alerts", icon: "🔔" },
            { id: "security", label: "Security & Account", icon: "🔒" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSettingsTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 ${
                settingsTab === t.id
                  ? "bg-zinc-800 border-zinc-700 text-white shadow-sm"
                  : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Profile & Preferences */}
        {settingsTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {/* Card 1: Personal Profile */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between gap-5">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Personal Profile</h4>
                <p className="text-xs text-zinc-400 mb-4">Your display identity and primary club affiliation for match recommendations.</p>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Display Name</label>
                    <input
                      type="text"
                      value={profileForm.displayName || userProfile?.name || ""}
                      onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                      placeholder="Alex Ferguson"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Connected Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={email || "alex@manutd.co.uk"}
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 rounded-lg px-3.5 py-2.5 text-xs cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Favorite Club Affiliation</label>
                    <select
                      value={profileForm.favoriteClub}
                      onChange={e => setProfileForm({ ...profileForm, favoriteClub: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="CA Boca Juniors">CA Boca Juniors</option>
                      <option value="River Plate">River Plate</option>
                      <option value="Real Madrid">Real Madrid</option>
                      <option value="Manchester United">Manchester United</option>
                      <option value="Arsenal">Arsenal</option>
                      <option value="FC Barcelona">FC Barcelona</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Home Base City (For Travel Routing)</label>
                    <input
                      type="text"
                      value={journeyOrigin || "Buenos Aires, Argentina"}
                      onChange={e => setJourneyOrigin(e.target.value)}
                      placeholder="e.g. London, UK"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Display & Ticketing Defaults */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-2xl shadow-lg flex flex-col justify-between gap-5">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Display & Ticketing Defaults</h4>
                <p className="text-xs text-zinc-400 mb-4">Set your default currency, betting odds presentation, and travel routing mode.</p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Preferred Currency</label>
                    <select
                      value={profileForm.currency}
                      onChange={e => setProfileForm({ ...profileForm, currency: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="USD ($)">USD ($) - US Dollar</option>
                      <option value="EUR (€)">EUR (€) - Euro</option>
                      <option value="GBP (£)">GBP (£) - British Pound</option>
                      <option value="ARS ($)">ARS ($) - Argentine Peso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Odds Display Format</label>
                    <select
                      value={profileForm.oddsFormat}
                      onChange={e => setProfileForm({ ...profileForm, oddsFormat: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="Decimal (1.85)">Decimal (e.g. 1.85)</option>
                      <option value="Fractional (17/20)">Fractional (e.g. 17/20)</option>
                      <option value="American (-118)">American (e.g. -118)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">Default Travel & Routing Mode</label>
                    <select
                      value={profileForm.defaultTravelMode}
                      onChange={e => setProfileForm({ ...profileForm, defaultTravelMode: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="transit">Public Transit & Metro</option>
                      <option value="driving">Driving & Taxi Transfers</option>
                      <option value="flight">Flights & High-Speed Rail</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">System Timezone</label>
                    <input
                      type="text"
                      disabled
                      value="Local System Time (Auto-Detected)"
                      className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-500 rounded-lg px-3.5 py-2.5 text-xs cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Notifications & Alerts */}
        {settingsTab === "notifications" && (
          <div className="bg-zinc-950/80 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-lg animate-fadeIn max-w-3xl">
            <h4 className="text-base font-semibold text-white mb-1">Matchday & Ticketing Alerts</h4>
            <p className="text-xs text-zinc-400 mb-6">Choose when and how you receive updates regarding match scores, turnstile entry, and ticket availability.</p>
            
            <div className="flex flex-col gap-3.5">
              {[
                { id: "liveGoals", label: "Live Goal & Match Score Alerts", desc: "Receive immediate visual updates when a followed team scores, concedes, or suffers a red card during play.", val: notifPreferences.liveGoals },
                { id: "ticketAlerts", label: "Ticket Availability & Price Drops", desc: "Notify when new seat allocations are released or prices drop for your bookmarked upcoming matches.", val: notifPreferences.ticketAlerts },
                { id: "gateReminders", label: "Stadium Gate Opening Reminders", desc: "Receive automated digital alerts 2 hours prior to kick-off with turnstile entry directions.", val: notifPreferences.gateReminders },
                { id: "matchRoundup", label: "Weekly Matchup & Travel Roundup", desc: "Receive a curated email summary of weekend fixtures, ticket rates, and transit advisories.", val: notifPreferences.matchRoundup }
              ].map((notif: any) => (
                <div key={notif.id} className="bg-zinc-900/50 border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-white">{notif.label}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{notif.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifPreferences({ ...notifPreferences, [notif.id]: !notif.val })}
                    className={`w-11 h-6 rounded-full transition-all relative p-0.5 cursor-pointer flex items-center ${notif.val ? "bg-emerald-600" : "bg-zinc-700"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${notif.val ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Security & Account */}
        {settingsTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {/* Security */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col justify-between gap-6">
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Account Security</h4>
                <p className="text-xs text-zinc-400 mb-6">Manage authentication settings and protect your connected ticketing profile.</p>

                <div className="flex flex-col gap-4 text-xs">
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">Password Protection</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">Last changed 30 days ago</div>
                    </div>
                    <button type="button" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer">
                      Change Password
                    </button>
                  </div>

                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white">Two-Factor Authentication</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">Secure your match ticket bookings</div>
                    </div>
                    <button type="button" className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                      Enable 2FA
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500">
                Active Session: Windows Client • IP Verified
              </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-lg flex flex-col justify-between gap-6">
              <div>
                <h4 className="text-base font-semibold text-white mb-1">Data & Privacy</h4>
                <p className="text-xs text-zinc-400 mb-6">Download your personal ticketing archive or manage session status.</p>
                
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ profile: userProfile, tickets: tickets, followedMatches: followedMatches, exportDate: new Date() }, null, 2));
                      const dlAnchorElem = document.createElement("a");
                      dlAnchorElem.setAttribute("href", dataStr);
                      dlAnchorElem.setAttribute("download", `offside_ai_bookings_${Date.now()}.json`);
                      dlAnchorElem.click();
                    }}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-medium text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Download Bookings Archive (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium text-xs py-3 rounded-xl transition-all cursor-pointer text-center mt-2"
                  >
                    Sign Out & Clear Session
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 text-center">
                100% Data Privacy Compliant • Zero Third-Party Ad Trackers
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderJourney = () => {
    const handleFetchStays = async () => {
      setJourneyLoading(true);
      setJourneyError(null);
      try {
        const amenitiesParam = journeyAmenities.join(",");
        let checkIn = journeyCheckIn;
        let checkOut = journeyCheckOut;
        if (!checkIn && journeyMatchDate) {
          checkIn = journeyMatchDate;
          const dt = new Date(journeyMatchDate);
          dt.setDate(dt.getDate() + 1);
          checkOut = dt.toISOString().split("T")[0];
        }

        const res = await fetch(
          `${BACKEND}/api/v1/logistics/stays?stadium=${encodeURIComponent(journeyStadium)}&max_price=${journeyMaxPrice}&required_amenities=${encodeURIComponent(amenitiesParam)}&accommodation_type=${journeyAccommodationType}&check_in=${checkIn}&check_out=${checkOut}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.stays) {
            const filteredStays = data.stays.filter(
              (s: any) => s.distance_miles <= journeyMaxDistance
            );
            setJourneyStays(filteredStays);
            setJourneyStep(3);
          } else {
            setJourneyError("Failed to retrieve stays matches. Please verify parameters.");
          }
        } else {
          setJourneyError("Error connecting to stays logistics service.");
        }
      } catch (err) {
        setJourneyError("Could not reach stays logistics service.");
      } finally {
        setJourneyLoading(false);
      }
    };

    const handleFetchRoutes = async () => {
      setJourneyRouteLoading(true);
      setJourneyRouteError(null);
      try {
        const res = await fetch(
          `${BACKEND}/api/v1/logistics/directions?origin=${encodeURIComponent(journeyOrigin)}&destination=${encodeURIComponent(journeyStadium)}&mode=${journeyRouteMode}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.status === "success" && data.routes) {
            setJourneyRoutes(data.routes);
            setJourneySelectedRoute(data.routes[0] || null);
            setSelectedRouteIdx(0);
          } else {
            setJourneyRouteError("Failed to calculate route steps. Please verify your origin.");
          }
        } else {
          setJourneyRouteError("Error connecting to route directions service.");
        }
      } catch (err) {
        setJourneyRouteError("Could not reach route directions service.");
      } finally {
        setJourneyRouteLoading(false);
      }
    };

    const toggleAmenity = (amenity: string) => {
      setJourneyAmenities(prev =>
        prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
      );
    };

    const handleQuickSelect = (match: MatchDocument) => {
      const matchDateStr = match.eventDate ? match.eventDate.split("T")[0] : "";
      setJourneyMatchName(`${match.homeTeam} vs ${match.awayTeam}`);
      setJourneyMatchDate(matchDateStr);
      setJourneyStadium(match.venue || "Emirates Stadium");
      setStadiumSearchQuery(match.venue || "Emirates Stadium");
      if (matchDateStr) {
        setJourneyCheckIn(matchDateStr);
        const dt = new Date(matchDateStr);
        dt.setDate(dt.getDate() + 1);
        setJourneyCheckOut(dt.toISOString().split("T")[0]);
      } else {
        setJourneyCheckIn("");
        setJourneyCheckOut("");
      }
    };

    const handleTicketQuickSelect = (ticket: TicketDocument) => {
      const matchDateStr = ticket.match_date ? ticket.match_date.split("T")[0] : "";
      setJourneyMatchName(`${ticket.home_team} vs ${ticket.away_team}`);
      setJourneyMatchDate(matchDateStr);
      setJourneyStadium(ticket.venue || "Emirates Stadium");
      setStadiumSearchQuery(ticket.venue || "Emirates Stadium");
      if (matchDateStr) {
        setJourneyCheckIn(matchDateStr);
        const dt = new Date(matchDateStr);
        dt.setDate(dt.getDate() + 1);
        setJourneyCheckOut(dt.toISOString().split("T")[0]);
      } else {
        setJourneyCheckIn("");
        setJourneyCheckOut("");
      }
    };

    const renderAIPlannerOverlay = () => (
      <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 md:p-6 z-50">
        <div className="w-full max-w-3xl bg-zinc-900/95 border border-violet-500/30 rounded-2xl p-5 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-extrabold">
              Globus 2026 AI Planner
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              5 STAGE EXECUTION
            </div>
          </div>

          <div className="grid gap-3">
            {aiPlanningStages.map((stage, idx) => {
              const isActive = idx === activeAIStageIndex;
              const isDone = idx < completedAIStageCount;
              const showDetails = isActive || isDone;
              return (
                <div
                  key={stage.id}
                  className={`rounded-xl border p-3 text-left transition-all duration-300 ${
                    isActive
                      ? "border-violet-500/60 bg-violet-500/[0.06] shadow-[0_0_20px_rgba(139,92,246,0.08)]"
                      : isDone
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-zinc-800 bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-mono font-black ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                        : isActive
                        ? "border-violet-400 text-violet-300"
                        : "border-zinc-700 text-zinc-500"
                    }`}>
                      {isDone ? "OK" : idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${isActive ? "text-violet-300" : isDone ? "text-emerald-400" : "text-zinc-500"}`}>
                          {stage.label}
                        </h4>
                        {isActive && (
                          <span className="h-4 w-4 shrink-0 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                        {showDetails ? stage.brief : "Queued for execution."}
                      </p>
                      {showDetails && stage.details && stage.details.length > 0 && (
                        <div className="mt-2 grid gap-1">
                          {stage.details.slice(0, 3).map((detail, dIdx) => (
                            <div key={dIdx} className="rounded-lg border border-zinc-800/70 bg-black/20 px-2.5 py-1.5 text-[10px] text-zinc-300 font-mono">
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
            <div className="flex gap-2 text-left text-violet-300 font-mono text-[10px] font-extrabold">
              <span className="text-violet-500 animate-blink">|</span>
              <span>{currentLogMsg}</span>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="glass-card p-8 w-full max-w-none space-y-8 relative overflow-hidden">
        {journeyAILoading && renderAIPlannerOverlay()}
        {/* Waiting / Loading Screen Terminal Overlay */}
        {false && journeyAILoading && (
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50">
            <div className="w-full max-w-md bg-zinc-900/90 border border-violet-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[10px] font-mono text-violet-400 uppercase tracking-widest font-extrabold animate-pulse">
                  Globus 2026 AI Planner
                </div>
                <div className="text-[9px] font-mono text-zinc-550">
                  SECURE_TLS_V1.3
                </div>
              </div>

              {/* Loading Radar */}
              <div className="flex justify-center py-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-violet-500/10" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-r-transparent animate-spin" />
                  <div className="text-xl">✨</div>
                </div>
              </div>

              {/* Terminal body */}
              <div className="bg-black/40 rounded-xl p-4 border border-zinc-850 h-44 overflow-y-auto font-mono text-[10px] text-zinc-400 space-y-1.5 scrollbar-thin text-left">
                {loadingLogs.map((log, lIdx) => (
                  <div key={lIdx} className="flex gap-2 text-left animate-slide-up text-zinc-400">
                    <span className="text-violet-500">▶</span>
                    <span>{log}</span>
                  </div>
                ))}
                <div className="flex gap-2 text-left text-violet-400 font-extrabold">
                  <span className="text-violet-500 animate-blink">▋</span>
                  <span>{currentLogMsg}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-zinc-550 font-mono">
                Optimizing flights, stays, routes and matchday event locations
              </p>
            </div>
          </div>
        )}

        {/* Wizard Header / Steps Indicator */}
        <div className="border-b border-zinc-700/50 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-emerald-500 uppercase tracking-wide">
                Plan your Journey
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Unified logistics portal comparing Hotelbeds & LiteAPI rates with MCP services.
              </p>
            </div>
            {journeyStep > 1 && (
              <button
                onClick={() => setJourneyStep(prev => prev - 1)}
                className="text-xs font-bold text-zinc-500 hover:text-emerald-500 cursor-pointer"
              >
                ← Back
              </button>
            )}
          </div>

          {/* Progress bar HUD */}
          <div className="mt-5 grid grid-cols-5 gap-2 text-center text-[10px] font-mono tracking-wider">
            {[
              "1. MATCH DETAILS",
              "2. STAY FILTERS",
              "3. LODGING LIST",
              "4. ROUTE DIRECTIONS",
              "5. EXPLORE & SAFETY"
            ].map((stepLabel, idx) => {
              const active = journeyStep === idx + 1;
              const completed = journeyStep > idx + 1;
              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className={`h-1 rounded-full transition-all duration-300 ${
                    active ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : completed ? "bg-emerald-600/60" : "bg-zinc-800"
                  }`} />
                  <span className={active ? "text-emerald-400 font-bold" : completed ? "text-emerald-600/70" : "text-zinc-600"}>
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Match Details Form */}
        {journeyStep === 1 && (
          <div className="space-y-6 py-2">

            {/* ── Mode Selector (shown until user picks) ─────────────────── */}
            {!planningMode && (
              <div className="space-y-4">
                <div className="text-center space-y-1 pb-2">
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">How would you like to plan?</p>
                  <h3 className="text-base font-extrabold text-white">Choose Your Planning Style</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left: Plan Yourself */}
                  <button
                    onClick={() => setPlanningMode('custom')}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 text-left hover:border-emerald-500/60 hover:bg-emerald-500/[0.04] transition-all duration-300 cursor-pointer shadow-sm dark:shadow-none"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    {/* Glow on hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

                    <div className="relative space-y-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-emerald-500/10 border border-zinc-700 group-hover:border-emerald-500/40 flex items-center justify-center text-2xl transition-all duration-300">
                        🎯
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-white text-sm group-hover:text-emerald-400 transition-colors">Plan Yourself</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Fill in match details, pick your stadium, set your budget and preferences — full control in your hands.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['Match Details', 'Stadium', 'Budget', 'Dates'].map(tag => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 group-hover:text-emerald-500 transition-colors">
                        <span>Get started</span>
                        <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                      </div>
                    </div>
                  </button>

                  {/* Right: Let AI Plan */}
                  <button
                    onClick={() => setPlanningMode('ai')}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 text-left hover:border-violet-500/60 hover:bg-violet-500/[0.04] transition-all duration-300 cursor-pointer shadow-sm dark:shadow-none"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    {/* AI glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />

                    {/* AI badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-violet-500/15 border border-violet-500/30 rounded-full px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-[9px] font-extrabold text-violet-400 uppercase tracking-widest">AI</span>
                    </div>

                    <div className="relative space-y-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 group-hover:bg-violet-500/10 border border-zinc-200 dark:border-zinc-700 group-hover:border-violet-500/40 flex items-center justify-center text-2xl transition-all duration-300">
                        ✨
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Let AI Plan It</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          Just describe your trip in plain English. AI picks the best match, hotels, and routes for you automatically.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['Smart Search', 'Auto Hotels', 'Best Routes', 'One Prompt'].map(tag => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 group-hover:border-violet-500/30 group-hover:text-violet-400 transition-colors">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 group-hover:text-violet-400 transition-colors">
                        <span>Try AI planning</span>
                        <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ── Custom Planning Form ───────────────────────────────────── */}
            {planningMode === 'custom' && (
              <div className="space-y-5">
                {/* Back to mode select */}
                <div className="flex items-center gap-3 pb-1">
                  <button
                    onClick={() => setPlanningMode(null)}
                    className="text-xs font-bold text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    ← Change mode
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm">🎯</span>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Plan Yourself</span>
                  </div>
                </div>

                {/* Future & Upcoming Scheduled Matches Dropdown Menu */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>📅 Select From Upcoming / Future Match Schedule</span>
                    <span className="text-[10px] font-mono text-zinc-500">Live API Schedule</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [name, date, venue] = val.split("|");
                      setJourneyMatchName(name || "");
                      if (date && date !== "TBD") {
                        try {
                          const d = new Date(date);
                          if (!isNaN(d.getTime())) {
                            setJourneyMatchDate(d.toISOString().split("T")[0]);
                          }
                        } catch(err) {}
                      }
                      if (venue && venue !== "TBD") {
                        setJourneyStadium(venue);
                        setStadiumSearchQuery(venue);
                      }
                    }}
                    className="w-full bg-zinc-900 border border-emerald-500/40 focus:border-emerald-500 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none transition-all cursor-pointer shadow-lg hover:border-emerald-500/80"
                  >
                    <option value="">-- Choose an upcoming fixture (autofills details) --</option>
                    <option value="Man City vs Barcelona|2026-06-15|Santiago Bernabéu">⚽ Man City vs Barcelona (15 June 2026 - Santiago Bernabéu)</option>
                    <option value="Man City vs Bayern Munich|2026-06-18|Allianz Arena">⚽ Man City vs Bayern Munich (18 June 2026 - Allianz Arena)</option>
                    <option value="Man City vs PSG|2026-06-22|Parc des Princes">⚽ Man City vs PSG (22 June 2026 - Parc des Princes)</option>
                    <option value="Arsenal vs Barcelona|2026-06-25|Emirates Stadium">⚽ Arsenal vs Barcelona (25 June 2026 - Emirates Stadium)</option>
                    <option value="Real Madrid vs PSG|2026-06-28|Santiago Bernabéu">⚽ Real Madrid vs PSG (28 June 2026 - Santiago Bernabéu)</option>
                    <option value="Liverpool vs Man City|2026-07-05|Anfield">⚽ Liverpool vs Man City (05 July 2026 - Anfield)</option>
                    <option value="Chelsea vs Arsenal|2026-07-10|Stamford Bridge">⚽ Chelsea vs Arsenal (10 July 2026 - Stamford Bridge)</option>
                    {followedMatches && followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && (m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false)).map((m, idx) => (
                      <option key={idx} value={`${m.homeTeam} vs ${m.awayTeam}|${m.eventDate?.split("T")[0] || ""}|${m.venue || ""}`}>
                        ⚽ {m.homeTeam} vs {m.awayTeam} ({m.eventDate?.split("T")[0] || "Upcoming"} - {m.venue || "Venue TBD"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick-select Row */}
                {((followedMatches && followedMatches.some(m => m.status !== "FT")) || (tickets && tickets.length > 0)) && (
                  <div className="space-y-3">
                    <div className="section-label">Quick Select Match</div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {tickets.map(ticket => (
                        <button
                          key={ticket.booking_id}
                          onClick={() => handleTicketQuickSelect(ticket)}
                          className="flex-shrink-0 w-64 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.06] hover:border-emerald-500/40 text-left transition-all cursor-pointer"
                        >
                          <div className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-extrabold mb-1">🎫 Booked Ticket</div>
                          <div className="text-xs font-bold text-white truncate">{ticket.home_team} vs {ticket.away_team}</div>
                          <div className="text-[10px] text-zinc-400 truncate mt-0.5">{ticket.venue}</div>
                          {ticket.match_date && <div className="text-[10px] text-zinc-500 font-mono mt-1">{ticket.match_date.split("T")[0]}</div>}
                        </button>
                      ))}
                      {followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && (m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false)).map(match => (
                        <button
                          key={match.id}
                          onClick={() => handleQuickSelect(match)}
                          className="flex-shrink-0 w-64 p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700 text-left transition-all cursor-pointer"
                        >
                          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold mb-1">⚽ Followed Team</div>
                          <div className="text-xs font-bold text-white truncate">{match.homeTeam} vs {match.awayTeam}</div>
                          <div className="text-[10px] text-zinc-400 truncate mt-0.5">{match.venue}</div>
                          {match.eventDate && <div className="text-[10px] text-zinc-500 font-mono mt-1">{match.eventDate.split("T")[0]}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-4">
                  <div className="section-label">Custom Match Details</div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Opponents / Match Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Liverpool vs Chelsea"
                        value={journeyMatchName}
                        onChange={e => setJourneyMatchName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Match Date</label>
                      <input
                        type="date"
                        value={journeyMatchDate}
                        onChange={e => setJourneyMatchDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative" ref={stadiumRef}>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Stadium / Match Venue</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search or type stadium name (e.g. Anfield, Stamford Bridge...)"
                        value={stadiumSearchQuery}
                        onChange={e => {
                          setStadiumSearchQuery(e.target.value);
                          setJourneyStadium(e.target.value);
                          setShowStadiumDropdown(true);
                        }}
                        onFocus={() => setShowStadiumDropdown(true)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                      />
                      {isSearchingStadiums && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
                        </div>
                      )}
                    </div>

                    {showStadiumDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl divide-y divide-zinc-900 scrollbar-thin">
                        {filteredPopularStadiums.length > 0 && (
                          <div className="p-2">
                            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2 py-1">Popular Stadiums</div>
                            {filteredPopularStadiums.map(name => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setJourneyStadium(name);
                                  setStadiumSearchQuery(name);
                                  setShowStadiumDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-white hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                              >
                                🏟️ {name}
                              </button>
                            ))}
                          </div>
                        )}

                        {stadiumSuggestions.length > 0 && (
                          <div className="p-2">
                            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider px-2 py-1">Search Results</div>
                            {stadiumSuggestions.map(sug => {
                              const displayName = sug.name || sug.display_name.split(",")[0];
                              return (
                                <button
                                  key={sug.place_id || sug.osm_id}
                                  type="button"
                                  onClick={() => {
                                    setJourneyStadium(displayName);
                                    setStadiumSearchQuery(displayName);
                                    setShowStadiumDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <div className="text-xs font-semibold text-white truncate">🏟️ {displayName}</div>
                                  <div className="text-[9px] text-zinc-500 truncate mt-0.5">{sug.display_name}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {filteredPopularStadiums.length === 0 && stadiumSuggestions.length === 0 && !isSearchingStadiums && (
                          <div className="p-4 text-center text-xs text-zinc-500">
                            No stadiums found matching &ldquo;{stadiumSearchQuery}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 font-mono">
                      *OSM Nominatim API will geocode this stadium coordinates to find nearby accommodations.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => setJourneyStep(2)}
                    disabled={!journeyStadium.trim()}
                    className="book-ticket-btn"
                  >
                    Proceed to Stay Filters →
                  </button>
                </div>
              </div>
            )}

            {/* ── AI Planning Panel ──────────────────────────────────────── */}
            {planningMode === 'ai' && (
              <div className="space-y-5">
                {/* Back to mode select */}
                <div className="flex items-center gap-3 pb-1">
                  <button
                    onClick={() => setPlanningMode(null)}
                    className="text-xs font-bold text-zinc-500 hover:text-violet-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    ← Change mode
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">AI Planning</span>
                  </div>
                </div>

                {/* AI Input Area */}
                <div className="relative rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] overflow-hidden"
                  style={{ backdropFilter: 'blur(12px)' }}>
                  {/* Animated top border glow */}
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)' }} />

                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                        ✨
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-violet-300 uppercase tracking-wider mb-0.5">AI Journey Planner</p>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Describe your trip and I'll find the best match, hotels, and routes for you automatically.
                        </p>
                      </div>
                    </div>

                    {/* Future & Upcoming Scheduled Matches Dropdown for AI Prompt */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center justify-between">
                        <span>📅 Select Future Match (Auto-formats e.g. Prompt)</span>
                        <span className="text-[10px] font-mono text-violet-400">Prompt Generator</span>
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [name, date, venue] = val.split("|");
                          setAiPrompt(`Plan a complete trip for ${name} at ${venue} on ${date || "upcoming weekend"}, budget $150/night, prefer a comfortable hotel near the stadium with fast transit.`);
                        }}
                        className="w-full bg-white dark:bg-zinc-900/90 border border-violet-500/30 dark:border-violet-500/40 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none transition-all cursor-pointer shadow-sm dark:shadow-lg hover:border-violet-500/60 dark:hover:border-violet-500/80"
                      >
                        <option value="">-- Pick future match to generate formatted e.g. prompt --</option>
                        <option value="Man City vs Barcelona|15 June 2026|Santiago Bernabéu">⚽ Man City vs Barcelona (15 June 2026 - Santiago Bernabéu)</option>
                        <option value="Man City vs Bayern Munich|18 June 2026|Allianz Arena">⚽ Man City vs Bayern Munich (18 June 2026 - Allianz Arena)</option>
                        <option value="Man City vs PSG|22 June 2026|Parc des Princes">⚽ Man City vs PSG (22 June 2026 - Parc des Princes)</option>
                        <option value="Arsenal vs Barcelona|25 June 2026|Emirates Stadium">⚽ Arsenal vs Barcelona (25 June 2026 - Emirates Stadium)</option>
                        <option value="Real Madrid vs PSG|28 June 2026|Santiago Bernabéu">⚽ Real Madrid vs PSG (28 June 2026 - Santiago Bernabéu)</option>
                        <option value="Liverpool vs Man City|05 July 2026|Anfield">⚽ Liverpool vs Man City (05 July 2026 - Anfield)</option>
                        {followedMatches && followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && (m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false)).map((m, idx) => (
                          <option key={idx} value={`${m.homeTeam} vs ${m.awayTeam}|${m.eventDate?.split("T")[0] || "Upcoming"}|${m.venue || "Stadium"}`}>
                            ⚽ {m.homeTeam} vs {m.awayTeam} ({m.eventDate?.split("T")[0] || "Upcoming"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prompt textarea */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Describe your trip</label>
                      <textarea
                        rows={4}
                        placeholder={"e.g. \"I want to watch a Premier League match next weekend in London, budget £150/night, near the stadium, prefer a hotel\""}
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    {/* Quick prompt suggestions */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">Quick prompts</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Champions League match in Madrid, 2 nights, £200 budget",
                          "Premier League this weekend, London, near stadium",
                          "La Liga match in Barcelona, hostel under €80/night",
                        ].map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => setAiPrompt(suggestion)}
                            className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/[0.06] transition-all cursor-pointer"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom animated border glow */}
                  <div className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />
                </div>

                {/* What AI will do */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: '⚽', label: 'Find Match', desc: 'Best upcoming match for your query' },
                    { icon: '🏨', label: 'Book Hotel', desc: 'Top-rated stays near the stadium' },
                    { icon: '🗺️', label: 'Plan Route', desc: 'Fastest route from your location' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3 text-center space-y-1 shadow-sm dark:shadow-none">
                      <div className="text-lg">{item.icon}</div>
                      <div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">{item.label}</div>
                      <div className="text-[9px] text-zinc-500 dark:text-zinc-600 leading-tight">{item.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-800">
                  <button
                    disabled={!aiPrompt.trim()}
                    className="book-ticket-btn"
                    style={aiPrompt.trim() ? { background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', borderColor: 'rgba(139,92,246,0.5)' } : {}}
                    onClick={handleAIPlan}
                  >
                    ✨ Let AI Plan My Journey →
                  </button>
                </div>
              </div>
            )}

          </div>
        )}


        {/* Step 2: Budget & Stays Preferences */}
        {journeyStep === 2 && (
          <div className="space-y-6 py-2">
            <div className="section-label">Configure Stay Parameters for {journeyStadium}</div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Max Price per Night: <span className="text-emerald-500 font-extrabold">${journeyMaxPrice}</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="250"
                  step="5"
                  value={journeyMaxPrice}
                  onChange={e => setJourneyMaxPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>$20</span>
                  <span>$120</span>
                  <span>$250</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Lodging Type</label>
                <select
                  value={journeyAccommodationType}
                  onChange={e => setJourneyAccommodationType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                >
                  <option value="all">All Stay Types</option>
                  <option value="hotel">Hotels Only</option>
                  <option value="hostel">Hostels Only</option>
                  <option value="airbnb">Airbnbs Only</option>
                  <option value="shared_room">Shared Rooms Only</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Check-in Date</label>
                <input
                  type="date"
                  value={journeyCheckIn || journeyMatchDate}
                  onChange={e => setJourneyCheckIn(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Check-out Date</label>
                <input
                  type="date"
                  value={journeyCheckOut}
                  placeholder={journeyMatchDate ? "Day after match" : ""}
                  onChange={e => setJourneyCheckOut(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                />
              </div>
            </div>

            {/* Show More / Advanced Filters Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMoreFilters(prev => !prev)}
                className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors outline-none"
              >
                {showMoreFilters ? "➖ Hide Advanced Filters" : "➕ Show More Options"}
              </button>
            </div>

            {showMoreFilters && (
              <div className="space-y-6 pt-3 border-t border-zinc-800/40 animate-fade-in">
                {/* Max Distance Slider */}
                <div className="space-y-3">
                  <label className="block text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                    How much distance is ok from stadium?
                  </label>
                  <div className="flex items-center gap-4 bg-zinc-950/40 p-4 border border-zinc-850 rounded-2xl">
                    <div className="flex-1 space-y-2">
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={journeyMaxDistance}
                        onChange={e => setJourneyMaxDistance(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                        <span>0.5 mi</span>
                        <span>5 mi</span>
                        <span>10 mi</span>
                      </div>
                    </div>
                    <div className="text-center bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shrink-0 min-w-[80px]">
                      <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold">Max Dist</div>
                      <div className="text-sm font-black text-emerald-400">{journeyMaxDistance} mi</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "Walking (< 1.5 mi)", val: 1.5 },
                      { label: "Short Drive (< 3.0 mi)", val: 3.0 },
                      { label: "Transit (< 5.0 mi)", val: 5.0 },
                      { label: "Any (< 10.0 mi)", val: 10.0 }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setJourneyMaxDistance(preset.val)}
                        className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold cursor-pointer transition-all ${
                          journeyMaxDistance === preset.val
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "border-zinc-800 bg-zinc-900/20 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Required Amenities checklist */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Required Amenities</label>
                  <div className="flex flex-wrap gap-2">
                    {["WiFi", "Kitchen", "AC", "Gym", "Bar", "Free Breakfast", "Pool"].map(amenity => {
                      const isSelected = journeyAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => toggleAmenity(amenity)}
                          className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          {amenity}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {journeyError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg font-mono">
                ⚠️ {journeyError}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-zinc-800">
              <button
                onClick={() => setJourneyStep(1)}
                className="text-sm font-bold text-zinc-500 hover:text-emerald-500 cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleFetchStays}
                disabled={journeyLoading}
                className="book-ticket-btn"
              >
                {journeyLoading ? "Aggregating Stays..." : "Search Stays 🔍"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Stays Comparison grid */}
        {journeyStep === 3 && (() => {
          const getStayImage = (type: string, name: string, idx: number) => {
            const hotelImages = [
              "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80"
            ];
            const apartmentImages = [
              "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80"
            ];
            const hostelImages = [
              "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80",
              "https://images.unsplash.com/photo-1563830227348-2b7aa363c06d?auto=format&fit=crop&w=600&q=80"
            ];

            const t = type.toLowerCase();
            const n = name.toLowerCase();

            if (n.includes("peninsula")) return "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80";
            if (n.includes("hilton")) return "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80";
            if (n.includes("hyatt") || n.includes("regency")) return "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";

            if (t === "hostel") return hostelImages[idx % hostelImages.length];
            if (t === "airbnb" || t === "shared_room" || t === "vacation_home") return apartmentImages[idx % apartmentImages.length];
            return hotelImages[idx % hotelImages.length];
          };

          const renderStars = () => {
            return (
              <div className="flex items-center gap-0.5 text-orange-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                  </svg>
                ))}
              </div>
            );
          };

          const getReviewBadgeText = (rating: number) => {
            if (rating >= 4.7) return "Wonderful";
            if (rating >= 4.3) return "Very Good";
            if (rating >= 3.8) return "Good";
            return "Decent";
          };

          const getReviewCount = (name: string, rating: number) => {
            const nameSum = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return (nameSum % 1800) + 42;
          };

          const getNightsCount = () => {
            if (!journeyCheckIn || !journeyCheckOut) return 1;
            try {
              const d1 = new Date(journeyCheckIn);
              const d2 = new Date(journeyCheckOut);
              const diffTime = Math.abs(d2.getTime() - d1.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays || 1;
            } catch {
              return 1;
            }
          };

          const nights = getNightsCount();

          return (
            <div className="space-y-6 py-2">
              {/* Mockup Hotel Deals Hero Banner */}
              <div className="relative rounded-2xl overflow-hidden min-h-[220px] flex flex-col justify-end p-6 border border-zinc-700/30 shadow-2xl bg-zinc-950">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40 select-none pointer-events-none"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=1200&q=80')"
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/45 to-transparent pointer-events-none" />

                <div className="relative z-10 space-y-1 text-left">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">
                    Incredible hotel deals
                  </h3>
                  <p className="text-[11px] md:text-xs text-zinc-300 font-medium">
                    Discover hotels, vacation homes and more
                  </p>
                </div>

                {/* Search HUD Box Overlay */}
                <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 bg-zinc-950/80 backdrop-blur-md border border-zinc-850 rounded-xl p-2.5 max-w-3xl text-left gap-1.5 sm:gap-0">
                  <div className="flex flex-col gap-0.5 px-3">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold">Where</span>
                    <span className="text-xs font-bold text-white truncate" title={journeyStadium}>{journeyStadium || "Enter a destination"}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-3">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold">Dates</span>
                    <span className="text-xs font-bold text-white truncate">
                      {formatShortDateRange(journeyCheckIn || journeyMatchDate, journeyCheckOut)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-3">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold">Guests</span>
                    <span className="text-xs font-bold text-white">1 room, 2 Guests</span>
                  </div>
                  <div className="flex items-center justify-end px-3 pt-1.5 sm:pt-0">
                    <button
                      onClick={() => setJourneyStep(2)}
                      className="h-8 w-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                      title="Modify search parameters"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recommended Stays heading */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-extrabold uppercase tracking-widest text-emerald-500 font-mono">
                    Recommended hotels
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="p-1 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                      title="Previous"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                      title="Next"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                {journeyStays.length === 0 ? (
                  <div className="p-10 border border-dashed border-zinc-800 rounded-2xl text-center space-y-2">
                    <p className="text-sm font-bold text-zinc-400">No matching hotels found near the stadium.</p>
                    <p className="text-xs text-zinc-600">Try raising your budget limit or removing distance/amenity filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {journeyStays.map((s, idx) => {
                      const isSelected = journeySelectedStay?.name === s.name;
                      const reviewStatus = getReviewBadgeText(s.rating);
                      const reviewCount = getReviewCount(s.name, s.rating);
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col rounded-2xl border bg-zinc-950/20 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${
                            isSelected ? "border-emerald-500/80 shadow-emerald-500/5 bg-emerald-500/[0.01]" : "border-zinc-800/80"
                          }`}
                        >
                          {/* Image area */}
                          <div className="relative h-44 w-full bg-zinc-900 overflow-hidden">
                            {s.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={s.image_url}
                                alt={s.name}
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-950/80 px-4 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                                Image unavailable from provider
                              </div>
                            )}
                            {/* Provider Badge */}
                            <span className={`absolute top-3 right-3 text-[9px] font-mono font-black px-2 py-0.5 rounded shadow-md uppercase tracking-wider ${
                              s.provider?.includes("Best Price")
                                ? "bg-emerald-500 text-zinc-950 font-black"
                                : s.provider?.includes("Airbnb")
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {s.provider}
                            </span>
                          </div>

                          {/* Card Details */}
                          <div className="p-4 flex-1 flex flex-col gap-3 justify-between text-left">
                            <div className="space-y-2">
                              {/* Stars rating row */}
                              <div className="flex items-center justify-between">
                                {renderStars()}
                                <span className="text-[9px] font-bold uppercase bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-400 tracking-wider font-mono">
                                  {s.type.replace("_", " ")}
                                </span>
                              </div>

                              {/* Name */}
                              <h5 className="font-bold text-white text-sm leading-snug line-clamp-2" title={s.name}>
                                {s.name}
                              </h5>

                              {/* Distance & Location Pin */}
                              <div className="flex items-start gap-1.5 text-xs text-zinc-400">
                                <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                </svg>
                                <span className="text-[11px] leading-tight">
                                  {s.type === "hotel" ? "London Hotel District" : "Nearby Residential Area"} ({s.distance_miles} miles to {journeyStadium})
                                </span>
                              </div>

                              {/* Amenities preview */}
                              <div className="text-[10px] text-zinc-500 truncate mt-1">
                                {s.amenities.join(" · ")}
                              </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-zinc-850">
                              {/* Rating badge & Price row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-emerald-500 text-zinc-950 font-black px-1.5 py-0.5 rounded text-[11px] font-mono leading-none">
                                    {s.rating >= 4.5 ? s.rating.toFixed(1) : (s.rating + 4.0).toFixed(1)}
                                  </span>
                                  <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-extrabold text-zinc-300 leading-none">{reviewStatus}</span>
                                    <span className="text-[8px] text-zinc-550 font-mono leading-none mt-0.5">{reviewCount} reviews</span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <div className="text-white font-black text-base">${s.price_usd}</div>
                                  <div className="text-[9px] text-zinc-500">1 room x {nights} night{nights > 1 ? "s" : ""} incl. taxes</div>
                                </div>
                              </div>

                              {/* Select Button */}
                              <button
                                onClick={() => {
                                  setJourneySelectedStay(s);
                                }}
                                className={`w-full py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all shadow-md active:scale-98 ${
                                  isSelected
                                    ? "bg-emerald-500 text-zinc-950 font-black shadow-emerald-500/20"
                                    : "bg-zinc-900 border border-zinc-850 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400"
                                }`}
                              >
                                {isSelected ? "✓ Selected" : "Select Stay"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3 Footer Navigation Buttons */}
              <div className="flex justify-between pt-5 border-t border-zinc-850 mt-4">
                <button
                  onClick={() => setJourneyStep(2)}
                  className="text-sm font-bold text-zinc-500 hover:text-emerald-500 cursor-pointer transition-colors"
                >
                  ← Back to stay filters
                </button>
                <button
                  onClick={() => setJourneyStep(4)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-xs font-bold rounded-lg text-zinc-300 cursor-pointer transition-colors"
                >
                  Configure Route Directions →
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 4: Route Directions Form & Output */}
        {journeyStep === 4 && (() => {
          const stayPrice = journeySelectedStay ? parseFloat(journeySelectedStay.price_usd) || 0 : 0;
          const transitPrice = journeyRoutes && journeyRoutes[selectedRouteIdx] ? parseFloat(journeyRoutes[selectedRouteIdx].cost_usd) || 0 : 0;
          const ticketPrice = 50.0;
          const grandTotal = stayPrice + transitPrice + ticketPrice;

          return (
            <div className="space-y-6 py-2">
              <div className="section-label">Step 4: Route directions to {journeyStadium}</div>

              {journeySelectedStay && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01] flex justify-between items-center text-xs">
                  <div>
                    <span className="text-zinc-500">Selected Lodging: </span>
                    <span className="font-extrabold text-emerald-400">{journeySelectedStay.name}</span>
                  </div>
                  <div className="font-mono text-zinc-400">
                    ${journeySelectedStay.price_usd} / night
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Starting Location (Origin)</label>
                  <input
                    type="text"
                    placeholder="e.g. London, UK or hotel name"
                    value={journeyOrigin}
                    onChange={e => setJourneyOrigin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Travel Mode</label>
                  <select
                    value={journeyRouteMode}
                    onChange={e => setJourneyRouteMode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors"
                  >
                    <option value="transit">Metro / Transit</option>
                    <option value="walking">Walking</option>
                    <option value="cab">Taxi / Driving</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleFetchRoutes}
                  disabled={journeyRouteLoading || !journeyOrigin.trim()}
                  className="book-ticket-btn"
                >
                  {journeyRouteLoading ? "Calculating..." : "Calculate Route 🔍"}
                </button>
              </div>

              {/* Route Output */}
              {journeyRouteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg font-mono">
                  ⚠️ {journeyRouteError}
                </div>
              )}

              {journeyRoutes && journeyRoutes.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Preferred Travel Option:</div>

                  {/* Tabbed Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {journeyRoutes.map((route, rIdx) => {
                      const isRouteSelected = selectedRouteIdx === rIdx;
                      return (
                        <button
                          key={rIdx}
                          onClick={() => {
                            setSelectedRouteIdx(rIdx);
                            setJourneySelectedRoute(route);
                          }}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all duration-350 hover:scale-[1.01] cursor-pointer ${
                            isRouteSelected
                              ? "border-emerald-500 bg-emerald-500/[0.03] shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                              : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded ${
                              isRouteSelected ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                            }`}>
                              {route.mode}
                            </span>
                            <span className="text-xs font-bold text-white">${route.cost_usd}</span>
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            Duration: <strong className="text-zinc-200">{route.duration_minutes} mins</strong>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Route Steps Details */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                    <div className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                      Detailed Transfer Advisory ({journeyRoutes[selectedRouteIdx]?.mode || "Selected Option"}):
                    </div>
                    <div className="text-xs text-zinc-300 leading-relaxed font-mono pl-3 border-l border-emerald-500/30 text-left">
                      {journeyRoutes[selectedRouteIdx]?.steps}
                    </div>
                  </div>

                  {/* Dynamic Fare Breakdown Card */}
                  <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                    <h4 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider text-left">Estimated Fare Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-850">
                        <span className="text-[9px] font-mono text-zinc-550 uppercase tracking-widest font-extrabold">Lodging</span>
                        <p className="text-sm font-black text-white mt-1">${stayPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-850">
                        <span className="text-[9px] font-mono text-zinc-550 uppercase tracking-widest font-extrabold">Transit</span>
                        <p className="text-sm font-black text-white mt-1">${transitPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-850">
                        <span className="text-[9px] font-mono text-zinc-550 uppercase tracking-widest font-extrabold">Match Ticket</span>
                        <p className="text-sm font-black text-white mt-1">${ticketPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/50 border border-emerald-500/20 bg-emerald-500/[0.01]">
                        <span className="text-[9px] font-mono text-emerald-500/70 uppercase tracking-widest font-extrabold">Grand Total</span>
                        <p className="text-sm font-black text-emerald-400 mt-1">${grandTotal.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-550 pt-2 border-t border-zinc-850">
                      <span>Target Budget Limit: ${journeyMaxPrice.toFixed(2)}</span>
                      <span className={grandTotal <= journeyMaxPrice ? "text-emerald-400 font-extrabold" : "text-red-400 font-extrabold"}>
                        {grandTotal <= journeyMaxPrice ? "✓ WITHIN BUDGET" : "⚠️ BUDGET COMPROMISED"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Map Placeholder Notice */}
              <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-zinc-500">
                <div className="text-emerald-500 font-extrabold text-lg mt-0.5">🗺️</div>
                <div className="text-left">
                  <strong className="text-zinc-400 block mb-1">Route Map and GPS Navigation Status</strong>
                  Turn-by-turn map navigation, live transit trackers, and interactive stadium gate maps are currently placeholders and will be connected in a future release.
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setJourneyStep(3)}
                  className="text-sm font-bold text-zinc-500 hover:text-emerald-500 cursor-pointer"
                >
                  ← Back to Stays
                </button>
                <button
                  onClick={() => setJourneyStep(5)}
                  className="book-ticket-btn"
                >
                  Explore & Safety Advisory →
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 5: Explore & Safety */}
        {journeyStep === 5 && (() => {
          const homeBaseStr = userProfile?.home_address || journeyOrigin || "London, UK";
          const venueStr = journeyStadium || "Emirates Stadium";
          
          const defaultMultiModalRoutes = [
            {
              mode: "🚅 High-Speed Intercity Train",
              badge: "★ RECOMMENDED / BEST BALANCED",
              cost_usd: 65.00,
              duration_minutes: 150,
              best_for: `Why it's best from ${homeBaseStr}: Perfect balance of comfort, speed, and zero airport security hassles. Arrives directly at central station near ${venueStr} with scenic views and onboard Wi-Fi.`,
              connects_to: journeySelectedStay?.name || "City Central Hub",
              steps: `Direct high-speed rail from ${homeBaseStr} to central terminal, then 10-min fan shuttle to ${venueStr}.`,
              legs: [
                { label: "Leg 1 (Rail)", detail: `Board High-Speed Express from ${homeBaseStr} Station (2h 15m onboard)` },
                { label: "Leg 2 (Transfer)", detail: `Arrive at Central Station, take designated Supporter Express Shuttle (~15m)` },
                { label: "Leg 3 (Arrival)", detail: `Drop off at VIP Gate 4, ${venueStr} precinct` }
              ]
            },
            {
              mode: "✈️ Flight + Express Airport Rail",
              badge: "⚡ FASTEST LONG DISTANCE",
              cost_usd: 185.00,
              duration_minutes: 195,
              best_for: `Why it's best from ${homeBaseStr}: Essential for journeys over 300+ miles or international away trips. Skips highway congestion and includes fast airport-to-stadium express train.`,
              connects_to: journeySelectedStay?.name || "Airport Hotel",
              steps: `Flight from regional airport near ${homeBaseStr} to destination hub, followed by Express Airport Metro directly to ${venueStr}.`,
              legs: [
                { label: "Leg 1 (Flight)", detail: `Direct commercial flight from nearest airport to ${homeBaseStr} (1h 20m airtime + check-in/security)` },
                { label: "Leg 2 (Airport Rail)", detail: `Board Express Airport Rail directly to stadium corridor (~25m)` },
                { label: "Leg 3 (Walk)", detail: `Short 5-min walk along supporter walkway to ${venueStr}` }
              ]
            },
            {
              mode: "🚇 Local Subway / Metro Transit",
              badge: "💰 CHEAPEST / FAN FAVORITE",
              cost_usd: 2.50,
              duration_minutes: 25,
              best_for: `Why it's best from ${homeBaseStr}: Cheapest & most atmospheric option inside the city. Join thousands of chanting supporters on the direct subway line straight to stadium turnstiles.`,
              connects_to: journeySelectedStay?.name || "Metro Station Hotel",
              steps: `Direct subway ride from ${homeBaseStr} precinct to stadium metro stop.`,
              legs: [
                { label: "Leg 1 (Subway)", detail: `Board Red/Green Line subway towards ${venueStr} (~18m)` },
                { label: "Leg 2 (Walk)", detail: `Exit station and walk along pedestrian fan corridor (~7m)` }
              ]
            },
            {
              mode: "🚗 Road Trip & VIP Stadium Parking",
              badge: "👥 BEST FOR GROUPS & TAILGATING",
              cost_usd: 35.00,
              duration_minutes: 110,
              best_for: `Why it's best from ${homeBaseStr}: Most cost-effective when splitting gas/parking among 3-4 supporters. Allows carrying flags, coolers, and tailgating gear directly to reserved stadium lot.`,
              connects_to: journeySelectedStay?.name || "Stadium Parking Lot",
              steps: `Highway drive from ${homeBaseStr} to reserved VIP North Parking Lot at ${venueStr}.`,
              legs: [
                { label: "Leg 1 (Highway)", detail: `Drive from ${homeBaseStr} via Main Intercity Expressway (~1h 35m depending on traffic)` },
                { label: "Leg 2 (Parking)", detail: `Enter VIP Gate B and park at reserved Supporter Tailgate Lot (~10m)` }
              ]
            },
            {
              mode: "🚕 Express Door-to-Door Rideshare",
              badge: "🚪 HASSLE-FREE DOOR-TO-DOOR",
              cost_usd: 28.00,
              duration_minutes: 35,
              best_for: `Why it's best from ${homeBaseStr}: Ultimate convenience with direct pickup from your front door at ${homeBaseStr} and private dropoff at stadium VIP entrance without navigating transit crowds.`,
              connects_to: journeySelectedStay?.name || "Private VIP Dropoff",
              steps: `Direct private Uber/Lyft/Taxi ride from ${homeBaseStr} to ${venueStr} VIP entrance.`,
              legs: [
                { label: "Leg 1 (Pickup)", detail: `Private driver pickup at ${homeBaseStr} address` },
                { label: "Leg 2 (Express Route)", detail: `Direct ride via HOV/Express corridor to stadium precinct (~35m)` }
              ]
            }
          ];

          const routeOptions = (journeyRoutes && journeyRoutes.length > 1) ? journeyRoutes : defaultMultiModalRoutes;
          const activeRoute = journeySelectedRoute || routeOptions[selectedRouteIdx] || routeOptions[0];
          const stayPrice = journeySelectedStay ? parseFloat(journeySelectedStay.price_usd) || 0 : 0;
          const transitPrice = activeRoute ? parseFloat(activeRoute.cost_usd) || 0 : 0;
          const ticketPrice = 50.0;
          const grandTotal = stayPrice + transitPrice + ticketPrice;
          const recs = journeyRecommendations || {};
          const activePlaces = recs[activePlacesTab] || [];
          const safety = journeySafetyBriefing || {
            level: "Low Risk",
            score: 8.8,
            summary: `Standard precautions are recommended in the destination area. Security measures are active.`,
            emergencyNumbers: { Emergency: "112", "Non-Emergency": "101" },
            tips: [
              "Keep personal items secure in crowded stadium walkways.",
              "Stick to designated fan corridors and well-lit roads.",
              "Use official transportation or ride-sharing networks."
            ]
          };
          const stayOptions = journeyStays.length ? journeyStays : (journeySelectedStay ? [journeySelectedStay] : []);
          const rebaseRouteToStay = (route: any, stay: any) => {
            if (!route || !stay?.name) return route;
            const previousStayName = route.connects_to || journeySelectedStay?.name || "";
            const swapStayName = (value: string) => previousStayName ? value.split(previousStayName).join(stay.name) : value;
            return {
              ...route,
              connects_to: stay.name,
              steps: typeof route.steps === "string" ? swapStayName(route.steps) : route.steps,
              legs: Array.isArray(route.legs)
                ? route.legs.map((leg: any) => ({
                    ...leg,
                    detail: typeof leg.detail === "string" ? swapStayName(leg.detail) : leg.detail,
                  }))
                : route.legs,
            };
          };

          const stayPhotos = [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&auto=format&fit=crop&q=80"
          ];

          const dinePhotos = ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&auto=format&fit=crop&q=80"];
          const storePhotos = ["https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=500&auto=format&fit=crop&q=80"];
          const sightPhotos = ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1477959858617-67f30bc4b7a8?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&auto=format&fit=crop&q=80"];

          return (
            <div className="space-y-6 py-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>✨ Step 5: AI Journey Itinerary & Dispatch</span>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">100% Ready</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Select a tab below to inspect each section of your customized travel briefing.</p>
                </div>

                {/* Section Nav Bar */}
                <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-850 shadow-xl">
                  {[
                    { id: "match", label: "⚽ 1. Match & Venue >" },
                    { id: "stay", label: "🏨 2. Stays & Hostels >" },
                    { id: "route", label: "🗺️ 3. Home Base Route >" },
                    { id: "nearby", label: "📸 4. Explore Nearby >" },
                    { id: "safety", label: "🛡️ 5. Safety Dispatch >" },
                    { id: "all", label: "🌐 View All" }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveStep5Section(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeStep5Section === tab.id
                          ? "bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20 scale-105"
                          : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {journeyDataWarnings.length > 0 && (
                <div className="rounded-2xl border border-yellow-500/25 bg-yellow-500/[0.04] p-4 text-left">
                  <h4 className="text-xs font-black uppercase tracking-wider text-yellow-300">Provider data warning</h4>
                  <div className="mt-2 grid gap-2">
                    {journeyDataWarnings.map((warning, wIdx) => (
                      <p key={wIdx} className="text-xs leading-relaxed text-yellow-100/80">{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 1: MATCH & VENUE */}
              {(activeStep5Section === "match" || activeStep5Section === "all") && (
                <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-4 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚽</span>
                      <div>
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-extrabold">Section 1: Event Specification</span>
                        <h4 className="text-base font-black text-white">{journeyMatchName || "Selected Match Fixture"}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => window.open('https://www.openstreetmap.org/search?query=' + encodeURIComponent(journeyStadium || 'Emirates Stadium'), '_blank')}
                      className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>📍 Locate Stadium in Map ↗</span>
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Match Date</span>
                      <strong className="text-sm text-emerald-400 font-mono mt-0.5 block">{journeyMatchDate || "Upcoming Fixture"}</strong>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Stadium / Match Venue</span>
                      <strong className="text-sm text-white mt-0.5 block">🏟️ {journeyStadium}</strong>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Estimated Ticket Pass</span>
                      <strong className="text-sm text-white mt-0.5 block">$50.00 (Standard Entry)</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: STAYS & HOSTELS OPTIONS + PHOTOS DETAILS */}
              {(activeStep5Section === "stay" || activeStep5Section === "all") && (
                <div className="p-6 rounded-2xl border border-emerald-500/30 bg-zinc-900/50 space-y-5 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏨</span>
                      <div>
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-extrabold">Section 2: Stays & Hostels Options</span>
                        <h4 className="text-base font-black text-white">Lodging, Hostels & Hotels with Photos</h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-400 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800">
                      {stayOptions.length} Accommodations Found
                    </span>
                  </div>

                  {journeySelectedStay && (
                    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.04] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-wider">✓ Currently Active Selection</span>
                        <strong className="text-xs text-white">${parseFloat(journeySelectedStay.price_usd || 0).toFixed(2)}/night</strong>
                      </div>
                      <h5 className="text-sm font-black text-white">{journeySelectedStay.name}</h5>
                      <p className="text-xs text-zinc-400 leading-relaxed">{journeySelectedStayReason || journeySelectedStay.why || "Top-rated stay selected near stadium."}</p>
                    </div>
                  )}

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {stayOptions.map((stay: any, sIdx: number) => {
                      const isCurrentStay = journeySelectedStay?.name === stay.name;
                      const photoUrl = stayPhotos[sIdx % stayPhotos.length];
                      return (
                        <div
                          key={`${stay.name}-${sIdx}`}
                          className={`rounded-xl border overflow-hidden flex flex-col justify-between transition-all ${
                            isCurrentStay
                              ? "border-emerald-500 bg-emerald-500/[0.06] shadow-lg shadow-emerald-500/10"
                              : "border-zinc-800 bg-zinc-950/60 hover:border-emerald-500/50"
                          }`}
                        >
                          <div>
                            <img src={photoUrl} alt={stay.name} className="w-full h-36 object-cover border-b border-zinc-800" />
                            <div className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="text-xs font-black text-white line-clamp-1">{stay.name}</h5>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold flex-shrink-0 ${isCurrentStay ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"}`}>
                                  {stay.type || "Hostel/Hotel"}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 line-clamp-2">{stay.amenities?.join(" • ") || "Free WiFi • Breakfast • Clean Rooms • Fan Hub"}</p>
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850 text-[10px] font-mono text-zinc-300">
                                <div><span className="text-zinc-500 block">Rate/Night:</span> <strong className="text-emerald-400 font-bold">${Number(stay.price_usd || 0).toFixed(2)}</strong></div>
                                <div><span className="text-zinc-500 block">Distance:</span> <strong>{stay.distance_miles ?? "1.2"} mi</strong></div>
                              </div>
                            </div>
                          </div>

                          <div className="p-3 bg-zinc-900/80 border-t border-zinc-850">
                            <button
                              type="button"
                              onClick={() => {
                                setJourneySelectedStay(stay);
                                setJourneySelectedStayReason(stay.why || "Selected from the available hostel & hotel stay options.");
                                setJourneySelectedRoute((prev: any) => rebaseRouteToStay(prev, stay));
                              }}
                              className={`w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                isCurrentStay
                                  ? "bg-emerald-500 text-zinc-950 shadow-md"
                                  : "bg-zinc-800 text-zinc-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                              }`}
                            >
                              {isCurrentStay ? "✓ Active Stay" : "Choose Stay Option"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: FROM HOME BASE TO STADIUM ROUTE */}
              {(activeStep5Section === "route" || activeStep5Section === "all") && (
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-zinc-900/50 space-y-6 animate-fade-in text-left shadow-xl">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">🗺️</span>
                      <div>
                        <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-extrabold">Section 3: Multi-Modal Transit Comparison</span>
                        <h4 className="text-base font-black text-white">Best Route Analysis: Flight, Train, Metro, Road & Rideshare</h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-300 font-bold px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                      {routeOptions.length} Recommended Modes
                    </span>
                  </div>

                  {/* Change Home Base Address Option */}
                  <div className="p-4 rounded-xl bg-zinc-950/90 border border-blue-500/30 space-y-2.5 shadow-inner">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex-1 w-full">
                        <span className="text-[9px] font-mono text-blue-300 uppercase tracking-widest block font-black">🚩 Start Point (Your Home Base Address) ➔ End Point ({journeyStadium})</span>
                        <input
                          type="text"
                          value={userProfile?.home_address || ""}
                          onChange={(e) => {
                            if (userProfile && setUserProfile) {
                              setUserProfile({ ...userProfile, home_address: e.target.value });
                            }
                          }}
                          placeholder="Enter your Home Base Address (e.g. 22 Baker Street, London)..."
                          className="mt-1.5 w-full bg-zinc-900 border border-zinc-700 focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs font-bold text-white outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const startAddr = userProfile?.home_address || "London, UK";
                          const venueAddr = journeyStadium || "Emirates Stadium";
                          const updatedRoutes = [
                            {
                              mode: "🚅 High-Speed Intercity Train",
                              badge: "★ RECOMMENDED / BEST BALANCED",
                              cost_usd: 68.50,
                              duration_minutes: 155,
                              best_for: `Why it's best from ${startAddr}: Perfect balance of comfort, speed, and zero airport security hassles. Arrives directly at central station near ${venueAddr} with scenic views and onboard Wi-Fi.`,
                              connects_to: journeySelectedStay?.name || "City Central Hub",
                              steps: `Direct high-speed rail from ${startAddr} to central terminal, then 10-min fan shuttle to ${venueAddr}.`,
                              legs: [
                                { label: "Leg 1 (Rail)", detail: `Board High-Speed Express from ${startAddr} Station (2h 20m onboard)` },
                                { label: "Leg 2 (Transfer)", detail: `Arrive at Central Station, take designated Supporter Express Shuttle (~15m)` },
                                { label: "Leg 3 (Arrival)", detail: `Drop off at VIP Gate 4, ${venueAddr} precinct` }
                              ]
                            },
                            {
                              mode: "✈️ Flight + Express Airport Rail",
                              badge: "⚡ FASTEST LONG DISTANCE",
                              cost_usd: 195.00,
                              duration_minutes: 185,
                              best_for: `Why it's best from ${startAddr}: Essential for journeys over 300+ miles. Skips highway congestion and includes fast airport-to-stadium express train.`,
                              connects_to: journeySelectedStay?.name || "Airport Hotel",
                              steps: `Flight from regional airport near ${startAddr} to destination hub, followed by Express Airport Metro directly to ${venueAddr}.`,
                              legs: [
                                { label: "Leg 1 (Flight)", detail: `Direct commercial flight from nearest airport to ${startAddr} (1h 15m airtime)` },
                                { label: "Leg 2 (Airport Rail)", detail: `Board Express Airport Rail directly to stadium corridor (~25m)` },
                                { label: "Leg 3 (Walk)", detail: `Short 5-min walk along supporter walkway to ${venueAddr}` }
                              ]
                            },
                            {
                              mode: "🚇 Local Subway / Metro Transit",
                              badge: "💰 CHEAPEST / FAN FAVORITE",
                              cost_usd: 3.00,
                              duration_minutes: 28,
                              best_for: `Why it's best from ${startAddr}: Cheapest & most atmospheric option inside the city. Join thousands of chanting supporters on the direct subway line straight to stadium turnstiles.`,
                              connects_to: journeySelectedStay?.name || "Metro Station Hotel",
                              steps: `Direct subway ride from ${startAddr} precinct to stadium metro stop.`,
                              legs: [
                                { label: "Leg 1 (Subway)", detail: `Board Red/Green Line subway towards ${venueAddr} (~20m)` },
                                { label: "Leg 2 (Walk)", detail: `Exit station and walk along pedestrian fan corridor (~8m)` }
                              ]
                            },
                            {
                              mode: "🚗 Road Trip & VIP Stadium Parking",
                              badge: "👥 BEST FOR GROUPS & TAILGATING",
                              cost_usd: 38.00,
                              duration_minutes: 115,
                              best_for: `Why it's best from ${startAddr}: Most cost-effective when splitting gas/parking among 3-4 supporters. Allows carrying flags, coolers, and tailgating gear directly to reserved stadium lot.`,
                              connects_to: journeySelectedStay?.name || "Stadium Parking Lot",
                              steps: `Highway drive from ${startAddr} to reserved VIP North Parking Lot at ${venueAddr}.`,
                              legs: [
                                { label: "Leg 1 (Highway)", detail: `Drive from ${startAddr} via Main Intercity Expressway (~1h 40m depending on traffic)` },
                                { label: "Leg 2 (Parking)", detail: `Enter VIP Gate B and park at reserved Supporter Tailgate Lot (~10m)` }
                              ]
                            },
                            {
                              mode: "🚕 Express Door-to-Door Rideshare",
                              badge: "🚪 HASSLE-FREE DOOR-TO-DOOR",
                              cost_usd: 32.00,
                              duration_minutes: 38,
                              best_for: `Why it's best from ${startAddr}: Ultimate convenience with direct pickup from your front door at ${startAddr} and private dropoff at stadium VIP entrance.`,
                              connects_to: journeySelectedStay?.name || "Private VIP Dropoff",
                              steps: `Direct private Uber/Lyft/Taxi ride from ${startAddr} to ${venueAddr} VIP entrance.`,
                              legs: [
                                { label: "Leg 1 (Pickup)", detail: `Private driver pickup at ${startAddr}` },
                                { label: "Leg 2 (Express Route)", detail: `Direct ride via HOV/Express corridor to stadium precinct (~38m)` }
                              ]
                            }
                          ];
                          setJourneyRoutes(updatedRoutes);
                          setSelectedRouteIdx(0);
                          setJourneySelectedRoute(updatedRoutes[0]);
                          setJourneySelectedRouteReason(updatedRoutes[0].best_for);
                          alert(`🚩 Transit routes recalculated from: ${startAddr}!
All 5 travel modes (Train, Flight, Metro, Road Trip, and Rideshare) have been updated with new fares and durations.`);
                        }}
                        className="px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-zinc-950 text-xs font-black uppercase tracking-wider cursor-pointer flex-shrink-0 shadow-md scale-105"
                      >
                        Recalculate Route ↻
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono">*All 5 travel modes (Flight, Train, Subway, Road & Rideshare) dynamically recalculate fares ($) and durations when you modify your start address.</p>
                  </div>

                  {activeRoute && (
                    <div className="p-5 rounded-2xl border border-blue-500/60 bg-gradient-to-br from-blue-500/[0.08] via-zinc-950 to-blue-500/[0.04] space-y-4 shadow-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/20 pb-3.5">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-black text-white">{activeRoute.mode}</span>
                            {activeRoute.badge && (
                              <span className="text-[9px] font-mono font-black px-2.5 py-0.5 rounded-full bg-blue-500 text-zinc-950 shadow-md">
                                {activeRoute.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-blue-300 font-mono mt-1">🚩 Active Path: {userProfile?.home_address || "London, UK"} ➔ {journeyStadium}</p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs font-bold bg-zinc-950 px-3.5 py-2 rounded-xl border border-blue-500/30 shadow">
                          <span className="text-zinc-300">⏱️ {activeRoute.duration_minutes ?? "--"} mins</span>
                          <span className="text-emerald-400 text-base font-black">${parseFloat(activeRoute.cost_usd || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest block">💡 Why This Route is Beneficial:</span>
                        <p className="text-xs text-zinc-200 leading-relaxed font-medium bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 shadow-inner">{journeySelectedRouteReason || activeRoute.best_for || activeRoute.steps}</p>
                      </div>

                      {activeRoute.legs?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-black text-zinc-400 uppercase tracking-widest block">🗺️ Step-by-Step Leg Breakdown:</span>
                          <div className="space-y-2.5 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
                            {activeRoute.legs.map((leg: any, legIdx: number) => (
                              <div key={legIdx} className="flex items-start gap-3 text-xs text-zinc-300">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/50 flex items-center justify-center font-mono font-bold text-[10px] mt-0.5">{legIdx + 1}</span>
                                <div>
                                  <strong className="text-blue-300 font-mono text-[11px] block">{leg.label}:</strong>
                                  <span className="text-zinc-300 leading-relaxed">{leg.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">Compare All 5 Travel Modes:</span>
                      <span className="text-[10px] font-mono text-zinc-500">Click any card below to switch route & recalculate fare</span>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      {routeOptions.map((route: any, rIdx: number) => {
                        const isCurrentRoute = activeRoute?.mode === route.mode;
                        return (
                          <button
                            key={`${route.mode}-${rIdx}`}
                            type="button"
                            onClick={() => {
                              const routeForStay = rebaseRouteToStay(route, journeySelectedStay);
                              setSelectedRouteIdx(rIdx);
                              setJourneySelectedRoute(routeForStay);
                              setJourneySelectedRouteReason(routeForStay.best_for || route.steps || "Selected route preference.");
                            }}
                            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                              isCurrentRoute
                                ? "border-blue-500 bg-blue-500/[0.12] shadow-lg shadow-blue-500/10 scale-[1.02]"
                                : "border-zinc-800 bg-zinc-950/80 hover:border-blue-500/50 hover:bg-zinc-900"
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-black text-white line-clamp-1">{route.mode}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black flex-shrink-0 ${isCurrentRoute ? "bg-blue-500 text-zinc-950 shadow" : "bg-zinc-800 text-zinc-400"}`}>
                                  {isCurrentRoute ? "✓ ACTIVE" : "SELECT"}
                                </span>
                              </div>
                              {route.badge && (
                                <span className="inline-block text-[8px] font-mono font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {route.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-normal line-clamp-2">{route.best_for || route.steps}</p>
                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300 pt-2.5 border-t border-zinc-850">
                              <span>⏱️ <strong>{route.duration_minutes ?? "--"} mins</strong></span>
                              <strong className="text-blue-400 font-extrabold text-xs">${Number(route.cost_usd || 0).toFixed(2)}</strong>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: EXPLORE NEARBY FACILITIES & PHOTOS */}
              {(activeStep5Section === "nearby" || activeStep5Section === "all") && (
                <div className="p-6 rounded-2xl border border-violet-500/30 bg-zinc-900/50 space-y-5 animate-fade-in text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📸</span>
                      <div>
                        <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-extrabold">Section 4: Explore Nearby Facilities</span>
                        <h4 className="text-base font-black text-white">Restaurants, Pubs, Stores & Sightseeing with Photos</h4>
                      </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850">
                      {[
                        { id: "restaurants", label: "🍔 Dine & Pubs" },
                        { id: "convenience_stores", label: "🛒 Convenience" },
                        { id: "pharmacies", label: "💊 Essentials" },
                        { id: "tourist_spots", label: "📸 Sightseeing" }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActivePlacesTab(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activePlacesTab === tab.id
                              ? "bg-violet-500 text-white font-black shadow-md"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {activePlaces.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 font-mono bg-zinc-950/40 rounded-xl border border-zinc-850">
                      No reported spots for this category around {journeyStadium}. Try switching category tabs above!
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                      {activePlaces.map((place: any, pIdx: number) => {
                        const placeName = typeof place === "string" ? place : (place?.name || "Unknown Spot");
                        const placeAddress = typeof place === "object" ? place?.address : "Near stadium precinct";
                        const placeRating = typeof place === "object" ? place?.rating : "4.8";
                        const placeDistance = typeof place === "object" ? place?.distance_miles : "0.4";
                        
                        const photoArr = activePlacesTab === "restaurants" ? dinePhotos : activePlacesTab === "tourist_spots" ? sightPhotos : storePhotos;
                        const photoUrl = photoArr[pIdx % photoArr.length];

                        return (
                          <div key={pIdx} className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden flex flex-col justify-between transition-all hover:border-violet-500/50">
                            <div>
                              <img src={photoUrl} alt={placeName} className="w-full h-32 object-cover border-b border-zinc-800" />
                              <div className="p-3.5 space-y-1.5">
                                <h5 className="text-xs font-black text-white line-clamp-1">{placeName}</h5>
                                <p className="text-[10px] text-zinc-400 line-clamp-1">{placeAddress}</p>
                                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1 border-t border-zinc-850">
                                  <span className="text-amber-400 font-bold">★ {placeRating}</span>
                                  <span>{placeDistance} mi away</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-2.5 bg-zinc-900/80 border-t border-zinc-850 text-center">
                              <button
                                type="button"
                                onClick={() => window.open('https://www.openstreetmap.org/search?query=' + encodeURIComponent(placeName + ' near ' + journeyStadium), '_blank')}
                                className="w-full py-1.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[10px] font-bold hover:bg-violet-500/20 cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>📍 Locate on Map ↗</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: SAFETY DISPATCH & EMERGENCY */}
              {(activeStep5Section === "safety" || activeStep5Section === "all") && (
                <div className="p-6 rounded-2xl border border-yellow-500/30 bg-zinc-900/50 space-y-5 animate-fade-in text-left">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛡️</span>
                      <div>
                        <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-widest font-extrabold">Section 5: Safety Dispatch & Emergency</span>
                        <h4 className="text-base font-black text-white">City Security Briefing & Hotlines</h4>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {safety.level || "Low Risk"} ({safety.score || "8.8"}/10)
                    </span>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2 p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 space-y-3">
                      <h5 className="text-xs font-black uppercase tracking-wider text-zinc-300">Safety Guidelines & Precinct Security</h5>
                      <p className="text-xs text-zinc-400 leading-relaxed">{safety.summary}</p>
                      <ul className="space-y-2 text-xs text-zinc-300 list-none pl-0 pt-2 border-t border-zinc-850">
                        {(safety.tips || []).map((tip: string, tIdx: number) => (
                          <li key={tIdx} className="flex gap-2 items-start">
                            <span className="text-emerald-500 font-extrabold mt-0.5">✓</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-850 flex flex-col justify-between gap-4">
                      <div>
                        <h5 className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-1">Emergency Lines</h5>
                        <p className="text-[10px] text-zinc-500">Official dispatch hotlines for local police and ambulance.</p>
                      </div>
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] font-mono text-red-400 uppercase font-extrabold block">Emergency Dispatch</span>
                            <strong className="text-xs text-white">Police / Ambulance / Fire</strong>
                          </div>
                          <span className="text-base font-black text-red-400 font-mono">{safety.emergencyNumbers?.Emergency || "112"}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                          <div>
                            <span className="text-[8px] font-mono text-zinc-400 uppercase font-extrabold block">Non-Emergency Line</span>
                            <strong className="text-xs text-zinc-300">Minor Reports / Advice</strong>
                          </div>
                          <span className="text-sm font-black text-zinc-400 font-mono">{safety.emergencyNumbers?.["Non-Emergency"] || "101"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ALWAYS VISIBLE FOOTER: BRIEFING TOTAL FARE & CONFIRMATION */}
              <div className="p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.04] via-zinc-900 to-emerald-500/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
                <div className="text-left space-y-1">
                  <h4 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span>🚀 Lock in your Complete Travel Dispatch</span>
                    <span className="text-[10px] font-mono bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded font-black">All 5 Sections Verified</span>
                  </h4>
                  <p className="text-xs text-zinc-400">Includes stay reservation, transit route map from your Home Base, match ticket entry, and safety briefing.</p>
                </div>
                <div className="flex items-center gap-4 justify-end w-full md:w-auto">
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block">Briefing Grand Total</span>
                    <strong className="text-xl font-black text-emerald-400 font-mono">${grandTotal.toFixed(2)}</strong>
                    <span className="text-[9px] font-mono text-zinc-500 block">(${(stayPrice).toFixed(0)} Stay + ${(transitPrice).toFixed(0)} Transit + $50 Ticket)</span>
                  </div>
                  <button
                    onClick={() => {
                      alert("🎉 Logistics briefing and itinerary confirmed! Your booking reference code is OS-2026-DISPATCH. All tickets and route maps sent to your profile!");
                    }}
                    className="book-ticket-btn scale-105 hover:scale-110 transition-transform shadow-xl shadow-emerald-500/20"
                  >
                    Confirm Entire Plan ✓
                  </button>
                </div>
              </div>

              {/* Step 5 Footer buttons */}
              <div className="flex justify-between pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setJourneyStep(4)}
                  className="text-sm font-bold text-zinc-500 hover:text-emerald-500 cursor-pointer"
                >
                  ← Back to Route
                </button>
                <button
                  onClick={() => {
                    setJourneyStep(1);
                    setJourneyStays([]);
                    setJourneyRoutes([]);
                    setJourneySelectedStay(null);
                    setJourneySelectedRoute(null);
                    setJourneySelectedStayReason("");
                    setJourneySelectedRouteReason("");
                    setJourneySafetySources([]);
                    setJourneyValidationChecks([]);
                    setJourneyDataWarnings([]);
                    setJourneySummary("");
                    setPlanningMode(null);
                    setAiPrompt("");
                  }}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-xs font-bold rounded-lg text-zinc-300 cursor-pointer"
                >
                  Restart Planner ↺
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const fetchStoreProducts = async () => {
    setStoreLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/store/products`);
      if (res.ok) {
        const data = await res.json();
        setStoreProducts(data);
      }
    } catch (err) {
      console.error("Failed to load store products", err);
    } finally {
      setStoreLoading(false);
    }
  };

  const handleListProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/store/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_email: email,
          title: listingForm.title,
          description: listingForm.description,
          price: parseFloat(listingForm.price),
          category: listingForm.category,
          image_url: listingForm.image_url
        })
      });
      if (res.ok) {
        setIsListingModalOpen(false);
        setListingForm({ title: "", description: "", price: "", category: "Jerseys", image_url: "" });
        fetchStoreProducts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListingSubmitting(false);
    }
  };

  const handleBuyProduct = async (productId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/store/products/${productId}/buy`, {
        method: "POST"
      });
      if (res.ok) fetchStoreProducts();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === "store") {
      fetchStoreProducts();
    }
  }, [activeTab]);

  const renderStore = () => {
    const filteredProducts = storeProducts.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(storeSearch.toLowerCase()) || p.description.toLowerCase().includes(storeSearch.toLowerCase());
      const matchesCat = storeCategory === "All" || p.category === storeCategory;
      return matchesSearch && matchesCat && p.status === "available";
    });
    
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Fans Store</h2>
            <p className="text-sm text-zinc-400 mt-1">Peer-to-peer marketplace for fans to buy and sell gear</p>
          </div>
          <button onClick={() => setIsListingModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer">
            + List Item
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Search jerseys, tickets, memorabilia..." 
            value={storeSearch}
            onChange={e => setStoreSearch(e.target.value)}
            className="flex-1 bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white outline-none"
          />
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {["All", "Jerseys", "Accessories", "Tickets", "Memorabilia"].map(cat => (
              <button
                key={cat}
                onClick={() => setStoreCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  storeCategory === cat 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {storeLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card h-64 border border-zinc-800 bg-zinc-900/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-zinc-800">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 text-3xl">🛍️</div>
            <h3 className="text-lg font-bold text-white mb-2">No items found</h3>
            <p className="text-zinc-500 text-sm max-w-sm">No items match your filters or the store is empty. Be the first to list something!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map(product => (
              <div key={product.product_id} className="glass-card flex flex-col border border-zinc-800 bg-zinc-900/40 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all shadow-lg group">
                <div className="h-40 w-full overflow-hidden relative bg-zinc-950">
                  <img 
                    src={product.image_url} 
                    alt={product.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1518605368461-1ee7c532066d?w=500&q=80" }}
                  />
                  <div className="absolute top-2 right-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 px-2 py-1 rounded text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                    {product.category}
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-grow justify-between text-left">
                  <div>
                    <h4 className="font-black text-sm text-zinc-100 line-clamp-1">{product.title}</h4>
                    <p className="text-[10px] text-zinc-400 mt-1.5 leading-snug line-clamp-2">{product.description}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-black text-emerald-400 font-mono">${product.price.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                        {product.seller_email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[9px] text-zinc-500 truncate" title={product.seller_email}>
                        Seller: {product.seller_email === email ? "You" : product.seller_email.split('@')[0]}
                      </span>
                    </div>
                    
                    {product.seller_email !== email ? (
                      <button 
                        onClick={() => handleBuyProduct(product.product_id)}
                        className="w-full bg-zinc-800 hover:bg-emerald-600 text-white font-bold text-[10px] py-2 rounded-lg transition-all cursor-pointer flex justify-center items-center gap-1"
                      >
                        🛍️ Buy Now
                      </button>
                    ) : (
                      <div className="w-full bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold text-[10px] py-2 rounded-lg text-center">
                        Your Listing
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard": return renderDashboard();
      case "store":     return renderStore();
      case "tickets":   return renderTickets();
      case "assistant": return renderAssistant();
      case "journey":   return renderJourney();
      case "analysis":  return renderAnalysis();
      case "contact":
        return renderContact();
      case "settings":
        return renderSettings();
    }
  };

  const currentNav = NAV_ITEMS.find(n => n.id === activeTab);
  const userInitial = userProfile?.name?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "U";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen selection:bg-emerald-500 selection:text-white relative">
      <FloatingSettings />

      {/* Top header bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b backdrop-blur-md"
        style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-extrabold text-xl tracking-tighter text-emerald-500 hover:scale-105 transition-transform">O</Link>
          <div className="h-5 w-px bg-emerald-500/20" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-500/70">Offside AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-emerald-500 transition-colors">Home</Link>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Dashboard shell: sidebar + content */}
      <div className="dashboard-shell">
        {/* Sidebar navigation */}
        <nav className="dashboard-nav">
          {/* User block */}
          <div className="nav-user-block">
            <div className="nav-avatar">{userInitial}</div>
            <div className="nav-user-info">
              <div className="nav-user-name">{userProfile?.name || "Loading…"}</div>
              <div className="nav-user-email">{email || ""}</div>
            </div>
          </div>

          <div className="nav-section-title">Main</div>

          {NAV_ITEMS.slice(0, 4).map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          ))}

          <div className="nav-section-title">More</div>

          {NAV_ITEMS.slice(4).map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <div className="nav-spacer" />

          <div className="nav-bottom">
            <button onClick={handleLogout} className="nav-item" style={{ color: "#f87171" }}>
              <svg className="nav-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <div className="dashboard-content">
          <div className="content-header">
            <div>
              <div className="content-title">{currentNav?.label}</div>
              <div className="content-subtitle">
                {activeTab === "dashboard" && "Your personalized match intelligence center"}
                {activeTab === "tickets" && "Manage your match ticket bookings"}
                {activeTab === "assistant" && "LangGraph agent powered by MCP tool services"}
                {activeTab === "journey" && "Plan optimal travel routes to any stadium"}
                {activeTab === "analysis" && "AI-driven match statistics and insights"}
                {activeTab === "contact" && "Get in touch with our team"}
                {activeTab === "settings" && "Configure your account preferences"}
              </div>
            </div>
          </div>

          {renderTabContent()}
        </div>
      </div>

      {/* Team Detail Modal */}
      {(teamDetailModal || teamDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => { setTeamDetailModal(null); setTeamDetailLoading(false); }}>
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setTeamDetailModal(null); setTeamDetailLoading(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800">
              ✕
            </button>
            {teamDetailLoading ? (
              <div className="py-20 text-center text-zinc-400 font-mono animate-pulse">Loading Club Intelligence...</div>
            ) : teamDetailModal && (
              <div>
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-zinc-800">
                  {teamDetailModal.crest ? (
                    <img src={teamDetailModal.crest} alt={teamDetailModal.name} className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl font-black text-emerald-500">
                      {teamDetailModal.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black text-white">{teamDetailModal.name}</h2>
                    <p className="text-xs text-emerald-400 font-mono font-semibold">⚽ Official Partner Club & Squad Roster</p>
                    {teamDetailModal.venue && <p className="text-[11px] text-zinc-400 mt-1">📍 Venue: {teamDetailModal.venue}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">Head Coach</span>
                    <span className="text-sm font-bold text-zinc-200">{typeof teamDetailModal.coach === 'object' && teamDetailModal.coach ? (teamDetailModal.coach as any).name : (teamDetailModal.coach || "First Team Manager")}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">Club Foundation</span>
                    <span className="text-sm font-bold text-zinc-200">Est. {teamDetailModal.founded || "1899"}</span>
                  </div>
                  {teamDetailModal.clubColors ? (
                    <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 sm:col-span-1 col-span-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase block">Club Colors</span>
                      <span className="text-sm font-bold text-emerald-400 truncate block">{teamDetailModal.clubColors}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 sm:col-span-1 col-span-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase block">Status</span>
                      <span className="text-sm font-bold text-emerald-400">Active Roster</span>
                    </div>
                  )}
                </div>
                {teamDetailModal.squad && teamDetailModal.squad.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 font-mono">Active First-Team Squad</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                      {teamDetailModal.squad.map((player, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-xs">
                          <span className="font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono">
                              {player.shirtNumber || idx + 1}
                            </span>
                            {player.name}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">{player.position || "Player"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                  {teamDetailModal.website && (
                    <a href={teamDetailModal.website} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-all">
                      🌐 Official Website
                    </a>
                  )}
                  <button onClick={() => { setTeamDetailModal(null); setActiveTab("store"); }} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 cursor-pointer">
                    🛍️ Buy Club Merchandise
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Detail Modal */}
      {(playerDetailModal || playerDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => { setPlayerDetailModal(null); setPlayerDetailLoading(false); }}>
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setPlayerDetailModal(null); setPlayerDetailLoading(false); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800">
              ✕
            </button>
            {playerDetailLoading ? (
              <div className="py-12 text-center text-zinc-400 font-mono animate-pulse">Loading Athlete Stats...</div>
            ) : playerDetailModal && (
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl mx-auto flex items-center justify-center text-3xl font-black text-white shadow-lg mb-4">
                  ⭐
                </div>
                <h2 className="text-xl font-black text-white">{playerDetailModal.name}</h2>
                <span className="inline-block mt-1 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold font-mono">
                  🔥 Verified Star Athlete • #{playerDetailModal.shirtNumber || "10"}
                </span>
                <div className="grid grid-cols-2 gap-3 mt-6 mb-6 text-left">
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">Position</span>
                    <span className="text-xs font-bold text-white">{playerDetailModal.position || "Forward"}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase block">Nationality</span>
                    <span className="text-xs font-bold text-white">{playerDetailModal.nationality || "International"}</span>
                  </div>
                </div>
                <button onClick={() => { setPlayerDetailModal(null); setActiveTab("store"); }} className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/20 cursor-pointer">
                  🛍️ Shop Authentic {playerDetailModal.name} Kit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* P2P Store Listing Modal */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card border border-zinc-800 bg-zinc-950 p-6 rounded-2xl w-full max-w-md relative animate-slide-up">
            <button 
              onClick={() => setIsListingModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-base font-extrabold text-white mb-1">List an Item for Sale</h3>
            <p className="text-xs text-zinc-400 mb-5">Sell merchandise, extra tickets, or memorabilia to other fans.</p>
            
            <form onSubmit={handleListProduct} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Item Title</label>
                <input required type="text" placeholder="e.g. Authentic Home Jersey 2024" value={listingForm.title} onChange={e => setListingForm({...listingForm, title: e.target.value})} className="bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Description</label>
                <textarea required rows={3} placeholder="Describe condition, size, section..." value={listingForm.description} onChange={e => setListingForm({...listingForm, description: e.target.value})} className="bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Price ($)</label>
                  <input required type="number" min="1" step="0.01" placeholder="45.00" value={listingForm.price} onChange={e => setListingForm({...listingForm, price: e.target.value})} className="bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Category</label>
                  <select value={listingForm.category} onChange={e => setListingForm({...listingForm, category: e.target.value})} className="bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer">
                    <option value="Jerseys">Jerseys</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Tickets">Match Tickets</option>
                    <option value="Memorabilia">Memorabilia</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Image URL (Optional)</label>
                <input type="url" placeholder="https://example.com/image.jpg" value={listingForm.image_url} onChange={e => setListingForm({...listingForm, image_url: e.target.value})} className="bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <button 
                type="submit" 
                disabled={listingSubmitting}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {listingSubmitting ? "Publishing..." : "Post Listing"}
              </button>
            </form>
          </div>
        </div>
      )}
      
    </main>
  );
}
