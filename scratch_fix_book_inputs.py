import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix inputs and select in Ticket search
content = content.replace(
    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none placeholder-zinc-500 transition-colors"',
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors shadow-sm dark:shadow-none"'
)

content = content.replace(
    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors"',
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none transition-colors shadow-sm dark:shadow-none"'
)

content = content.replace(
    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-colors cursor-pointer"',
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none transition-colors cursor-pointer shadow-sm dark:shadow-none"'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Book Ticket select and inputs")
