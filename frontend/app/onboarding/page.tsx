"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getCurrentUser } from "../../lib/auth";
import FloatingSettings from "../../components/FloatingSettings";

interface TeamOption {
  id?: number;
  name: string;
  info: string;
  category: string;
  crest?: string;
}

interface LeagueConfig {
  value: string;
  label: string;
}

const FALLBACK_LEAGUES: LeagueConfig[] = [
  { value: "PL", label: "Premier League" },
  { value: "PD", label: "LaLiga" },
  { value: "SA", label: "Serie A" },
  { value: "BL1", label: "Bundesliga" },
  { value: "CL", label: "Champions League" },
];

const STATIC_TEAMS: Record<string, TeamOption[]> = {
  PL: [
    { name: "Arsenal", info: "Emirates Stadium", category: "PL", crest: "https://crests.football-data.org/57.png" },
    { name: "Chelsea", info: "Stamford Bridge", category: "PL", crest: "https://crests.football-data.org/61.png" },
    { name: "Liverpool", info: "Anfield", category: "PL", crest: "https://crests.football-data.org/64.png" },
    { name: "Manchester City", info: "Etihad Stadium", category: "PL", crest: "https://crests.football-data.org/65.png" },
    { name: "Manchester United", info: "Old Trafford", category: "PL", crest: "https://crests.football-data.org/66.png" },
    { name: "Tottenham Hotspur", info: "Tottenham Hotspur Stadium", category: "PL", crest: "https://crests.football-data.org/73.png" },
    { name: "Aston Villa", info: "Villa Park", category: "PL", crest: "https://crests.football-data.org/58.png" },
    { name: "Newcastle United", info: "St James' Park", category: "PL", crest: "https://crests.football-data.org/67.png" },
  ],
  PD: [
    { name: "Real Madrid CF", info: "Santiago Bernabéu", category: "PD", crest: "https://crests.football-data.org/86.png" },
    { name: "FC Barcelona", info: "Camp Nou", category: "PD", crest: "https://crests.football-data.org/81.png" },
    { name: "Club Atlético de Madrid", info: "Cívitas Metropolitano", category: "PD", crest: "https://crests.football-data.org/78.png" },
    { name: "Real Sociedad de Fútbol", info: "Reale Arena", category: "PD", crest: "https://crests.football-data.org/89.png" },
    { name: "Sevilla FC", info: "Ramón Sánchez Pizjuán", category: "PD", crest: "https://crests.football-data.org/95.png" },
    { name: "Girona FC", info: "Estadi Montilivi", category: "PD", crest: "https://crests.football-data.org/298.png" },
  ],
  SA: [
    { name: "Juventus FC", info: "Allianz Stadium", category: "SA", crest: "https://crests.football-data.org/109.png" },
    { name: "FC Internazionale Milano", info: "San Siro", category: "SA", crest: "https://crests.football-data.org/108.png" },
    { name: "AC Milan", info: "San Siro", category: "SA", crest: "https://crests.football-data.org/98.png" },
    { name: "SSC Napoli", info: "Diego Armando Maradona", category: "SA", crest: "https://crests.football-data.org/113.png" },
    { name: "AS Roma", info: "Stadio Olimpico", category: "SA", crest: "https://crests.football-data.org/100.png" },
    { name: "SS Lazio", info: "Stadio Olimpico", category: "SA", crest: "https://crests.football-data.org/110.png" },
  ],
  BL1: [
    { name: "FC Bayern München", info: "Allianz Arena", category: "BL1", crest: "https://crests.football-data.org/5.png" },
    { name: "Borussia Dortmund", info: "Signal Iduna Park", category: "BL1", crest: "https://crests.football-data.org/4.png" },
    { name: "Bayer 04 Leverkusen", info: "BayArena", category: "BL1", crest: "https://crests.football-data.org/3.png" },
    { name: "RB Leipzig", info: "Red Bull Arena", category: "BL1", crest: "https://crests.football-data.org/172.png" },
    { name: "VfB Stuttgart", info: "MHPArena", category: "BL1", crest: "https://crests.football-data.org/10.png" },
    { name: "Eintracht Frankfurt", info: "Deutsche Bank Park", category: "BL1", crest: "https://crests.football-data.org/19.png" },
  ],
};

interface SuperstarOption {
  name: string;
  club: string;
  country: string;
  initials: string;
  color: string;
}

