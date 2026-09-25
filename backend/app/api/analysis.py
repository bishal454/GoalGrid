"""
Tactical Match Analysis Service
---------------------------------
Generates professional post-match tactical breakdown reports.
Uses Gemini when available, falls back to dynamic statistical heuristics.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
import json
import hashlib
import logging

logger = logging.getLogger("offside_ai.analysis")

router = APIRouter(
    prefix="/api/v1/analysis",
    tags=["analysis"],
)

class MatchAnalysisRequest(BaseModel):
    match_data: Dict[str, Any]

@router.post("/tactical")
async def generate_tactical_analysis(req: Dict[str, Any]):
    """
    Receives the raw match detail JSON from the frontend/football-data API.
    Sends it to Gemini to generate a professional tactical review.
    Gracefully falls back to heuristic generation under rate limits.
    """
    from app.services.agent_service import agent_service
    
    # Extract request payload
    match_detail = req.get("match_data")
    if not match_detail:
        raise HTTPException(status_code=400, detail="match_data is required in payload")
        
    home_team_data = match_detail.get("homeTeam", {})
    away_team_data = match_detail.get("awayTeam", {})
    
    home_name = home_team_data.get("name") or "Home Team"
    away_name = away_team_data.get("name") or "Away Team"
    home_score = match_detail.get("homeScore", 0)
    away_score = match_detail.get("awayScore", 0)
    venue = match_detail.get("venue") or "Stadium"
    league = match_detail.get("league") or "League"
    
    home_formation = home_team_data.get("formation") or "4-3-3"
    away_formation = away_team_data.get("formation") or "4-3-3"
    
    goals = match_detail.get("goals") or []
    bookings = match_detail.get("bookings") or []
    
    home_stats = home_team_data.get("statistics") or {}
    away_stats = away_team_data.get("statistics") or {}
    
    # Generate deterministic fallback parameters in case Gemini is rate-limited or disabled
    match_id = str(match_detail.get("id") or "0")
    h = int(hashlib.md5(match_id.encode('utf-8')).hexdigest(), 16)
    
    # Choose a deterministic MVP (preferably the first goalscorer of the winning/home team)
    mvp_name = "Key Playmaker"
    mvp_team = home_name
    mvp_shirt = 10
    mvp_reason = "Controlled the pace of the midfield and created major scoring opportunities."
    
    if goals:
        first_goal = goals[0]
        mvp_name = first_goal.get("scorer") or "Key Striker"
        scorer_team_id = first_goal.get("teamId")
        if scorer_team_id == away_team_data.get("id"):
            mvp_team = away_name
            mvp_shirt = 9
        else:
            mvp_team = home_name
            mvp_shirt = 10
        mvp_reason = f"Scored the crucial opening goal in the {first_goal.get('minute') or 15}' minute, breaking the defensive lines and setting the momentum."
    elif home_stats.get("saves", 0) > away_stats.get("saves", 0):
        mvp_name = "Starting Goalkeeper"
        mvp_shirt = 1
        mvp_reason = "Pulled off multiple spectacular saves to preserve a hard-fought clean sheet."
        
    # Generate threat momentum timeline
    home_possession = int(home_stats.get("ball_possession", 50))
    momentum = [
        min(90, max(10, home_possession + (h % 15) - 7)),
        min(90, max(10, home_possession - ((h + 3) % 20) + 10)),
        min(90, max(10, home_possession + ((h + 7) % 25) - 12)),
        min(90, max(10, home_possession - ((h + 11) % 15) + 5)),
        min(90, max(10, home_possession + ((h + 17) % 30) - 15)),
        min(90, max(10, home_possession - ((h + 23) % 10) + 5))
    ]
    
    # Local fallback report generator
    def build_fallback_report(error_context: str = None) -> Dict[str, Any]:
        reasoning_str = "Running dynamic forecasting heuristics fallback."
        if error_context:
            reasoning_str = f"Gemini API limit/error: {error_context}. {reasoning_str}"
            
        goal_summary_lines = []
        for g in goals:
            team_str = home_name if g.get("teamId") == home_team_data.get("id") else away_name
            goal_summary_lines.append(f"- **{g.get('minute')}' Goal:** {g.get('scorer')} ({team_str})")
            
        booking_summary_lines = []
        for b in bookings:
            team_str = home_name if b.get("teamId") == home_team_data.get("id") else away_name
            card_type = b.get("card", "YELLOW").upper()
            booking_summary_lines.append(f"- **{b.get('minute')}' {card_type}:** {b.get('player')} ({team_str})")
            
        goal_text = "\n".join(goal_summary_lines) if goal_summary_lines else "No goals recorded during this match."
        card_text = "\n".join(booking_summary_lines) if booking_summary_lines else "Clean match with no cautions recorded."
        
        outcome_desc = "ended in a draw, with both managers settling for a shared point in a tight tactical battle."
        if home_score > away_score:
            outcome_desc = f"concluded in a {home_score}-{away_score} victory for {home_name}, capitalizing on home advantage and clinical finishing."
        elif away_score > home_score:
            outcome_desc = f"concluded in a {home_score}-{away_score} away win for {away_name}, showcasing solid defensive discipline and rapid counter-attacks."
            
        fallback_markdown = f"""### Match Analysis: {home_name} vs {away_name}
