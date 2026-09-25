import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="lg:col-span-7 flex flex-col h-full glass-card border border-zinc-800/80 bg-zinc-950/20 p-4 rounded-2xl overflow-hidden"',
    'className="lg:col-span-7 flex flex-col h-full glass-card border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 p-4 rounded-2xl overflow-hidden"'
)

content = content.replace(
    'className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 mb-3 text-xs"',
    'className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 mb-3 text-xs shadow-sm dark:shadow-none"'
)

content = content.replace(
    '<span className="text-zinc-300 font-medium">📍 {assistantSelectedMapPlace}</span>',
    '<span className="text-zinc-700 dark:text-zinc-300 font-medium">📍 {assistantSelectedMapPlace}</span>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Right column of Assistant Map")