const SUPERSTARS: SuperstarOption[] = [
  { name: "Lionel Messi", club: "Inter Miami CF", country: "Argentina", initials: "LM", color: "from-sky-400 to-blue-500" },
  { name: "Cristiano Ronaldo", club: "Al Nassr FC", country: "Portugal", initials: "CR", color: "from-red-500 to-green-600" },
  { name: "Erling Haaland", club: "Manchester City FC", country: "Norway", initials: "EH", color: "from-cyan-400 to-sky-600" },
  { name: "Kylian Mbappé", club: "Real Madrid CF", country: "France", initials: "KM", color: "from-blue-600 to-indigo-700" },
  { name: "Mohamed Salah", club: "Liverpool FC", country: "Egypt", initials: "MS", color: "from-red-600 to-amber-700" },
  { name: "Jude Bellingham", club: "Real Madrid CF", country: "England", initials: "JB", color: "from-amber-400 to-yellow-600" },
  { name: "Vinícius Júnior", club: "Real Madrid CF", country: "Brazil", initials: "VJ", color: "from-green-500 to-yellow-500" },
  { name: "Kevin De Bruyne", club: "Manchester City FC", country: "Belgium", initials: "KD", color: "from-sky-300 to-blue-600" },
];

interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: CountryOption[] = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<number>(1);
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Step 1: Teams state
  const [leagues, setLeagues] = useState<LeagueConfig[]>([]);
  const [activeLeague, setActiveLeague] = useState<string>("PL");
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [followedTeams, setFollowedTeams] = useState<string[]>([]);

  // Step 2: Players state
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);
  const [customPlayerInput, setCustomPlayerInput] = useState<string>("");

  // Step 3: Location state
  const [country, setCountry] = useState<string>("United Kingdom");
  const [city, setCity] = useState<string>("");
  const [stadium, setStadium] = useState<string>("");
  const [street, setStreet] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Authenticate user & load config
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "/signup";
      return;
    }
    setUserName(user.name);
    setEmail(user.email);

    async function fetchConfig() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/config`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.supported_leagues) && data.supported_leagues.length > 0) {
            setLeagues(data.supported_leagues);
            const hasPL = data.supported_leagues.some((l: any) => l.value === "PL");
            if (!hasPL) {
              setActiveLeague(data.supported_leagues[0].value);
            }
          } else {
            setLeagues(FALLBACK_LEAGUES);
          }
        } else {
          setLeagues(FALLBACK_LEAGUES);
        }
      } catch (err) {
        console.warn("Using fallback config in onboarding.", err);
        setLeagues(FALLBACK_LEAGUES);
      }
    }
    fetchConfig();
  }, []);

  // Fetch teams for active league
  useEffect(() => {
    let active = true;
    async function loadTeams() {
      setLoadingTeams(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/competitions/${activeLeague}/teams`);
        if (!res.ok) throw new Error("Failed to load league teams");
        const data = await res.json();
        if (active && data && Array.isArray(data.teams)) {
          const mapped = data.teams.map((t: any) => ({
            id: t.id,
            name: t.shortName || t.name,
            info: t.venue ? `${t.venue}` : t.name,
            category: activeLeague,
            crest: t.crest,
          }));
          setTeams(mapped);
        }
      } catch (err) {
        console.warn(`Falling back to static teams for league ${activeLeague}.`, err);
        if (active) {
          setTeams(STATIC_TEAMS[activeLeague] || STATIC_TEAMS["PL"]);
        }
      } finally {
        if (active) setLoadingTeams(false);
      }
    }
    loadTeams();
    return () => {
      active = false;
    };
  }, [activeLeague]);

  // Hashing helper to generate consistent coordinate values for mock visual map
  const getStadiumCoordinates = () => {
    if (!city && !stadium) return { lat: "51.5074° N", lon: "0.1278° W", name: "Greenwich Base" };
    const text = `${stadium || ""}-${city || ""}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Map hash to realistic coordinates
    const latNum = 20 + Math.abs(hash % 45); // Latitude (20 to 65 N)
    const lonNum = -120 + Math.abs((hash >> 2) % 150); // Longitude (-120 to 30)
    return {
      lat: `${latNum.toFixed(4)}° N`,
      lon: `${Math.abs(lonNum).toFixed(4)}° ${lonNum < 0 ? "W" : "E"}`,
      name: stadium || city || "Dashboard Station"
    };
  };

  const mapCoords = getStadiumCoordinates();

  // Step 1: Follow Team Toggle
  const toggleTeam = (teamName: string) => {
    if (followedTeams.includes(teamName)) {
      setFollowedTeams(followedTeams.filter((t) => t !== teamName));
    } else {
      setFollowedTeams([...followedTeams, teamName]);
    }
  };

  // Step 2: Superstar Toggle
  const toggleSuperstar = (playerName: string) => {
    if (favoritePlayers.includes(playerName)) {
      setFavoritePlayers(favoritePlayers.filter((p) => p !== playerName));
    } else {
      setFavoritePlayers([...favoritePlayers, playerName]);
    }
  };

  // Step 2: Custom player chips
  const addCustomPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customPlayerInput.trim();
    if (!name) return;
    if (!favoritePlayers.includes(name)) {
      setFavoritePlayers([...favoritePlayers, name]);
    }
    setCustomPlayerInput("");
  };

  const removePlayer = (playerName: string) => {
    setFavoritePlayers(favoritePlayers.filter((p) => p !== playerName));
  };

  // Submission handler
  const handleFinalSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/v1/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          followed_teams: followedTeams,
          favorite_players: favoritePlayers,
          country: country,
          city: city.trim(),
          stadium: stadium.trim(),
          street: street.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save onboarding selections in backend.");
      }

      // Sync followed teams to local storage so dashboard highlights them instantly
      const storageKey = `followed_teams:${email}`;
      localStorage.setItem(storageKey, JSON.stringify(followedTeams));

      // Successfully onboarded, route to Dashboard
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  // Filtered teams list based on search bar
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.info.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="onboarding-page font-sans selection:bg-emerald-500 selection:text-white relative">
      <FloatingSettings />

      <div className="onboarding-shell">
        {/* Onboarding Shell Card */}
        <section className="onboarding-card">
          {/* Header & Steps */}
          <div className="onboarding-header">
            <div className="onboarding-title-area">
              <h1 className="onboarding-title">Personalize Your Hub</h1>
              <p className="onboarding-subtitle">
                Welcome {userName || "User"}! Let's tailor the dashboard experience to you.
              </p>
            </div>

            {/* Stepper tracker */}
            <div className="steps-container">
              <div className="step-indicator">
                <span className={`step-number ${step === 1 ? "step-number-active" : step > 1 ? "step-number-done" : "step-number-pending"}`}>
                  {step > 1 ? "✓" : "1"}
                </span>
                <span className={`step-label ${step === 1 ? "step-label-active" : ""}`}>Teams</span>
              </div>

              <div className={`step-divider ${step >= 2 ? "step-divider-active" : ""}`} />

              <div className="step-indicator">
                <span className={`step-number ${step === 2 ? "step-number-active" : step > 2 ? "step-number-done" : "step-number-pending"}`}>
                  {step > 2 ? "✓" : "2"}
                </span>
                <span className={`step-label ${step === 2 ? "step-label-active" : ""}`}>Players</span>
              </div>

              <div className={`step-divider ${step >= 3 ? "step-divider-active" : ""}`} />

              <div className="step-indicator">
                <span className={`step-number ${step === 3 ? "step-number-active" : "step-number-pending"}`}>
                  3
                </span>
                <span className={`step-label ${step === 3 ? "step-label-active" : ""}`}>Address</span>
              </div>
            </div>
          </div>

          {/* Steps Display */}
          <div className="step-content-box">
            {step === 1 && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                    Choose Teams You Follow
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Select teams from major global competitions. We will load their matches and news onto your main board.
                  </p>
                </div>

                {/* Leagues Tab Selector */}
                {leagues.length > 0 && (
                  <div className="league-tab-row">
                    {leagues.map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => {
                          setActiveLeague(tab.value);
                          setSearchQuery("");
                        }}
                        className={`league-tab-btn ${activeLeague === tab.value ? "league-tab-btn-active" : ""}`}
                        type="button"
                      >
                        {tab.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Search Bar */}
                <div className="team-search-wrap">
                  <svg className="team-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="team-search-input font-medium"
                    placeholder="Type to filter teams..."
                    type="search"
                  />
                </div>

                {/* Team Selection List */}
                {loadingTeams ? (
                  <div className="py-24 text-center text-xs text-zinc-500 font-bold animate-pulse flex items-center justify-center gap-2">
                    <div className="squad-spinner" />
                    <span>Fetching active squad rosters...</span>
                  </div>
                ) : (
                  <div className="onboarding-grid">
                    {filteredTeams.map((team) => {
                      const isSelected = followedTeams.includes(team.name);
                      return (
                        <div
                          key={team.name}
                          onClick={() => toggleTeam(team.name)}
                          className={`selectable-card ${isSelected ? "selectable-card-active" : ""}`}
                        >
                          {/* Corner Checkmark */}
                          <div className="check-indicator">✓</div>

                          <div className="card-crest-wrapper">
                            {team.crest ? (
                              <img src={team.crest} alt={team.name} className="card-crest" />
                            ) : (
                              <div className="card-crest-fallback">
                                {team.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="card-title">{team.name}</span>
                          <span className="card-subtitle">{team.info}</span>
                        </div>
                      );
                    })}

                    {filteredTeams.length === 0 && (
                      <div className="col-span-full py-16 text-center text-xs text-zinc-400 font-medium italic">
                        No team matches your search query in this league.
                      </div>
                    )}
                  </div>
                )}

                {/* Selected summary */}
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 p-3 rounded-xl border border-emerald-500/20">
                  Followed Teams ({followedTeams.length}): {followedTeams.join(", ") || "None selected yet"}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                    Select Your Favorite Players
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Select superstars or insert custom players you want to follow.
                  </p>
                </div>

                {/* Superstars Selection Grid */}
                <div className="onboarding-grid">
                  {SUPERSTARS.map((player) => {
                    const isSelected = favoritePlayers.includes(player.name);
                    return (
                      <div
                        key={player.name}
                        onClick={() => toggleSuperstar(player.name)}
                        className={`selectable-card ${isSelected ? "selectable-card-active" : ""}`}
                      >
                        {/* Checkmark indicator */}
                        <div className="check-indicator">✓</div>

                        <div className={`player-avatar-wrapper bg-gradient-to-br ${player.color} text-white flex items-center justify-center font-black text-lg shadow-md`}>
                          {player.initials}
                        </div>
                        <span className="card-title">{player.name}</span>
                        <span className="card-subtitle">{player.club}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Players Chip Box */}
                <div className="custom-input-box">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Add other players
                  </h3>

                  <form onSubmit={addCustomPlayer} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="e.g. Bukayo Saka, Phil Foden, Son Heung-min"
                      className="auth-input flex-1"
                      value={customPlayerInput}
                      onChange={(e) => setCustomPlayerInput(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Add
                    </button>
                  </form>

                  {/* Rendered Chips Row */}
                  <div className="chips-row mt-3">
                    {favoritePlayers.map((player) => (
                      <span key={player} className="chip-tag animate-fade-in">
                        {player}
                        <button
                          type="button"
                          onClick={() => removePlayer(player)}
                          className="chip-delete-btn"
                          aria-label={`Remove ${player}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                    {favoritePlayers.length === 0 && (
                      <span className="text-xs text-zinc-400 italic">No favorite players added yet.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6 animate-fade-in">
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide">
                    Address & Station Configuration
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Provide location coordinates so the logistics center can generate travel timings for match days.
                  </p>
                </div>

                <div className="address-grid">
                  {/* Form fields */}
                  <div className="flex flex-col gap-4">
                    {/* Country Selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="auth-label">Country</span>
                      <div className="country-grid-select">
                        {COUNTRIES.map((c) => (
                          <div
                            key={c.code}
                            onClick={() => setCountry(c.name)}
                            className={`country-pill ${country === c.name ? "country-pill-active" : ""}`}
                          >
                            <span className="text-lg">{c.flag}</span>
                            <span>{c.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* City */}
                    <label className="auth-field">
                      <span className="auth-label">City</span>
                      <input
                        type="text"
                        placeholder="e.g. London"
                        className="auth-input"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      />
                    </label>

                    {/* Nearest Stadium / Arena */}
                    <label className="auth-field">
                      <span className="auth-label">Nearest Stadium / Favorite Arena</span>
                      <input
                        type="text"
                        placeholder="e.g. Emirates Stadium"
                        className="auth-input"
                        value={stadium}
                        onChange={(e) => setStadium(e.target.value)}
                        required
                      />
                    </label>

                    {/* Street Details */}
                    <label className="auth-field">
                      <span className="auth-label">Street / Home description</span>
                      <input
                        type="text"
                        placeholder="e.g. Highbury Hill"
                        className="auth-input"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* Interactive HUD Map Mockup */}
                  <div className="mock-map-card">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                      Station Coordinates HUD
                    </span>

                    <div className="mock-map-canvas">
                      {/* Radar pulses */}
                      <div className="mock-map-radar" />
                      <div className="mock-map-field-lines" />
                      <div className="mock-map-center-circle" />

                      {/* Floating pin */}
                      <div className="map-pin-pulse">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </div>
                    </div>

                    <div className="mock-map-meta">
                      <span className="font-bold uppercase text-[9px] text-zinc-400">Target Match Station:</span>
                      <span className="truncate">{mapCoords.name}</span>
                      <div className="flex justify-between mt-1 text-[9px] border-t border-emerald-500/10 pt-1">
                        <span>LAT: {mapCoords.lat}</span>
                        <span>LON: {mapCoords.lon}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && <div className="auth-error mt-2">{error}</div>}
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          <div className="onboarding-nav">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-secondary"
                disabled={submitting}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn-primary"
              >
                Next Step
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="squad-spinner !border-white !border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Onboarding
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
