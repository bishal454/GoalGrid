import os
import re

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\backend\app\services\team_matches_helper.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to add aliases to TEAM_ID_MAP
additions = """    "Osasuna": 79,
    "CA Osasuna": 79,
    "Genoa": 107,
    "Genoa CFC": 107,
    "Schalke": 15,
    "FC Schalke 04": 15,
    "TSG 1899 Hoffenheim": 720,
    "Hoffenheim": 720,
    "Milan": 98,
    "Atleti": 78,
    "Athletic": 77,
"""

# Insert these additions after the start of TEAM_ID_MAP
if 'TEAM_ID_MAP: Dict[str, int] = {' in content:
    content = content.replace('TEAM_ID_MAP: Dict[str, int] = {', 'TEAM_ID_MAP: Dict[str, int] = {\n' + additions)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Added missing teams to TEAM_ID_MAP")
