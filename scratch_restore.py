import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Málaga and Brest to TEAM_CRESTS
if '"Brest":' not in content:
    content = content.replace(
        '"Newcastle": "https://crests.football-data.org/67.png",\n',
        '"Newcastle": "https://crests.football-data.org/67.png",\n  "Málaga": "https://crests.football-data.org/84.png",\n  "Brest": "https://crests.football-data.org/512.png",\n'
    )

# 2. Add dynamicCrests state and useEffect
if 'dynamicCrests' not in content:
    hook_insert = """  const [profileLoading, setProfileLoading] = useState(true);
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
  }, [userProfile?.followed_teams]);"""
    content = content.replace("  const [profileLoading, setProfileLoading] = useState(true);", hook_insert)

# 3. Update getTeamCrest usage for Followed Clubs
if 'dynamicCrests[team]' not in content:
    content = content.replace(
        """{getTeamCrest(team) ? (
                              <img src={getTeamCrest(team)} alt={team} className="w-9 h-9 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />""",
        """{getTeamCrest(team) || dynamicCrests[team] ? (
                              <img src={getTeamCrest(team) || dynamicCrests[team]} alt={team} className="w-9 h-9 object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />"""
    )

# 4. Light mode for "Plan Yourself" and "Let AI Plan It" cards
# In the original file, it was:
content = content.replace(
    'className="flex-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-violet-500/50',
    'className="flex-1 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 hover:border-violet-500/50'
)
content = content.replace(
    'className="flex-1 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50',
    'className="flex-1 bg-white dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50'
)

# 5. Excluded FINISHED matches from the AI prompt dropdown
content = content.replace(
    'followedMatches && followedMatches.filter(m => m.status !== "FT").map((m, idx) => (',
    'followedMatches && followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED").map((m, idx) => ('
)

# 6. Excluded FINISHED matches from "upcomingMatches" in Book your Ticket
content = content.replace(
    'const upcomingMatches = followedMatches.filter(m => m.status !== "FT");',
    'const upcomingMatches = followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED");'
)

# 7. Add onError handler for the stadium seating guide images
content = content.replace(
    """<img
                            src={stand.img || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop"}
                            alt={stand.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                          />""",
    """<img
                            src={stand.img || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop"}
                            alt={stand.name}
                            onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop"; }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                          />"""
)

# 8. Journey Planner light mode styles
content = content.replace(
    'className="w-full bg-zinc-900/90 border border-violet-500/40 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none transition-all cursor-pointer shadow-lg hover:border-violet-500/80"',
    'className="w-full bg-white dark:bg-zinc-900/90 border border-violet-500/30 dark:border-violet-500/40 focus:border-violet-500 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none transition-all cursor-pointer shadow-sm dark:shadow-lg hover:border-violet-500/60 dark:hover:border-violet-500/80"'
)
content = content.replace(
    '<label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Describe your trip</label>',
    '<label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Describe your trip</label>'
)
content = content.replace(
    'className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"',
    'className="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 focus:border-violet-500/60 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-colors resize-none leading-relaxed"'
)
content = content.replace(
    '<p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Quick prompts</p>',
    '<p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">Quick prompts</p>'
)
content = content.replace(
    'className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-violet-500/50 hover:text-violet-300 hover:bg-violet-500/[0.06] transition-all cursor-pointer"',
    'className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-500/10 dark:hover:bg-violet-500/[0.06] transition-all cursor-pointer"'
)
content = content.replace(
    'className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-center space-y-1"',
    'className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3 text-center space-y-1 shadow-sm dark:shadow-none"'
)
content = content.replace(
    '<div className="text-[10px] font-extrabold text-zinc-300 uppercase tracking-wider">{item.label}</div>',
    '<div className="text-[10px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">{item.label}</div>'
)
content = content.replace(
    '<div className="text-[9px] text-zinc-600 leading-tight">{item.desc}</div>',
    '<div className="text-[9px] text-zinc-500 dark:text-zinc-600 leading-tight">{item.desc}</div>'
)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored ALL changes successfully.")
