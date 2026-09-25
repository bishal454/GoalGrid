import os

file_path = r'c:\Users\abhij\OneDrive\Desktop\Offside_AI\backend\app\services\agent_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Enhance keyword fallback for explicit locations
fallback_old = '''                if any(w in query_lower for w in ["food", "drink", "pub", "restaurant", "review", "pie", "shop", "store", "supermarket", "grocery", "groceries", "pharmacy", "tourist", "sight", "sights"]):
                    search_origin = profile.get("stadium") or "Emirates Stadium"
                    if any(w in query_lower for w in ["me", "my lodging", "my hotel", "my stay", "here"]):'''

fallback_new = '''                if any(w in query_lower for w in ["food", "drink", "pub", "restaurant", "review", "pie", "shop", "store", "supermarket", "grocery", "groceries", "pharmacy", "tourist", "sight", "sights"]):
                    search_origin = profile.get("stadium") or "Emirates Stadium"
                    
                    # Check for explicit locations
                    known_locations = ["anfield", "emirates", "old trafford", "stamford bridge", "wembley", "london", "madrid", "barcelona", "manchester"]
                    for loc in known_locations:
                        if loc in query_lower:
                            search_origin = loc.title()
                            break
                            
                    if any(w in query_lower for w in ["me", "my lodging", "my hotel", "my stay", "here"]):'''

content = content.replace(fallback_old, fallback_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated fallback routing for explicit locations")
