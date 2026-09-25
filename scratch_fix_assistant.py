import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Terminal Wrapper
content = content.replace(
    'className="lg:col-span-5 flex flex-col h-full glass-card agent-terminal overflow-hidden border border-zinc-800/80 bg-zinc-950/20 rounded-2xl"',
    'className="lg:col-span-5 flex flex-col h-full glass-card agent-terminal overflow-hidden border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 rounded-2xl"'
)

# Terminal Header
content = content.replace(
    'className="terminal-header flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/40"',
    'className="terminal-header flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40"'
)

# Input field
content = content.replace(
    'className="terminal-input-field flex-grow bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all"',
    'className="terminal-input-field flex-grow bg-white dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white outline-none transition-all shadow-sm dark:shadow-none"'
)

# Suggestion Chips
content = content.replace(
    'className="flex-shrink-0 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-emerald-500/40 text-[10px] text-zinc-300 hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer"',
    'className="flex-shrink-0 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800/80 hover:border-emerald-500/40 text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-white px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-sm dark:shadow-none"'
)

# Empty chat board
content = content.replace(
    'className="mt-2 border border-zinc-800/40 bg-zinc-900/10 rounded-xl p-3"',
    'className="mt-2 border border-zinc-200 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-900/10 rounded-xl p-3 shadow-sm dark:shadow-none"'
)
content = content.replace(
    'className="w-full text-left bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/50 hover:border-emerald-500/40 rounded-xl p-2.5 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"',
    'className="w-full text-left bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/50 hover:border-emerald-500/40 rounded-xl p-2.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-between shadow-sm dark:shadow-none"'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Matchday Assistant CSS")
