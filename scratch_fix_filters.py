import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\frontend\app\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific filter line
content = content.replace(
    'followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED")',
    'followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && new Date(m.eventDate) >= new Date(Date.now() - 86400000))'
)
content = content.replace(
    'followedMatches.filter(m => m.status !== "FT").map(',
    'followedMatches.filter(m => m.status !== "FT" && m.status !== "FINISHED" && new Date(m.eventDate) >= new Date(Date.now() - 86400000)).map('
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated filters to check dates.")
