import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic TS code
content = content.replace(
    'new Date(m.eventDate) >= new Date(Date.now() - 86400000)',
    '(m.eventDate ? new Date(m.eventDate) >= new Date(Date.now() - 86400000) : false)'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed TypeScript Date errors for Vercel deployment.")
