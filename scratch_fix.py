import re

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

def replace_classes(match):
    cls = match.group(0)
    
    # Backgrounds
    cls = re.sub(r'\bbg-zinc-950/60\b', 'bg-white dark:bg-zinc-950/60', cls)
    cls = re.sub(r'\bbg-zinc-950/80\b', 'bg-white dark:bg-zinc-950/80', cls)
    cls = re.sub(r'\bbg-zinc-950/40\b', 'bg-zinc-50 dark:bg-zinc-950/40', cls)
    cls = re.sub(r'\bbg-zinc-900/60\b', 'bg-white dark:bg-zinc-900/60', cls)
    cls = re.sub(r'\bbg-zinc-900/80\b', 'bg-white dark:bg-zinc-900/80', cls)
    cls = re.sub(r'\bbg-zinc-900\b', 'bg-white dark:bg-zinc-900', cls)
    cls = re.sub(r'\bbg-zinc-800\b', 'bg-zinc-100 dark:bg-zinc-800', cls)
    cls = re.sub(r'\bhover:bg-zinc-700\b', 'hover:bg-zinc-100 dark:hover:bg-zinc-700', cls)

    # Borders
    cls = re.sub(r'\bborder-zinc-800/80\b', 'border-zinc-200 dark:border-zinc-800/80', cls)
    cls = re.sub(r'\bborder-zinc-800/60\b', 'border-zinc-200 dark:border-zinc-800/60', cls)
    cls = re.sub(r'\bborder-zinc-800\b', 'border-zinc-200 dark:border-zinc-800', cls)
    cls = re.sub(r'\bborder-zinc-700\b', 'border-zinc-300 dark:border-zinc-700', cls)
    cls = re.sub(r'\bhover:border-zinc-700\b', 'hover:border-zinc-300 dark:hover:border-zinc-700', cls)
    cls = re.sub(r'\bfocus:border-zinc-600\b', 'focus:border-zinc-400 dark:focus:border-zinc-600', cls)
    
    # Text colors
    cls = re.sub(r'\btext-white\b', 'text-zinc-900 dark:text-white', cls)
    cls = re.sub(r'\btext-zinc-200\b', 'text-zinc-800 dark:text-zinc-200', cls)
    cls = re.sub(r'\btext-zinc-300\b', 'text-zinc-700 dark:text-zinc-300', cls)
    cls = re.sub(r'\btext-zinc-400\b', 'text-zinc-500 dark:text-zinc-400', cls)
    cls = re.sub(r'\btext-zinc-500\b', 'text-zinc-500 dark:text-zinc-500', cls)
    cls = re.sub(r'\bhover:text-white\b', 'hover:text-zinc-900 dark:hover:text-white', cls)

    return cls

# We only want to replace within className="..."
new_section = re.sub(r'className="([^"]+)"', replace_classes, section)

new_content = content[:start_idx] + new_section + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated Contact Us theme successfully.")
