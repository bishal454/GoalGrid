import React, { useMemo, useCallback } from "react";

interface Player {
  id: string;
  name: string;
  shirtNumber: number;
  position: string;
}

interface FormationGridProps {
  homeTeam: {
    name: string;
    formation: string;
    lineup: Player[];
  };
  awayTeam: {
    name: string;
    formation: string;
    lineup: Player[];
  };
  isAIMode?: boolean;
  aiAnalysis?: {
    homeFormation?: string;
    awayFormation?: string;
    homeStrategy?: string;
    awayStrategy?: string;
    tacticalNotes?: string;
  };
}

const TacticalFormationGrid: React.FC<FormationGridProps> = ({
  homeTeam,
  awayTeam,
  isAIMode = false,
  aiAnalysis = {},
}) => {
  const parseFormation = (formStr: string): number[] => {
    if (!formStr) return [4, 3, 3];
    const parts = formStr.split("-").map(Number);
    return parts.length === 3 ? parts : [4, 3, 3];
  };

  const getPlayerPositionInFormation = useCallback((
    lineup: Player[],
    formation: string,
    isHome: boolean
  ): { player: Player; x: number; y: number }[] => {
    const formParts = parseFormation(formation);
    const [def, mid, att] = formParts;

    const positioned: { player: Player; x: number; y: number }[] = [];
    if (!lineup || lineup.length === 0) return positioned;

    // Goalkeeper
    if (lineup[0]) {
      positioned.push({
        player: lineup[0],
        x: 50,
        y: isHome ? 10 : 90,
      });
    }

    // Defenders
    const defenderCount = def;
    const defenderStartIdx = 1;
    for (let i = 0; i < defenderCount && defenderStartIdx + i < lineup.length; i++) {
      const ySpacing = 70 / (defenderCount + 1);
      positioned.push({
        player: lineup[defenderStartIdx + i],
        x: isHome ? 20 : 80,
        y: 15 + (i + 1) * ySpacing,
      });
    }

    // Midfielders
    const midStartIdx = defenderStartIdx + defenderCount;
    for (let i = 0; i < mid && midStartIdx + i < lineup.length; i++) {
      const ySpacing = 70 / (mid + 1);
      positioned.push({
        player: lineup[midStartIdx + i],
        x: isHome ? 40 : 60,
        y: 15 + (i + 1) * ySpacing,
      });
    }

    // Attackers
    const attStartIdx = midStartIdx + mid;
    for (let i = 0; i < att && attStartIdx + i < lineup.length; i++) {
      const ySpacing = 70 / (att + 1);
      positioned.push({
        player: lineup[attStartIdx + i],
        x: isHome ? 75 : 25,
        y: 15 + (i + 1) * ySpacing,
      });
    }

    return positioned;
  }, []);

  // Use AI formations if in AI mode and available
  const displayHomeFormation = isAIMode && aiAnalysis?.homeFormation ? aiAnalysis.homeFormation : homeTeam.formation;
  const displayAwayFormation = isAIMode && aiAnalysis?.awayFormation ? aiAnalysis.awayFormation : awayTeam.formation;

  const homePositioned = useMemo(
    () => getPlayerPositionInFormation(homeTeam.lineup, displayHomeFormation, true),
    [homeTeam.lineup, displayHomeFormation, getPlayerPositionInFormation]
  );

  const awayPositioned = useMemo(
    () => getPlayerPositionInFormation(awayTeam.lineup, displayAwayFormation, false),
    [awayTeam.lineup, displayAwayFormation, getPlayerPositionInFormation]
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header with formations */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-4">
          <div className="text-left">
            <div className="text-xs font-mono text-emerald-400 tracking-widest">
              {homeTeam.name}
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {displayHomeFormation}
            </div>
            {isAIMode && aiAnalysis?.homeStrategy && (
              <div className="text-[9px] text-emerald-300 mt-1 max-w-[150px]">
                {aiAnalysis.homeStrategy}
              </div>
            )}
          </div>
        </div>

        {isAIMode && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded tracking-widest font-bold">
              🤖 AI ANALYSIS
            </div>
            {aiAnalysis?.tacticalNotes && (
              <div className="text-[9px] text-violet-300 text-center max-w-[200px] leading-tight">
                {aiAnalysis.tacticalNotes}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-violet-400 tracking-widest">
              {awayTeam.name}
            </div>
            <div className="text-2xl font-black text-violet-400">
              {displayAwayFormation}
            </div>
            {isAIMode && aiAnalysis?.awayStrategy && (
              <div className="text-[9px] text-violet-300 mt-1 max-w-[150px] text-right">
                {aiAnalysis.awayStrategy}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pitch with formations */}
      <div className={`w-full bg-emerald-950/30 border-2 rounded-xl relative p-6 overflow-hidden shadow-inner transition-colors ${
        isAIMode ? 'border-violet-500/30 bg-violet-950/20' : 'border-emerald-500/30'
      }`}>
        {/* Aspect ratio container */}
        <div className={`w-full aspect-[2/3] relative border rounded-lg overflow-hidden transition-colors ${
          isAIMode 
            ? 'bg-gradient-to-b from-violet-900/40 to-violet-950/40 border-violet-500/20' 
            : 'bg-gradient-to-b from-emerald-900/40 to-emerald-950/40 border-emerald-500/20'
        }`}>
          {/* Pitch Markings */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 150"
          >
            {/* Center line */}
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="150"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
            {/* Center circle */}
            <circle
              cx="50"
              cy="75"
              r="10"
              fill="none"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
            {/* Center spot */}
            <circle
              cx="50"
              cy="75"
              r="1"
              fill={isAIMode ? "rgba(139, 92, 246, 0.3)" : "rgba(16, 185, 129, 0.3)"}
            />
            {/* Penalty areas */}
            <rect
              x="15"
              y="30"
              width="20"
              height="30"
              fill="none"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
            <rect
              x="65"
              y="30"
              width="20"
              height="30"
              fill="none"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
            {/* Goal areas */}
            <rect
              x="20"
              y="40"
              width="10"
              height="10"
              fill="none"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
            <rect
              x="70"
              y="40"
              width="10"
              height="10"
              fill="none"
              stroke={isAIMode ? "rgba(139, 92, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}
              strokeWidth="0.5"
            />
          </svg>

          {/* Home Team Players */}
          <div className="absolute inset-0">
            {homePositioned.map((item, idx) => {
              const { player, x, y } = item;
              return (
                <div
                  key={`home-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {/* Player Circle */}
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                      isAIMode
                        ? 'bg-emerald-600/60 border-emerald-400'
                        : 'bg-emerald-500/80 border-emerald-300'
                    }`}>
                      <span className="text-xs font-black text-black">
                        {player.shirtNumber}
                      </span>
                    </div>
                    {/* Connection line to center */}
                    <svg
                      className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2"
                      style={{ pointerEvents: "none", opacity: 0.3 }}
                    >
                      <line
                        x1="50%"
                        y1="50%"
                        x2="50%"
                        y2="0%"
                        stroke={isAIMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.2)"}
                        strokeWidth="0.5"
                      />
                    </svg>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-zinc-950/95 border border-emerald-500/30 text-emerald-100 text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg font-mono">
                    {player.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Away Team Players */}
          <div className="absolute inset-0">
            {awayPositioned.map((item, idx) => {
              const { player, x, y } = item;
              return (
                <div
                  key={`away-${idx}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {/* Player Circle */}
                  <div className="relative flex items-center justify-center">
                    <div className={`absolute w-7 h-7 rounded-full border-2 flex items-center justify-center shadow-lg transition-colors ${
                      isAIMode
                        ? 'bg-violet-600/60 border-violet-400'
                        : 'bg-violet-600/80 border-violet-400'
                    }`}>
                      <span className="text-xs font-black text-white">
                        {player.shirtNumber}
                      </span>
                    </div>
                    {/* Connection line to center */}
                    <svg
                      className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2"
                      style={{ pointerEvents: "none", opacity: 0.3 }}
                    >
                      <line
                        x1="50%"
                        y1="50%"
                        x2="50%"
                        y2="0%"
                        stroke={isAIMode ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.2)"}
                        strokeWidth="0.5"
                      />
                    </svg>
                  </div>

                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-zinc-950/95 border border-violet-500/30 text-violet-100 text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg font-mono">
                    {player.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats legend */}
      <div className="flex justify-between items-center px-4 text-[10px] font-mono text-zinc-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border ${
              isAIMode 
                ? 'bg-emerald-600/60 border-emerald-400' 
                : 'bg-emerald-500 border-emerald-300'
            }`} />
            <span className="text-emerald-400">{homeTeam.name}</span>
          </div>
          <div className="text-zinc-600">Players: {homeTeam.lineup?.length || 0}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-zinc-600">Players: {awayTeam.lineup?.length || 0}</div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border ${
              isAIMode 
                ? 'bg-violet-600/60 border-violet-400' 
                : 'bg-violet-600 border-violet-400'
            }`} />
            <span className="text-violet-400">{awayTeam.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TacticalFormationGrid;
