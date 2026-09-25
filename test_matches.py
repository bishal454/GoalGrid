import json
import urllib.request

try:
    req = urllib.request.urlopen("http://127.0.0.1:8080/api/v1/live-matches/matches")
    data = json.loads(req.read().decode())
    for m in data:
        if "Levante" in m.get('homeTeam') or "Athletic" in m.get('awayTeam'):
            print(f"{m.get('homeTeam')} vs {m.get('awayTeam')} - {m.get('eventDate')} - Status: {m.get('status')}")
except Exception as e:
    print(e)
