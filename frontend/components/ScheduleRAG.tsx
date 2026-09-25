"use client";

import React from "react";
import "./ScheduleRAG.css";

interface ScheduleRAGProps {
  followedTeams: string[];
  appMode?: "club" | "worldcup";
}

export default function ScheduleRAG({ followedTeams, appMode = "club" }: ScheduleRAGProps) {
  const videoSrc = "/video1.mp4";

  return (
    <div className="schedule-panel">
      {/* Header */}
      <div className="schedule-header-row flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-700/50">
        <div>
          <h2 className="schedule-title text-xl font-black text-zinc-900 dark:text-white uppercase tracking-wide">
            Schedules & Journey Intelligence
          </h2>
        </div>
      </div>

      {/* Dynamic Video Player Showcase */}
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-900 shadow-lg flex items-center justify-center aspect-video w-full">
        <video
          className="w-full h-full object-cover"
          src={videoSrc}
          controls
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    </div>
  );
}
