import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start and end of the renderContactUs method body
start_idx = content.find('Help & Customer Support') - 1000

end_idx = content.find('const renderSettings = () => {', start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find section")
    exit(1)

section = content[start_idx:end_idx]

# Let's manually replace the known bad classes in the Contact Us section using EXACT matches of className strings!

replacements = {
    'className="bg-zinc-900/60 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"':
    'className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"',
    
    'className="text-lg font-bold text-white tracking-tight"':
    'className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight"',
    
    'className="text-xs text-zinc-400 mt-1"':
    'className="text-xs text-zinc-500 dark:text-zinc-400 mt-1"',
    
    'className="bg-zinc-950/60 border border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"':
    'className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm dark:shadow-none"',
    
    'className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg"':
    'className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-lg"',
    
    'className="text-sm font-semibold text-white"':
    'className="text-sm font-semibold text-zinc-900 dark:text-white"',
    
    'className="text-[11px] text-zinc-400 mt-0.5"':
    'className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5"',
    
    'className="text-[11px] font-medium text-emerald-400 border-t border-zinc-800/80 pt-2.5 flex items-center justify-between"':
    'className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between"',

    'className="text-[11px] font-medium text-cyan-400 border-t border-zinc-800/80 pt-2.5 flex items-center justify-between"':
    'className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between"',

    'className="text-[11px] font-medium text-amber-400 border-t border-zinc-800/80 pt-2.5 flex items-center justify-between"':
    'className="text-[11px] font-medium text-amber-600 dark:text-amber-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-2.5 flex items-center justify-between"',

    'className="lg:col-span-7 bg-zinc-950/80 border border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col justify-between"':
    'className="lg:col-span-7 bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 p-6 sm:p-8 rounded-2xl shadow-sm dark:shadow-xl flex flex-col justify-between"',
    
    'className="text-base font-semibold text-white pb-4 border-b border-zinc-800/80 mb-6"':
    'className="text-base font-semibold text-zinc-900 dark:text-white pb-4 border-b border-zinc-200 dark:border-zinc-800/80 mb-6"',
    
    'className="block text-xs font-medium text-zinc-300 mb-1.5"':
    'className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"',
    
    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all"':
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-600"',
    
    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all cursor-pointer"':
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all cursor-pointer"',

    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"':
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all font-mono placeholder-zinc-400 dark:placeholder-zinc-600"',

    'className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg p-3.5 text-xs text-white focus:outline-none transition-all resize-none leading-relaxed"':
    'className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg p-3.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all resize-none leading-relaxed placeholder-zinc-400 dark:placeholder-zinc-600"',

    'className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500"':
    'className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500"',
    
    'className="bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-2xl shadow-xl"':
    'className="bg-white dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm dark:shadow-xl"',
    
    'className="text-base font-semibold text-white mb-4"':
    'className="text-base font-semibold text-zinc-900 dark:text-white mb-4"',
    
    'isOpen ? "bg-zinc-900/80 border-zinc-700 shadow-sm" : "bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700"':
    'isOpen ? "bg-zinc-50 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700 shadow-sm" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"',
    
    'className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"':
    'className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"',

    'className="px-3.5 pb-3.5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-2.5"':
    'className="px-3.5 pb-3.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed border-t border-zinc-200 dark:border-zinc-800/60 pt-2.5"',

    'className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-lg flex flex-col gap-3"':
    'className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-sm dark:shadow-lg flex flex-col gap-3"',
    
    'className="text-xs font-bold text-zinc-300 uppercase tracking-wider"':
    'className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"',
    
    'className="flex flex-col gap-2 text-xs text-zinc-300 mt-1"':
    'className="flex flex-col gap-2 text-xs text-zinc-700 dark:text-zinc-300 mt-1"',
    
    'className="flex items-center justify-between py-1.5 border-b border-zinc-800/60"':
    'className="flex items-center justify-between py-1.5 border-b border-zinc-200 dark:border-zinc-800/60"',

    'className="text-zinc-400"':
    'className="text-zinc-500 dark:text-zinc-400"'
}

for old_str, new_str in replacements.items():
    section = section.replace(old_str, new_str)

new_content = content[:start_idx] + section + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated Contact Us theme successfully using exact string replacements.")