The fixture at **{venue}** in the **{league}** {outcome_desc}

#### 1. Tactical Setup & Formations
* **{home_name}** lined up in a **{home_formation}** formation, focusing on structured build-up play and utilising their wing-backs to stretch the opponent.
* **{away_name}** counter-formed with a **{away_formation}** layout, setting up a compact low-block defense designed to absorb pressure and launch quick vertical transitions.

#### 2. Statistical Insights
* **Possession**: {home_name} held **{home_possession}%** possession, dictating the tempo of the play in the central areas.
* **Shooting Efficiency**: {home_name} registered **{home_stats.get('shots', 0)}** shots (**{home_stats.get('shots_on_goal', 0)}** on target) compared to {away_name}'s **{away_stats.get('shots', 0)}** shots (**{away_stats.get('shots_on_goal', 0)}** on target).
* **Passing Volume**: Teams exchanged a total of **{int(home_stats.get('passes', 400)) + int(away_stats.get('passes', 350))}** passes, reflecting high tactical discipline.

#### 3. Critical Incidents
##### Goals Scored:
{goal_text}

##### Match Cautions:
{card_text}

#### 4. Post-Match Tactical Verdict
The tactical battle in the midfield defined the pace of the game. {home_name}'s high press forced transitions, but {away_name}'s defensive organization prevented central penetration. The manager's adjustments in the second half played a key role in breaking the deadlock.
"""

        return {
            "status": "fallback",
            "report_markdown": fallback_markdown,
            "mvp_player": {
                "name": mvp_name,
                "team": mvp_team,
                "shirtNumber": mvp_shirt,
                "reason": mvp_reason
            },
            "threat_momentum": momentum,
            "reasoning": reasoning_str
        }

    # If Gemini is not configured, trigger fallback immediately
    if not agent_service.llm_model:
        return build_fallback_report("Gemini model is not configured")
        
    is_future = match_detail.get("status") not in ["FT", "FINISHED"] and not match_detail.get("goals")

    if is_future:
        prompt = f"""
        You are an elite professional football tactical analyst and scout.
        Analyze the following UPCOMING match details JSON:
        {json.dumps(match_detail, indent=2)}

        Since this match has not occurred yet, write a detailed, professional-grade PRE-MATCH PREDICTIVE PREVIEW.
        Provide:
        1. **report_markdown**: A highly comprehensive, multi-section pre-match predictive analysis report written in markdown.
           Include:
           - ### Pre-Match Overview (Form guide, stakes, and predictive narrative)
           - ### Expected Tactical Setup (Evaluate expected formations, manager strategies, defensive shapes)
           - ### Key Tactical Battlegrounds (Where the match will be won or lost)
           - ### Statistical Forecast (Predicted xG, possession dominance, pressing intensity)
           - ### Final Prediction (Scoreline prediction and reasoning)
        2. **mvp_player**: Structure the likely "Player to Watch" or potential MVP.
        3. **threat_momentum**: Estimate a PREDICTED list of 6 integers (representing 15-minute segments of the upcoming 90-minute match: 0-15', 15-30', 30-45', 45-60', 60-75', 75-90') representing the home team's predicted threat percentage/dominance level (0-100 where >50 means home team dominating).

        Return ONLY a valid JSON object. Do not include markdown code block formatting or other text.
        JSON Schema:
        {{
            "report_markdown": "string (formatted in Markdown, complete with headings, bold text, and lists)",
            "mvp_player": {{
                "name": "string",
                "team": "string",
                "shirtNumber": int,
                "reason": "string"
            }},
            "threat_momentum": [int, int, int, int, int, int]
        }}
        """
    else:
        prompt = f"""
        You are an elite professional football tactical analyst and scout.
        Analyze the following completed match details JSON:
        {json.dumps(match_detail, indent=2)}

        Write a detailed, professional-grade post-match tactical report.
        Provide:
        1. **report_markdown**: A highly comprehensive, multi-section post-match analysis report written in markdown.
           Include:
           - ### Match Overview (Analysis of how the match flowed, tactical battles, key turning points)
           - ### Tactical Setup & Game Plan (Evaluate formations, manager setups, defensive shapes)
           - ### Manager Substitutions & Tactical Shifts (How tactical changes altered the game plan)
           - ### Statistical Efficiency (xG, passing accuracy, press efficiency, defensive shapes)
           - ### Scout's Notebook (Key notes for future fixtures)
        2. **mvp_player**: Structure of MVP candidate.
        3. **threat_momentum**: Estimate a list of 6 integers (representing 15-minute segments of the 90-minute match: 0-15', 15-30', 30-45', 45-60', 60-75', 75-90') representing the home team's threat percentage/dominance level (0-100 where >50 means home team dominating, <50 means away team dominating).

        Return ONLY a valid JSON object. Do not include markdown code block formatting or other text.
        JSON Schema:
        {{
            "report_markdown": "string (formatted in Markdown, complete with headings, bold text, and lists)",
            "mvp_player": {{
                "name": "string",
                "team": "string",
                "shirtNumber": int,
                "reason": "string"
            }},
            "threat_momentum": [int, int, int, int, int, int]
        }}
        """
    
    try:
        response = agent_service.llm_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        clean_text = response.text.strip()
        start_idx = clean_text.find('{')
        end_idx = clean_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_text = clean_text[start_idx:end_idx+1]
        data = json.loads(clean_text)
        
        return {
            "status": "predicted",
            "report_markdown": data.get("report_markdown"),
            "mvp_player": data.get("mvp_player"),
            "threat_momentum": data.get("threat_momentum") or momentum,
            "reasoning": "Gemini professional tactical review successfully compiled."
        }
    except Exception as exc:
        err_msg = str(exc)
        short_err = err_msg[:60] + "..." if len(err_msg) > 60 else err_msg
        logger.warning(f"Gemini analysis failed: {err_msg}. Falling back to dynamic heuristics.")
        return build_fallback_report(short_err)


@router.post("/prompt-search")
async def search_match_by_prompt(req: Dict[str, Any]):
    """
    Search/reconstruct a historical match based on a user's free-text prompt description.
    Uses Gemini to search its knowledge base and reconstruct statistics, lineups, goals, and bookings.
    Falls back gracefully to a mock-realistic match representation if Gemini fails.
    """
    from app.services.agent_service import agent_service
    prompt_query = req.get("prompt", "")
    if not prompt_query:
        raise HTTPException(status_code=400, detail="prompt is required")
        
    def build_fallback_match() -> Dict[str, Any]:
        # Simple parsing logic
        query_lower = prompt_query.lower()
        home = "Home Club"
        away = "Away Club"
        
        # Simple splitting by delimiter
        for delimiter in [" vs ", " - ", " v ", " vs. "]:
            if delimiter in query_lower:
                parts = prompt_query.split(delimiter)
                home = parts[0].strip()
                away = parts[1].strip() if len(parts) > 1 else "Away Club"
                break
                
        # Clean up brackets or years if any
        import re
        home = re.sub(r'\s*\([^)]*\)', '', home).strip()
        away = re.sub(r'\s*\([^)]*\)', '', away).strip()
        
        # Form default lineups
        home_lineup = [
            {"id": 1, "name": "G. Buffon", "position": "Goalkeeper", "shirtNumber": 1},
            {"id": 2, "name": "P. Maldini", "position": "Left-Back", "shirtNumber": 3},
            {"id": 3, "name": "F. Baresi", "position": "Centre-Back", "shirtNumber": 6},
            {"id": 4, "name": "A. Nesta", "position": "Centre-Back", "shirtNumber": 13},
            {"id": 5, "name": "Cafu", "position": "Right-Back", "shirtNumber": 2},
            {"id": 6, "name": "A. Pirlo", "position": "Central Midfield", "shirtNumber": 21},
            {"id": 7, "name": "G. Gattuso", "position": "Central Midfield", "shirtNumber": 8},
            {"id": 8, "name": "C. Seedorf", "position": "Central Midfield", "shirtNumber": 10},
            {"id": 9, "name": "Kaka", "position": "Attacking Midfield", "shirtNumber": 22},
            {"id": 10, "name": "A. Shevchenko", "position": "Centre-Forward", "shirtNumber": 7},
            {"id": 11, "name": "H. Crespo", "position": "Centre-Forward", "shirtNumber": 9}
        ]
        
        away_lineup = [
            {"id": 12, "name": "J. Dudek", "position": "Goalkeeper", "shirtNumber": 1},
            {"id": 13, "name": "J. A. Riise", "position": "Left-Back", "shirtNumber": 6},
            {"id": 14, "name": "S. Hyypiä", "position": "Centre-Back", "shirtNumber": 4},
            {"id": 15, "name": "J. Carragher", "position": "Centre-Back", "shirtNumber": 23},
            {"id": 16, "name": "S. Finnan", "position": "Right-Back", "shirtNumber": 3},
            {"id": 17, "name": "X. Alonso", "position": "Central Midfield", "shirtNumber": 14},
            {"id": 18, "name": "S. Gerrard", "position": "Central Midfield", "shirtNumber": 8},
            {"id": 19, "name": "L. Garcia", "position": "Attacking Midfield", "shirtNumber": 10},
            {"id": 20, "name": "H. Kewell", "position": "Left Winger", "shirtNumber": 7},
            {"id": 21, "name": "D. Cisse", "position": "Right Winger", "shirtNumber": 9},
            {"id": 22, "name": "M. Baroš", "position": "Centre-Forward", "shirtNumber": 5}
        ]
        
        return {
            "id": f"prompt_{hashlib.md5(prompt_query.encode('utf-8')).hexdigest()[:8]}",
            "homeTeam": {
                "id": "home",
                "name": home,
                "formation": "4-3-1-2",
                "lineup": home_lineup,
                "statistics": {
                    "ball_possession": 52,
                    "shots": 16,
                    "shots_on_goal": 8,
                    "passes": 480,
                    "saves": 3
                }
            },
            "awayTeam": {
                "id": "away",
                "name": away,
                "formation": "4-2-3-1",
                "lineup": away_lineup,
                "statistics": {
                    "ball_possession": 48,
                    "shots": 12,
                    "shots_on_goal": 5,
                    "passes": 420,
                    "saves": 5
                }
            },
            "homeScore": 3,
            "awayScore": 3,
            "venue": "Atatürk Olympic Stadium",
            "league": "UEFA Champions League",
            "eventDate": "2005-05-25",
            "goals": [
                {"minute": 1, "scorer": "Paolo Maldini", "teamId": "home"},
                {"minute": 39, "scorer": "Hernan Crespo", "teamId": "home"},
                {"minute": 44, "scorer": "Hernan Crespo", "teamId": "home"},
                {"minute": 54, "scorer": "Steven Gerrard", "teamId": "away"},
                {"minute": 56, "scorer": "Vladimir Smicer", "teamId": "away"},
                {"minute": 60, "scorer": "Xabi Alonso", "teamId": "away"}
            ],
            "bookings": [
                {"minute": 76, "card": "YELLOW", "player": "Jamie Carragher", "teamId": "away"}
            ],
            "sourceName": "Prompt Reconstructed"
        }
        
    if not agent_service.llm_model:
        return build_fallback_match()
        
    prompt = f"""
    The user is looking for a specific football match with the following description:
    "{prompt_query}"

    Search your knowledge base to find this match. If it is a real historical match, reconstruct its detailed statistics, lineups, goals, and bookings. If it is a hypothetical or less-known match, construct a realistic mock representation based on the user's description.
    Make sure to provide extremely realistic statistical data (ball possession, shots, passes, saves) so that our frontend charting engine can beautifully render this match.

    Structure the response exactly as a JSON object matching this schema:
    {{
        "id": "unique_string_id",
        "homeTeam": {{
            "id": "home",
            "name": "Home Club Name (e.g. Manchester City)",
            "formation": "e.g. 4-3-3",
            "lineup": [
                {{"id": 1, "name": "Player Name", "position": "Goalkeeper", "shirtNumber": 1}},
                ... (exactly 11 players for starting lineup)
            ],
            "statistics": {{
                "ball_possession": 55,
                "shots": 14,
                "shots_on_goal": 6,
                "passes": 520,
                "saves": 3
            }}
        }},
        "awayTeam": {{
            "id": "away",
            "name": "Away Club Name (e.g. Inter Milan)",
            "formation": "e.g. 3-5-2",
            "lineup": [
                {{"id": 12, "name": "Player Name", "position": "Goalkeeper", "shirtNumber": 1}},
                ... (exactly 11 players for starting lineup)
            ],
            "statistics": {{
                "ball_possession": 45,
                "shots": 8,
                "shots_on_goal": 3,
                "passes": 410,
                "saves": 5
            }}
        }},
        "homeScore": int,
        "awayScore": int,
        "venue": "Stadium Name",
        "league": "Competition Name (e.g. UEFA Champions League)",
        "eventDate": "YYYY-MM-DD",
        "goals": [
            {{"minute": 68, "scorer": "Rodri", "teamId": "home"}}
        ],
        "bookings": [
            {{"minute": 83, "card": "YELLOW", "player": "Erling Haaland", "teamId": "home"}}
        ]
    }}

    IMPORTANT: Ensure that teamId in goals/bookings matches "home" or "away" so that the UI can group them properly.
    Return ONLY a valid JSON object. Do not include markdown code block formatting or other text.
    """
    
    try:
        response = agent_service.llm_model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        clean_text = response.text.strip()
        start_idx = clean_text.find('{')
        end_idx = clean_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            clean_text = clean_text[start_idx:end_idx+1]
        data = json.loads(clean_text)
        
        # Ensure ids and teamIds match correctly
        if "homeTeam" in data:
            data["homeTeam"]["id"] = "home"
        if "awayTeam" in data:
            data["awayTeam"]["id"] = "away"
            
        for goal in data.get("goals", []):
            if goal.get("teamId") not in ["home", "away"]:
                goal["teamId"] = "home"
        for booking in data.get("bookings", []):
            if booking.get("teamId") not in ["home", "away"]:
                booking["teamId"] = "home"
                
        data["sourceName"] = "Prompt Reconstructed"
        return data
    except Exception as exc:
        logger.warning(f"Gemini prompt match search failed: {str(exc)}. Using fallback.")
        return build_fallback_match()

