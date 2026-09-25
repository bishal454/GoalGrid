import React from "react";

interface StadiumHeatmapProps {
  occupancy?: {
    north_stand?: number;
    south_stand?: number;
    east_stand?: number;
    west_stand?: number;
    vip_box?: number;
  };
  selectedStand: string | null;
  onSelectStand: (stand: string) => void;
}

export const StadiumHeatmap: React.FC<StadiumHeatmapProps> = ({
  occupancy = {},
  selectedStand,
  onSelectStand,
}) => {
  const stands = [
    { key: "north_stand", label: "North Stand", path: "M 80,40 L 320,40 L 290,90 L 110,90 Z" },
    { key: "south_stand", label: "South Stand", path: "M 110,170 L 290,170 L 320,220 L 80,220 Z" },
    { key: "west_stand", label: "West Stand", path: "M 80,40 L 110,90 L 110,170 L 80,220 Z" },
    { key: "east_stand", label: "East Stand", path: "M 290,90 L 320,40 L 320,220 L 290,170 Z" },
    { key: "vip_box", label: "VIP Box", path: "M 160,15 L 240,15 L 225,35 L 175,35 Z" },
  ];

  const getColor = (percentage?: number) => {
    if (percentage === undefined) return { fill: "rgba(63, 63, 70, 0.4)", stroke: "#52525b" };
    if (percentage > 75) {
      return { fill: "rgba(239, 68, 68, 0.4)", stroke: "#ef4444" };
    }
    if (percentage > 40) {
      return { fill: "rgba(245, 158, 11, 0.35)", stroke: "#f59e0b" };
    }
    return { fill: "rgba(16, 185, 129, 0.3)", stroke: "#10b981" };
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 bg-zinc-950/40 border border-zinc-800/80 p-5 rounded-2xl">
      <div className="flex justify-between items-center w-full">
        <h5 className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          🏟️ Click Stands to Explore Occupancy
        </h5>
        <div className="flex items-center gap-2 text-[8px] font-mono uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500/30 border border-emerald-500" />
            Low &lt;40%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500/35 border border-amber-500" />
            Mid 40-75%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-red-500/40 border border-red-500" />
            High &gt;75%
          </span>
        </div>
      </div>

      <div className="relative w-full max-w-[400px] aspect-[4/3] flex items-center justify-center p-2">
        <svg
          viewBox="0 0 400 260"
          className="w-full h-full select-none"
          style={{ filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.4))" }}
        >
          {/* Football Field Pitch */}
          <g transform="translate(0, 0)">
            <rect
              x="130"
              y="105"
              width="140"
              height="50"
              rx="4"
              fill="rgba(6, 78, 59, 0.25)"
              stroke="rgba(16, 185, 129, 0.2)"
              strokeWidth="1.5"
            />
            {/* Field Markings */}
            <line x1="200" y1="105" x2="200" y2="155" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
            <circle cx="200" cy="130" r="16" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
            {/* Goal boxes */}
            <rect x="130" y="117" width="10" height="26" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
            <rect x="260" y="117" width="10" height="26" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
          </g>

          {/* Stand Polygons */}
          {stands.map((stand) => {
            const pct = occupancy[stand.key as keyof typeof occupancy];
            const colors = getColor(pct);
            const isSelected = selectedStand === stand.key;

            return (
              <g key={stand.key} className="group cursor-pointer">
                <path
                  d={stand.path}
                  fill={colors.fill}
                  stroke={isSelected ? "#3b82f6" : colors.stroke}
                  strokeWidth={isSelected ? "2.5" : "1.2"}
                  className="transition-all duration-300 group-hover:opacity-90"
                  style={{
                    filter: isSelected ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))" : "none",
                  }}
                  onClick={() => onSelectStand(stand.key)}
                />
                
                {/* Stand Label */}
                <text
                  x={
                    stand.key === "west_stand"
                      ? 50
                      : stand.key === "east_stand"
                      ? 350
                      : stand.key === "north_stand"
                      ? 200
                      : stand.key === "vip_box"
                      ? 200
                      : 200
                  }
                  y={
                    stand.key === "west_stand"
                      ? 135
                      : stand.key === "east_stand"
                      ? 135
                      : stand.key === "north_stand"
                      ? 65
                      : stand.key === "vip_box"
                      ? 28
                      : 200
                  }
                  fill={isSelected ? "#60a5fa" : "#a1a1aa"}
                  fontSize={stand.key === "vip_box" ? "8" : "9"}
                  fontWeight="900"
                  textAnchor="middle"
                  className="pointer-events-none font-mono tracking-wide uppercase select-none transition-colors"
                >
                  {pct !== undefined ? `${pct}%` : stand.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
