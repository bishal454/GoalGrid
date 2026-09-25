import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\backend\app\services\competitions_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the crest logic for the dynamic template fallback
content = content.replace(
    '"crest": f"https://crests.football-data.org/{team_id}.png",',
    '"crest": f"https://crests.football-data.org/{team_id}.png" if team_id != 9999 else "https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg",'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated fallback crest")
