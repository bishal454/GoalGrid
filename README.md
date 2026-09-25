# GoalGrid

Modern football analytics and dashboard platform.

GoalGrid is a Next.js 15 + FastAPI football dashboard providing live match scores, league standings, team tracking, AI-powered match analysis, and intelligent journey planning.

---

## Directory Structure

```
GoalGrid/
+-- frontend/            # Next.js 15 Frontend
|   +-- app/             # App Router pages
|   +-- components/      # UI components (Header, LiveScore, Dashboard, etc.)
|   +-- lib/             # Auth and utility libraries
|   +-- public/          # Static assets (videos, animations, icons)
|   +-- package.json
+-- backend/             # FastAPI Backend
|   +-- app/
|   |   +-- api/         # FastAPI Route handlers
|   |   +-- services/    # Business logic services
|   |   +-- db/          # Database client setup
|   |   +-- schemas/     # Pydantic models
|   |   +-- main.py      # Entry point
|   +-- requirements.txt # Python dependencies
+-- .gitignore
+-- README.md
```

---

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
# Open http://localhost:8080
```
