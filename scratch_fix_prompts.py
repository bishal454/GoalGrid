import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\backend\app\services\agent_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update intent prompt guidelines
content = content.replace(
    '- If the user asks about "me", "my lodging", "my hotel", etc., and they have a selected lodging, use the selected lodging name ("{lodging or \'\'}") as the origin for directions or venue for nearby reviews.',
    '- If the user asks about "me", "my lodging", "my hotel", etc., and they have a selected lodging, use the selected lodging name ("{lodging or \'\'}") as the origin for directions or venue for nearby reviews. If they specify a location directly (e.g. "near Anfield"), use that specific location.'
)

# Update synthesis prompt guidelines
content = content.replace(
    '- If the user\'s location or stadium context is missing and they ask for nearby recommendations, politely ask them to provide their current location and match details so you can assist them.',
    '- If the user asks for recommendations "near me" but hasn\'t set a stay or home city, politely ask them. BUT if they specify a location in the query (like "near Anfield" or "in London"), DO NOT ask for their location, just answer based on the fetched data.'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated LLM prompts for location logic")
