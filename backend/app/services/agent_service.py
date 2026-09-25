import os
import re
import json
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from app.db.vector_search import vector_search_manager

logger = logging.getLogger("offside_ai.agent_service")

SAFETY_KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    {
        "id": "generic-matchday-crowds",
        "title": "Matchday crowd safety baseline",
        "sourceType": "RAG fallback",
        "scope": "All stadium trips",
        "city": "",
        "stadium": "",
        "tags": ["crowds", "stadium", "matchday", "egress", "safety"],
        "excerpt": "Use official fan corridors, avoid unmanaged shortcuts after full time, keep valuables secured in dense queues, and leave extra time for entry checks.",
        "url": "internal://safety/matchday-crowds",
    },
    {
        "id": "generic-transit-safety",
        "title": "Transit and late-night travel baseline",
        "sourceType": "RAG fallback",
        "scope": "All destination cities",
        "city": "",
        "stadium": "",
        "tags": ["transit", "late-night", "route", "taxi", "walking"],
        "excerpt": "Prefer well-lit routes, licensed taxis, official rideshare pickup areas, and staffed transit stations when travelling late at night.",
        "url": "internal://safety/transit-baseline",
    },
    {
        "id": "manchester-etihad",
        "title": "Manchester stadium district guidance",
        "sourceType": "RAG fallback",
        "scope": "Manchester / Etihad Stadium",
        "city": "Manchester",
        "stadium": "Etihad Stadium",
        "tags": ["manchester", "etihad", "tram", "crowds", "uk"],
        "excerpt": "Around Etihad Stadium, use signed walking routes and Metrolink or official taxi zones. Expect crowding at tram stops immediately after full time.",
        "url": "internal://safety/manchester-etihad",
    },
    {
        "id": "london-stadiums",
        "title": "London football travel safety guidance",
        "sourceType": "RAG fallback",
        "scope": "London stadium districts",
        "city": "London",
        "stadium": "",
        "tags": ["london", "tube", "stadium", "crowds", "uk"],
        "excerpt": "For London stadium trips, use TfL routes where possible, follow stewarded exits, and keep extra interchange time for busy Tube stations.",
        "url": "internal://safety/london-stadiums",
    },
    {
        "id": "madrid-stadiums",
        "title": "Madrid stadium district guidance",
        "sourceType": "RAG fallback",
        "scope": "Madrid stadium districts",
        "city": "Madrid",
        "stadium": "",
        "tags": ["madrid", "metro", "bernabeu", "metropolitano", "spain"],
        "excerpt": "For Madrid matchdays, Metro connections are usually the safest final-mile option. Avoid isolated side streets after late fixtures.",
        "url": "internal://safety/madrid-stadiums",
    },
    {
        "id": "milan-san-siro",
        "title": "Milan San Siro travel guidance",
        "sourceType": "RAG fallback",
        "scope": "Milan / San Siro",
        "city": "Milan",
        "stadium": "San Siro",
        "tags": ["milan", "san siro", "metro", "italy"],
        "excerpt": "For San Siro, use Metro Line M5 and allow time for post-match crowd control around station entrances.",
        "url": "internal://safety/milan-san-siro",
    },
]

# Try imports for Vertex AI
try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
    HAS_VERTEX_AI = True
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Failed to import vertexai: {e}")
    HAS_VERTEX_AI = False

# Try imports for Google Generative AI (AI Studio)
try:
    import google.generativeai as genai
    HAS_GENAI = True
except Exception as e:
    import logging
    logging.getLogger(__name__).warning(f"Failed to import google.generativeai: {e}")
    HAS_GENAI = False

class AgentService:
    def __init__(self) -> None:
        self.system_instruction = ""

        # Load system instructions dynamically from root agent specs
        root_dir = Path(__file__).resolve().parents[3]
        instruction_path = root_dir / "agents" / "globus-2026" / "system-instruction.md"

        try:
            if instruction_path.exists():
                with instruction_path.open("r", encoding="utf-8") as f:
                    self.system_instruction = f.read()
            else:
                self.system_instruction = "You are Globus 2026, an autonomous logistics agent."
        except Exception as exc:
            self.system_instruction = f"You are Globus 2026, an autonomous logistics agent. (Init error: {exc})"

        # Initialize Gemini Model if configured
        self.genai_initialized = False
        self.vertex_initialized = False
        self.llm_model = None

        from dotenv import load_dotenv
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        load_dotenv(dotenv_path=env_path, override=True)

        api_key = os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")
        if HAS_GENAI and api_key:
            try:
                genai.configure(api_key=api_key)
                self.llm_model = genai.GenerativeModel(model_name)
                self.genai_initialized = True
            except Exception:
                pass

        gcp_project = os.getenv("GCP_PROJECT")
        if not self.genai_initialized and HAS_VERTEX_AI and gcp_project:
            try:
                vertexai.init(project=gcp_project, location=os.getenv("GCP_LOCATION", "us-central1"))
                self.llm_model = GenerativeModel(model_name)
                self.vertex_initialized = True
            except Exception:
                pass

    async def get_user_profile(self, email: str) -> Dict[str, Any]:
        """Fetch user profile from MongoDB or mock DB fallback"""
        normalized_email = email.strip().lower()

        if vector_search_manager.db is not None:
            try:
                users_col = vector_search_manager.db["users"]
                user = await users_col.find_one({"email": normalized_email})
                if user:
                    return {
                        "name": user.get("name", "User"),
                        "followed_teams": user.get("followed_teams", []),
                        "favorite_players": user.get("favorite_players", []),
                        "country": user.get("country", ""),
                        "city": user.get("city", ""),
                        "stadium": user.get("stadium", ""),
                        "street": user.get("street", "")
                    }
            except Exception:
                pass

        # Guest profile for unauthenticated users
        return {
            "name": "Guest Fan",
            "followed_teams": ["Arsenal"],
            "favorite_players": ["Lionel Messi"],
            "country": "United Kingdom",
            "city": "London",
            "stadium": "Emirates Stadium",
            "street": "Highbury Hill"
        }

    def _score_safety_source(self, source: Dict[str, Any], terms: List[str], city: str, stadium: str) -> float:
        text = " ".join([
            str(source.get("title", "")),
            str(source.get("scope", "")),
            str(source.get("city", "")),
            str(source.get("stadium", "")),
            " ".join(source.get("tags", [])),
            str(source.get("excerpt", "")),
        ]).lower()
        score = 0.0
        city_l = city.lower()
        stadium_l = stadium.lower()

        if city_l and city_l in text:
            score += 5.0
        if stadium_l and stadium_l in text:
            score += 6.0
        for term in terms:
            if term and term in text:
                score += 1.0
        if not source.get("city") and not source.get("stadium"):
            score += 0.5
        return score

    async def _retrieve_safety_context(self, city: str, stadium: str, match_date: str) -> List[Dict[str, Any]]:
        """
        Safety RAG retrieval.
        In production this can read embedded official advisories. Locally it uses
        Mongo safety_sources if present, then falls back to curated safety notes.
        """
        query = f"{city} {stadium} {match_date} matchday safety transit emergency route crowd stadium"
        terms = [t for t in re.split(r"\W+", query.lower()) if len(t) > 2]
        candidates: List[Dict[str, Any]] = []

        if vector_search_manager.db is not None:
            try:
                collection = vector_search_manager.db["safety_sources"]
                regex_terms = [city, stadium, "matchday", "transit", "emergency"]
                regex_terms = [re.escape(t) for t in regex_terms if t]
                if regex_terms:
                    pattern = "|".join(regex_terms)
                    cursor = collection.find(
                        {
                            "$or": [
                                {"city": {"$regex": pattern, "$options": "i"}},
                                {"stadium": {"$regex": pattern, "$options": "i"}},
                                {"title": {"$regex": pattern, "$options": "i"}},
                                {"content": {"$regex": pattern, "$options": "i"}},
                                {"tags": {"$regex": pattern, "$options": "i"}},
                            ]
                        },
                        {"_id": 0, "embedding": 0},
                    ).limit(8)
                    mongo_docs = await cursor.to_list(length=8)
                    for doc in mongo_docs:
                        candidates.append({
                            "id": doc.get("id") or doc.get("slug") or doc.get("title", "safety-source"),
                            "title": doc.get("title", "Safety source"),
                            "sourceType": doc.get("sourceType", "RAG document"),
                            "scope": doc.get("scope") or f"{doc.get('city', city)} / {doc.get('stadium', stadium)}",
                            "city": doc.get("city", ""),
                            "stadium": doc.get("stadium", ""),
                            "tags": doc.get("tags", []),
                            "excerpt": doc.get("excerpt") or doc.get("content", "")[:240],
                            "url": doc.get("url", ""),
                        })
            except Exception as exc:
                print(f"Safety RAG retrieval failed, using fallback notes: {exc}")

        candidates.extend(SAFETY_KNOWLEDGE_BASE)
        scored = sorted(
            ((self._score_safety_source(src, terms, city, stadium), src) for src in candidates),
            key=lambda item: item[0],
            reverse=True,
        )

        selected: List[Dict[str, Any]] = []
        seen = set()
        for score, src in scored:
            src_id = src.get("id") or src.get("title")
            if src_id in seen or score <= 0:
                continue
            seen.add(src_id)
            selected.append({
                "id": src_id,
                "title": src.get("title", "Safety source"),
                "sourceType": src.get("sourceType", "RAG fallback"),
                "scope": src.get("scope", ""),
                "excerpt": src.get("excerpt", ""),
                "url": src.get("url", ""),
                "score": round(score, 2),
            })
            if len(selected) >= 4:
                break
        return selected

    async def run_chat(self, email: str, query: str, lodging: str = None) -> Dict[str, Any]:
        """
        AI-powered Chat orchestration:
        1. Read profile
        2. Use Gemini to determine target tools (or fall back to regex/keywords)
        3. Call tools via MCP client
        4. Synthesize final response via Gemini (or fall back to static template)
        """
        profile = await self.get_user_profile(email)
        query_lower = query.lower()

        tool_calls_made = []
        action_details = []
        markdown_reply = ""

        # Check if we can use the LLM model
        if self.llm_model:
            intent_prompt = f"""
            You are the logistics router node for Globus 2026.
            Your task is to analyze the user's query and decide which MCP tools (from the list below) should be called to fetch data, or if the query can be answered directly using your general knowledge.

            User Profile Context:
            - Name: {profile.get('name')}
            - Followed Teams: {profile.get('followed_teams')}
            - Favorite Stadium: {profile.get('stadium')}
            - Home City: {profile.get('city')}
            - Home Street: {profile.get('street')}
            - Selected Lodging: {lodging or "None"}

            Available Tools:
            1. "search_stays": Find lodging options (hotels, hostels, airbnbs, shared rooms).
               Arguments:
               - stadium: string (name of target stadium, e.g. "Emirates Stadium")
               - accommodation_type: string ("all", "hotel", "hostel", "shared_room", "airbnb")
               - max_price: number (optional)
               - min_rating: number (optional)
               - required_amenities: array of strings (e.g. ["WiFi", "AC"])
            2. "get_directions": Find transit routes, taxi estimates, and walking directions from an origin to the stadium.
               Arguments:
               - origin: string (starting address, city, or hotel name)
               - destination: string (destination stadium name)
               - mode: string ("transit", "walking", "cab")
            3. "get_food_reviews": Find restaurants, convenience stores, pubs, pharmacies, tourist spots, and reviews around a stadium or lodging.
               Arguments:
               - venue: string (stadium name or hotel name/address to search around)
            4. "get_team_matches": Fetch upcoming fixtures, competitor names, kickoff dates, and schedule for a team.
               Arguments:
               - team_name: string (name of the club team)

            Response Guidelines:
            - If the user asks a general question (e.g., football trivia, weather estimates, who won a match in the past, general greetings, etc.) that does NOT require querying live stays, directions, schedules, or nearby places, do NOT call any tools. Set tool_calls to an empty list [].
            - If the user asks about coding, DSA, algorithms, software engineering, or anything completely unrelated to logistics and travel, you MUST NOT call any tools. Set tool_calls to an empty list [].
            - If the user asks about "me", "my lodging", "my hotel", etc., and they have a selected lodging, use the selected lodging name ("{lodging or ''}") as the origin for directions or venue for nearby reviews. If they specify a location directly (e.g. "near Anfield"), use that specific location.
            - If the user asks for directions, stays, schedules, or reviews, construct the tool_calls list with correct arguments.

            Return ONLY a valid JSON object. Do not include markdown code block formatting or other text.
            JSON Response Schema:
            {{
                "tool_calls": [
                    {{
                        "name": "search_stays" | "get_directions" | "get_food_reviews" | "get_team_matches",
                        "arguments": {{ ... }}
                    }}
                ]
            }}

            User Query: "{query}"
            JSON Response:
            """
            try:
                response = self.llm_model.generate_content(
                    intent_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )

                clean_text = response.text.strip()
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    clean_text = clean_text[start_idx:end_idx+1]
                data = json.loads(clean_text)
                llm_tool_calls = data.get("tool_calls", [])
            except Exception as e:
                print(f"Gemini intent routing failed: {e}")
                llm_tool_calls = None
        else:
            llm_tool_calls = None

        from app.mcp.stay_mcp_client import StayMCPClient
        client = StayMCPClient()

        # Connect MCP Client
        try:
            await client.connect()
        except Exception as exc:
            return {
                "reply": f"⚠️ **Globus 2026 Connection Error**: Could not connect to logistics MCP service. Details: {exc}",
                "profile": profile,
                "tool_calls": []
            }

        try:
            if llm_tool_calls is not None:
                # Execute Gemini-selected tools
                for tc in llm_tool_calls:
                    name = tc.get("name")
                    args = tc.get("arguments") or {}
                    if name in ["search_stays", "get_directions", "get_food_reviews", "get_team_matches"]:
                        tool_calls_made.append({
                            "name": name,
                            "arguments": args
                        })
                        res = await client.call_tool(name, args)
                        action_details.append(res)
            else:
                # Fallback to keyword-based checks
                if any(w in query_lower for w in ["hostel", "hotel", "stay", "accommodation", "room", "airbnb", "lodging"]):
                    types_to_include = []
                    if "hotel" in query_lower:
                        types_to_include.append("hotel")
                    if "hostel" in query_lower:
                        types_to_include.append("hostel")
                    if "shared" in query_lower or "sharing" in query_lower or "dorm" in query_lower:
                        types_to_include.append("shared_room")
                    if "airbnb" in query_lower or "apartment" in query_lower:
                        types_to_include.append("airbnb")

                    acc_type = types_to_include[0] if len(types_to_include) == 1 else "all"

                    max_price = None
                    import re
                    price_match = re.search(r'(?:under|below|max|budget)?\s*\$?\s*(\d+)\s*(?:usd|dollars)?', query_lower)
                    if price_match:
                        extracted = int(price_match.group(1))
                        if extracted < 1000:
                            max_price = extracted

                    min_rating = None
                    rating_match = re.search(r'(?:rating|stars?)\s*(?:above|over|of|at least|>=|>)?\s*([0-9.]+)', query_lower)
                    if rating_match:
                        try:
                            min_rating = float(rating_match.group(1))
                        except ValueError:
                            pass

                    sort_by = "rating" if "rating" in query_lower else "price"
                    req_amenities = []
                    for am in ["wifi", "breakfast", "kitchen", "ac", "pool", "gym", "bar"]:
                        if am in query_lower:
                            req_amenities.append(am.replace("wifi", "WiFi").replace("breakfast", "Free Breakfast").replace("ac", "AC").title())

                    arguments = {"stadium": profile.get("stadium") or "Emirates Stadium", "accommodation_type": acc_type}
                    if max_price is not None:
                        arguments["max_price"] = max_price
                    if min_rating is not None:
                        arguments["min_rating"] = min_rating
                    if req_amenities:
                        arguments["required_amenities"] = req_amenities
                    if sort_by != "price":
                        arguments["sort_by"] = sort_by

                    tool_calls_made.append({"name": "search_stays", "arguments": arguments})
                    res = await client.call_tool("search_stays", arguments)
                    if len(types_to_include) > 1 and res.get("status") == "success" and "stays" in res:
                        res["stays"] = [s for s in res["stays"] if s["type"] in types_to_include]
                    action_details.append(res)

                if any(w in query_lower for w in ["directions", "route", "travel", "metro", "cab", "walk", "get to"]):
                    dir_args = {"origin": user_city, "destination": profile.get("stadium") or "Emirates Stadium", "mode": "transit"}
                    tool_calls_made.append({"name": "get_directions", "arguments": dir_args})
                    res = await client.call_tool("get_directions", dir_args)
                    action_details.append(res)

                if any(w in query_lower for w in ["food", "drink", "pub", "restaurant", "review", "pie", "shop", "store", "supermarket", "grocery", "groceries", "pharmacy", "tourist", "sight", "sights"]):
                    search_origin = profile.get("stadium") or "Emirates Stadium"
                    
                    # Check for explicit locations
                    known_locations = ["anfield", "emirates", "old trafford", "stamford bridge", "wembley", "london", "madrid", "barcelona", "manchester"]
                    for loc in known_locations:
                        if loc in query_lower:
                            search_origin = loc.title()
                            break
                            
                    if any(w in query_lower for w in ["me", "my lodging", "my hotel", "my stay", "here"]):
                        if lodging:
                            search_origin = lodging
                        elif profile.get("street") and profile.get("city"):
                            search_origin = f"{profile['street']}, {profile['city']}"
                        elif profile.get("city"):
                            search_origin = profile["city"]

                    rev_args = {"venue": search_origin}
                    tool_calls_made.append({"name": "get_food_reviews", "arguments": rev_args})
                    res = await client.call_tool("get_food_reviews", rev_args)
                    action_details.append(res)

                if any(w in query_lower for w in ["match", "fixture", "schedule", "game", "upcoming"]):
                    target_team = profile.get("followed_teams")[0] if profile.get("followed_teams") else "Arsenal"
                    match_args = {"team_name": target_team}
                    tool_calls_made.append({"name": "get_team_matches", "arguments": match_args})
                    res = await client.call_tool("get_team_matches", match_args)
                    action_details.append(res)
        finally:
            await client.disconnect()

        # Synthesis
        if self.llm_model:
            # Clean action details for prompt size
            action_details_clean = []
            for ad in action_details:
                clean_ad = dict(ad)
                if "stays" in clean_ad:
                    clean_ad["stays"] = clean_ad["stays"][:5]
                action_details_clean.append(clean_ad)

            synthesis_prompt = f"""
            You are Globus 2026, the premium autonomous World Cup logistics coordinator and assistant.
            Provide a highly polished, helpful, and natural response to the user's query.

            User Profile Context:
            - Name: {profile.get('name')}
            - Followed Teams: {profile.get('followed_teams')}
            - Favorite Stadium: {profile.get('stadium')}
            - Home City: {profile.get('city')}
            - Selected Lodging: {lodging or "None"}

            User Query: "{query}"

            Tools Executed & Data Returned:
            {json.dumps(action_details_clean, indent=2)}

            Guidelines:
            - If tools were executed, incorporate the fetched details (stays, routes, places, fixtures) in your answer. Present them clearly using markdown tables, bullet points, or clean sections.
            - If no tools were executed or returned errors, answer the user's query directly using your general knowledge (which could be about football, clubs, stadiums, travel advice, or standard greetings).
            - Keep it relevant, highly professional, and align with the "Globus 2026 Operations" theme.
            - STRICT RESTRICTION: If the user asks about a topic completely unrelated to football, sports, World Cup, stadiums, logistics, travel, or accommodations (for example: coding algorithms like BFS/DSU, software engineering, math, history, general programming), you MUST politely refuse to answer that topic. Do NOT provide code or explanations for unrelated topics. Instead, steer the conversation back to their matchday plans.
            - If the user asks for recommendations "near me" but hasn't set a stay or home city, politely ask them. BUT if they specify a location in the query (like "near Anfield" or "in London"), DO NOT ask for their location, just answer based on the fetched data.
            - Do NOT include any markdown code block wrappers (e.g. ```markdown) around the response itself. Output the raw markdown text directly.
            """
            try:
                response = self.llm_model.generate_content(synthesis_prompt)
                markdown_reply = response.text.strip()
            except Exception as e:
                print(f"Gemini response synthesis failed: {e}")
                markdown_reply = ""

        if not markdown_reply:
            markdown_reply = self._synthesize_response(query, profile, tool_calls_made, action_details)

        return {
            "reply": markdown_reply,
            "profile": profile,
            "tool_calls": tool_calls_made,
            "action_details": action_details
        }

    async def run_planning(self, email: str, prompt: str) -> Dict[str, Any]:
        """
        AI-guided logistics planning based on a natural language prompt (e.g. budget).
        Steps:
        1. Intent & Entity Extraction: Ask Gemini to extract destination, dates, budget, etc.
        2. Convert to Constraints: Formulate constraints based on the extracted entities.
        3. Retrieval: Call schedules search, stays search, and routes search tools.
        4. Candidate Scoring & Multi-objective Optimization: Rank hotels/stays by price fit, rating, and distance.
        5. Decision & Validation: Select primary stay, backup option, and check budget limits.
        6. Premium Itinerary Synthesis: Call Gemini to summarize the logistics briefing.
        """
        profile = await self.get_user_profile(email)
        prompt_lower = prompt.lower()
        user_city = profile.get("city") or "London"
        data_warnings = []

        # --- Step 1: Intent & Entity Extraction (LLM Slot Filling) ---
        entities = {}
        if self.llm_model:
            extraction_prompt = f"""
            You are an expert logistics coordinator and information extraction assistant.
            Extract the following entities from the user's travel planning prompt.
            Return ONLY a valid JSON object. Do not include any markdown styling like ```json or any other text.

            Fields to extract:
            - destination_city (string or null, e.g. "Madrid", "London", "Delhi")
            - if destination is a specific stadium, also extract destination_stadium (string or null, e.g. "Emirates Stadium", "Santiago Bernabéu", "Anfield")
            - if destination is not mentioned find nearest scheduled upcoming match between them and returen the destination stadium name
            - dates (list of strings or null)
            - budget_limit (float or null, representing maximum USD. If budget is in other currencies like INR, convert to USD. E.g. 8k INR is ~100 USD. If €150, convert to ~160 USD)
            - stadium (string or null, e.g. "Emirates Stadium", "Santiago Bernabéu", "Anfield", "Etihad Stadium")
            - travel_mode (string, default to "transit")
            - hotel_preferences (list of strings, e.g. ["WiFi", "Pool", "Gym", "Breakfast"])
            - teams (list of strings, e.g. ["Real Madrid", "Arsenal", "Liverpool"])
            - max_distance (float or null, representing maximum miles from stadium)

            User Prompt: "{prompt}"
            JSON Response:
            """
            try:
                response = self.llm_model.generate_content(
                    extraction_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                print("--- GEMINI EXTRACTION RESPONSE ---")
                print(response.text)
                clean_text = response.text.strip()
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    clean_text = clean_text[start_idx:end_idx+1]
                entities = json.loads(clean_text)
            except Exception as e:
                logger.error(f"Failed to extract entities from prompt: {e}")
                entities = {}

        # --- Step 2: Convert to Constraints ---
        # Parse fallback values if LLM did not extract them
        budget_limit = entities.get("budget_limit")
        if budget_limit is None:
            # Fallback regex for budget (requiring keywords or units to avoid matching dates like "30 june")
            budget_match = re.search(r'(?:under|below|max|budget|price|limit)\s*\$?\s*(\d+)', prompt_lower)
            if not budget_match:
                budget_match = re.search(r'\$\s*(\d+)', prompt_lower)
            if not budget_match:
                budget_match = re.search(r'(\d+)\s*(?:usd|dollars|bucks)', prompt_lower)

            if budget_match:
                budget_limit = float(budget_match.group(1))
            else:
                budget_limit = 150.0 # Default budget

        max_dist = entities.get("max_distance") or 5.0
        hotel_prefs = entities.get("hotel_preferences") or []
        preferred_mode = entities.get("travel_mode") or "transit"
        dest_city = entities.get("destination_city") or user_city
        teams_filter = entities.get("teams") or []

        # Parse date query for matching (supporting all months)
        date_query = None
        if entities.get("dates"):
            raw_date = entities["dates"][0]
            date_query = raw_date
            lower_d = raw_date.lower()
            months_map = {
                "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
                "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
            }
            matched_month = None
            for name, num in months_map.items():
                if name in lower_d:
                    matched_month = num
                    break
            if matched_month:
                day_m = re.search(r'(\d+)', lower_d)
                if day_m:
                    date_query = f"2026-{matched_month}-{int(day_m.group(1)):02d}"

        # Resolve match details directly if enough details are provided in entities
        selected_match = None
        compromised_match = False
        resolved_from_entities = False

        if teams_filter and date_query:
            home_team = teams_filter[0]
            from app.services.team_matches_helper import TEAM_ID_MAP, TEAM_METADATA
            team_id = TEAM_ID_MAP.get(home_team)
            if not team_id:
                lower = home_team.lower()
                for mapped_name, mapped_id in TEAM_ID_MAP.items():
                    if lower in mapped_name.lower() or mapped_name.lower() in lower:
                        team_id = mapped_id
                        break

            venue = entities.get("stadium") or entities.get("destination_stadium")
            city = entities.get("destination_city")
            country = None

            if team_id in TEAM_METADATA:
                meta = TEAM_METADATA[team_id]
                if not venue:
                    venue = meta["venue"]
                if not city:
                    city = meta["city"]
                country = meta["country"]

            # Fallbacks
            if not venue:
                venue = "Stadium"
            if not city:
                city = "London"
            if not country:
                country = "United Kingdom"

            selected_match = {
                "home_team": home_team,
                "away_team": teams_filter[1] if len(teams_filter) > 1 else "TBD",
                "date": date_query,
                "venue": venue,
                "city": city,
                "country": country
            }
            resolved_from_entities = True

        if not resolved_from_entities:
            # --- Step 3: Retrieve Candidate Options (API/Tool Call) ---
            # 3.1 Match retrieval & Stadium constraint geocoding
            matches = await vector_search_manager.get_all_schedules()
            followed = profile.get("followed_teams", [])
            if not matches:
                from app.services.team_matches_helper import fetch_team_matches, TEAM_ID_MAP
                query_teams = list(set(followed + teams_filter))
                if not query_teams:
                    query_teams = ["Arsenal", "PSG", "Man City", "Barcelona", "Bayern Munich"]

                all_fetched = []
                for team in query_teams:
                    team_id = TEAM_ID_MAP.get(team)
                    if not team_id:
                        lower = team.lower()
                        for mapped_name, mapped_id in TEAM_ID_MAP.items():
                            if lower in mapped_name.lower() or mapped_name.lower() in lower:
                                team_id = mapped_id
                                break
                    if team_id:
                        try:
                            team_m = await fetch_team_matches(team_id, team, warnings=data_warnings)
                            if not team_m:
                                data_warnings.append(
                                    f"No matches found or retrieved for {team}. The team may have no upcoming scheduled matches, "
                                    f"or access is restricted under the free subscription tier of Football-Data.org."
                                )
                            all_fetched.extend(team_m)
                        except Exception as exc:
                            data_warnings.append(f"Failed to fetch matches for {team}: {exc}")

                seen_ids = set()
                for m in all_fetched:
                    mid = m.get("id")
                    if mid not in seen_ids:
                        seen_ids.add(mid)
                        matches.append({
                            "match_no": len(matches) + 1,
                            "stage": m.get("league") or "Match",
                            "date": m.get("eventDate", "").split("T")[0] if "T" in m.get("eventDate", "") else m.get("eventDate"),
                            "time": m.get("eventDate", "").split("T")[1][:5] if "T" in m.get("eventDate", "") else "20:00",
                            "home_team": m.get("homeTeam"),
                            "away_team": m.get("awayTeam"),
                            "venue": m.get("venue") or "Stadium",
                            "city": m.get("city") or "London",
                            "country": m.get("country") or "United Kingdom"
                        })

            # Match scoring model
            best_score = -1000
            best_match = None

            stadium_query = (entities.get("stadium") or "").lower()
            city_query = (entities.get("destination_city") or "").lower()

            for m in matches:
                score = 0
                home = m.get("home_team", "").lower()
                away = m.get("away_team", "").lower()
                venue = m.get("venue", "").lower()
                city = m.get("city", "").lower()
                m_date = m.get("date", "")

                # Match teams
                if teams_filter:
                    if any(t.lower() in home or t.lower() in away for t in teams_filter):
                        score += 50
                elif followed:
                    if any(t.lower() in home or t.lower() in away for t in followed):
                        score += 10

                # Match stadium
                if stadium_query and stadium_query in venue:
                    score += 30

                # Match city
                if city_query and city_query in city:
                    score += 20

                # Match date proximity
                if date_query and m_date:
                    if m_date == date_query:
                        score += 100
                    else:
                        try:
                            dt1 = datetime.strptime(m_date, "%Y-%m-%d")
                            dt2 = datetime.strptime(date_query, "%Y-%m-%d")
                            diff = abs((dt1 - dt2).days)
                            if diff <= 5:
                                score += (6 - diff) * 10
                        except Exception:
                            pass

                if score > best_score:
                    best_score = score
                    best_match = m

            if best_match and best_score > 0:
                selected_match = best_match
            else:
                if matches:
                    selected_match = matches[0]
                    compromised_match = True

            if not selected_match:
                raise ValueError("No matches available for planning.")

        match_name = f"{selected_match.get('home_team')} vs {selected_match.get('away_team')}"
        match_date = selected_match.get("date", "")
        stadium = selected_match.get("venue", "Emirates Stadium")
        match_city = selected_match.get("city") or "London"

        # 3.2 Stays & Directions Tool Call
        from app.mcp.stay_mcp_client import StayMCPClient
        client = StayMCPClient()
        try:
            await client.connect()
        except Exception as exc:
            import traceback
            traceback.print_exc()
            raise RuntimeError(f"Could not connect to logistics MCP service: {exc}")

        stays_list = []
        routes = []
        recommendations = {}

        try:
            # Search stays candidate list
            stay_res = await client.call_tool("search_stays", {"stadium": stadium, "accommodation_type": "all"})
            stays_list = stay_res.get("stays") or []
            data_warnings.extend(stay_res.get("warnings") or [])

            # Fetch routes
            dir_res = await client.call_tool("get_directions", {
                "origin": dest_city,
                "destination": stadium,
                "mode": preferred_mode
            })
            routes = dir_res.get("routes") or []
            recommendations = dir_res.get("recommendations") or {}
            data_warnings.extend(dir_res.get("warnings") or [])
        finally:
            await client.disconnect()

        origin_city = profile.get("city") or "London"
        dest_city = match_city
        if not stays_list:
            data_warnings.append("Stay search returned no hotel/hostel results. Check Hotelbeds/LiteAPI/Airbnb provider configuration.")
        if not routes:
            data_warnings.append("Route service returned no flight/train/road options. Connect a transit, rail, flight, or maps provider for live route preferences.")

        safety_sources = await self._retrieve_safety_context(dest_city, stadium, match_date)
        safety_context = "\n".join(
            f"- {src['title']} ({src['scope']}): {src['excerpt']}"
            for src in safety_sources
        )

        # Generate city safety briefing using RAG-grounded context plus Gemini if available
        safety_briefing = {
            "level": "Low Risk",
            "score": 8.8,
            "summary": f"Standard precautions are recommended in {dest_city}. This is an estimated, RAG-grounded safety status based on retrieved stadium, city, and transit guidance.",
            "emergencyNumbers": {
                "Emergency": "999" if dest_city.lower() in ["london", "manchester", "liverpool"] else "112",
                "Non-Emergency": "101" if dest_city.lower() in ["london", "manchester", "liverpool"] else "110"
            },
            "tips": [
                "Keep personal belongings secure in crowded areas and transit hubs.",
                "Stick to well-lit routes and official fan walkways when leaving the stadium.",
                "Use licensed taxis or official ride-sharing apps for late-night travel."
            ]
        }

        # Safety briefing LLM call removed here to combine with itinerary synthesis call.

        safety_briefing["sourceType"] = "rag_grounded_estimate"
        safety_briefing["sourceLabel"] = "Estimated + RAG Grounded"
        safety_briefing["liveStatus"] = False
        safety_briefing["sourcesUsed"] = safety_sources

        # --- Step 4: Candidate Scoring & Multi-Objective Optimization ---
        scored_stays = []
        for s in stays_list:
            price = float(s.get("price_usd", 999.0))
            rating = float(s.get("rating", 0.0))
            distance = float(s.get("distance_miles", 99.0))
            amenities = s.get("amenities", [])

            # 1. Price Score: stays must leave room for ticket ($50) and transit ($5).
            # Ideal lodging price is budget_limit - 55.
            ideal_limit = max(20.0, budget_limit - 55.0)
            if price > budget_limit:
                price_score = -500.0  # Violates budget constraint
            elif price > ideal_limit:
                # Tight fit
                price_score = (1.0 - (price - ideal_limit) / (budget_limit - ideal_limit)) * 20.0
            else:
                # Well within budget
                price_score = 40.0 + (1.0 - (price / ideal_limit)) * 10.0

            # 2. Rating Score (scaled to 30)
            rating_score = (rating / 5.0) * 30.0

            # 3. Distance Score (scaled to 15)
            if distance > max_dist:
                distance_score = -200.0  # Violates distance constraints
            else:
                distance_score = (1.0 - (distance / max_dist)) * 15.0

            # 4. Amenities Match (scaled to 5)
            amenity_matches = 0
            if hotel_prefs:
                for pref in hotel_prefs:
                    if any(pref.lower() in am.lower() for am in amenities):
                        amenity_matches += 1
                amenity_score = (amenity_matches / len(hotel_prefs)) * 5.0
            else:
                amenity_score = 5.0

            total_score = price_score + rating_score + distance_score + amenity_score
            scored_stays.append((total_score, s))

        # Sort by score descending
        scored_stays = sorted(scored_stays, key=lambda x: x[0], reverse=True)

        selected_stay = None
        backup_stay = None
        compromised_stay = False

        if scored_stays:
            best_score, selected_stay = scored_stays[0]
            if best_score < 0:
                # All candidates violated budget/distance. Compromise: pick cheapest.
                selected_stay = sorted(stays_list, key=lambda x: x.get("price_usd", 999.0))[0]
                compromised_stay = True

            # Select backup lodging
            if len(scored_stays) > 1:
                _, backup_stay = scored_stays[1]
            else:
                backup_stay = selected_stay
        else:
            selected_stay = None
            backup_stay = None
            compromised_stay = True

        stay_options = []
        for score, stay in scored_stays[:6]:
            option = dict(stay)
            option["selection_score"] = round(score, 2)
            option["why"] = (
                "Strong fit across budget, rating, distance, and requested amenities."
                if score >= 0
                else "Fallback option that misses at least one constraint."
            )
            stay_options.append(option)
        stay_name = selected_stay.get("name") if selected_stay else None
        route_options = []
        for route in routes:
            enriched_route = dict(route)
            steps = str(enriched_route.get("steps") or "")
            legs = []
            for idx, segment in enumerate([part.strip() for part in steps.split("->") if part.strip()]):
                legs.append({
                    "label": f"Leg {idx + 1}",
                    "detail": segment,
                    "duration_minutes": None,
                    "cost_usd": None,
                })
            enriched_route["legs"] = legs
            enriched_route["connects_to"] = stay_name
            enriched_route["best_for"] = "Fetched route option from the directions provider."
            route_options.append(enriched_route)
        routes = route_options

        # --- Step 5: Decide, Validate and Assemble Plan ---
        stay_price = float(selected_stay.get("price_usd") or 0.0) if selected_stay else 0.0
        selected_route = routes[0] if routes else None
        transit_cost = float(selected_route.get("cost_usd") or 0.0) if selected_route else 0.0
        ticket_cost = 50.0
        total_cost = stay_price + transit_cost + ticket_cost
        is_within_budget = total_cost <= budget_limit
        status_text = "Within Budget" if is_within_budget else "Over Budget (Compromised)"
        selected_stay_reason = (
            "Selected as the strongest available fit across price, rating, stadium distance, and requested amenities."
            if selected_stay and not compromised_stay
            else "No stay was selected because the stay provider returned no valid hotel/hostel result."
        )
        selected_route_reason = (
            "Selected as the first route returned by the directions provider."
            if selected_route
            else "No route was selected because the route provider returned no valid flight/train/road option."
        )
        validation_checks = [
            {
                "label": "Budget",
                "status": "pass" if is_within_budget else "warning",
                "detail": f"Estimated total ${total_cost:.2f} against target budget ${budget_limit:.2f}.",
            },
            {
                "label": "Stay distance",
                "status": "pass" if selected_stay and float(selected_stay.get("distance_miles") or 99.0) <= max_dist else "warning",
                "detail": f"{selected_stay.get('distance_miles') or 0.0} miles from {stadium}; requested max is {max_dist} miles." if selected_stay else "Stay distance could not be validated because no stay data was returned.",
            },
            {
                "label": "Route feasibility",
                "status": "pass" if selected_route and selected_route.get("steps") else "warning",
                "detail": f"{selected_route.get('mode') or 'Transit'} route includes {selected_route.get('duration_minutes') or 0} minutes of planned travel." if selected_route else "Route feasibility could not be validated because no route data was returned.",
            },
            {
                "label": "Safety grounding",
                "status": "pass" if safety_sources else "warning",
                "detail": f"{len(safety_sources)} retrieved safety source(s); live incident feeds are not configured.",
            },
        ]
        planning_stages = [
            {
                "id": "understand",
                "label": "Understand request",
                "brief": f"Extracted destination {dest_city}, budget ${budget_limit:.2f}, preferred mode {preferred_mode}, and max stay distance {max_dist} miles.",
                "details": [
                    f"Destination city: {dest_city}",
                    f"Budget limit: ${budget_limit:.2f}",
                    f"Travel mode: {preferred_mode}",
                ],
            },
            {
                "id": "match",
                "label": "Find match",
                "brief": f"Selected {match_name} at {stadium} on {match_date}.",
                "details": [
                    f"Match: {match_name}",
                    f"Venue: {stadium}",
                    f"Date: {match_date or 'TBD'}",
                ],
            },
            {
                "id": "stay",
                "label": "Find stay",
                "brief": f"Selected {selected_stay.get('name') or 'Unknown'} at ${stay_price:.2f}/night, {selected_stay.get('distance_miles') or 'TBD'} miles from the stadium." if selected_stay else "Stay provider returned no hotel/hostel result.",
                "details": [
                    f"Type: {selected_stay.get('type') or 'Unknown'}" if selected_stay else "Type: unavailable",
                    f"Rating: {selected_stay.get('rating') or 'TBD'}/5" if selected_stay else "Rating: unavailable",
                    f"Reason: {selected_stay_reason}",
                ],
            },
            {
                "id": "route",
                "label": "Find route / flight",
                "brief": f"Selected {selected_route.get('mode') or 'Transit'} taking {selected_route.get('duration_minutes') or 'TBD'} minutes for about ${float(selected_route.get('cost_usd') or 0.0):.2f}." if selected_route else "Route provider returned no flight/train/road option.",
                "details": [
                    f"Origin: {origin_city}",
                    f"Destination: {dest_city} / {stadium}",
                    f"Route: {selected_route.get('steps') or 'TBD'}" if selected_route else "Route: unavailable",
                ],
            },
            {
                "id": "validate",
                "label": "Validate and brief",
                "brief": f"Validation finished with budget status: {status_text}. Safety is {safety_briefing.get('sourceLabel')}.",
                "details": [
                    f"Fare total: ${total_cost:.2f}",
                    f"Safety level: {safety_briefing.get('level')}",
                    f"Sources retrieved: {len(safety_sources)}",
                ],
            },
        ]

        # --- Step 6: Itinerary Synthesis (LLM summary / response synthesis) ---
        summary_text = ""
        if self.llm_model:
            best_route = selected_route or {"mode": "Unavailable", "duration_minutes": "Unavailable", "cost_usd": 0.0, "steps": "Route provider returned no usable route."}
            stay_summary = selected_stay or {"name": "Unavailable", "type": "Unavailable", "price_usd": 0.0, "rating": "Unavailable", "distance_miles": "Unavailable", "amenities": []}
            backup_summary = backup_stay or {"name": "Unavailable", "price_usd": 0.0, "rating": "Unavailable"}
            recs_dict = recommendations if isinstance(recommendations, dict) else {}

            combined_prompt = f"""
            You are Globus 2026, the premium autonomous World Cup logistics coordinator and safety briefing coordinator.
            Construct both a safety briefing for travellers visiting the city of {dest_city} around {stadium}, and a highly polished, premium itinerary.

            Use ONLY the retrieved safety context below for grounding. Do not claim live police,
            weather, protest, incident, or emergency-feed status unless it is explicitly present.
            Label the status as an estimate when live feeds are not available.

            Retrieved safety context:
            {safety_context}

            --- LOGISTICS CONSTRAINTS & DETAILS ---
            User Target Budget: ${budget_limit:.2f} USD
            Chosen Match: {match_name} on {match_date} at {stadium}

            PRIMARY SELECTED LODGING:
            - Name: {stay_summary.get('name') or 'Unavailable'}
            - Type: {stay_summary.get('type') or 'Unavailable'}
            - Price: ${float(stay_summary.get('price_usd') or 0.0):.2f}/night
            - Rating: {stay_summary.get('rating') or 'Unavailable'}/5
            - Distance to Stadium: {stay_summary.get('distance_miles') or 'Unavailable'} miles
            - Amenities: {", ".join(stay_summary.get('amenities') or [])}

            BACKUP LODGING OPTION:
            - Name: {backup_summary.get('name') or 'Unavailable'} (Price: ${float(backup_summary.get('price_usd') or 0.0):.2f}/night, Rating: {backup_summary.get('rating') or 0.0}/5)

            TRANSIT ROUTE:
            - Mode: {best_route.get('mode') or 'Unavailable'} (Duration: {best_route.get('duration_minutes') or 'Unavailable'} mins, Cost: ${float(best_route.get('cost_usd') or 0.0):.2f})
            - Steps: {best_route.get('steps') or 'Unavailable'}

            ESTIMATED TOTAL FARE BREAKDOWN:
            - Lodging: ${stay_price:.2f}
            - Transit: ${transit_cost:.2f}
            - Match Ticket: ${ticket_cost:.2f}
            - Grand Total: ${total_cost:.2f}
            - Budget Status: {status_text}

            RECOMMENDED PLACES (NEAR STADIUM):
            - Food & Pubs: {recs_dict.get('restaurants') or []}
            - Convenience: {recs_dict.get('convenience_stores') or []}
            - Pharmacies: {recs_dict.get('pharmacies') or []}
            - Tourist Spots: {recs_dict.get('tourist_spots') or []}
            - Data warnings: {data_warnings}

            Provide a premium logistics dispatch matching the Globus 2026 theme:
            - Start with a clear Title: "### ✨ Globus 2026 AI Agent Journey Plan"
            - Use bullet points or a short table for match and lodging selections.
            - Summarize the fare breakdown.
            - Include transit routing options and transfer advisory notes (e.g. mention transfer points, walking corridors).
            - Add operations tips (risks, mitigations, transfer advisories, break points).

            Return ONLY a valid JSON object. Do not include any markdown formatting like ```json or other text.
            JSON Response Schema:
            {{
                "safety_briefing": {{
                    "level": "Low Risk" | "Moderate Caution" | "High Vigilance",
                    "score": float (0.0 to 10.0),
                    "summary": "string describing safety status for match day",
                    "emergencyNumbers": {{
                        "Emergency": "string",
                        "Non-Emergency": "string"
                    }},
                    "tips": ["string", "string", "string"]
                }},
                "itinerary_summary": "raw markdown itinerary text..."
            }}
            """
            try:
                response = self.llm_model.generate_content(
                    combined_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                print("--- GEMINI COMBINED ITINERARY AND SAFETY RESPONSE ---")
                print(response.text)
                
                clean_text = response.text.strip()
                start_idx = clean_text.find('{')
                end_idx = clean_text.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    clean_text = clean_text[start_idx:end_idx+1]
                data = json.loads(clean_text)
                
                if isinstance(data.get("safety_briefing"), dict):
                    # Update safety briefing dict with LLM values
                    for k, v in data["safety_briefing"].items():
                        safety_briefing[k] = v
                summary_text = data.get("itinerary_summary", "").strip()
            except Exception as e:
                print(f"Gemini combined generation failed: {e}")
                summary_text = ""

        # Fallback heuristic summary text if Gemini failed or was not initialized
        if not summary_text:
            match_status = "matches your followed teams" if not compromised_match else "selected as the best upcoming option (compromised)"
            summary_bullets = [
                f"🎯 **Match Selection**: We selected **{match_name}** on **{match_date}** at **{stadium}**. This {match_status}.",
            ]
            if selected_stay:
                stay_status = "chosen from provider results under the active planning constraints" if not compromised_stay else "returned by the provider but outside at least one requested constraint"
                summary_bullets.append(
                    f"🏨 **Lodging Choice**: We selected **{selected_stay.get('name')}** ({selected_stay.get('type')}) at **${stay_price}/night** (Rating: {selected_stay.get('rating')}/5, Distance: {selected_stay.get('distance_miles')} miles). This was {stay_status}."
                )
            else:
                summary_bullets.append("🏨 **Lodging Choice**: No hotel/hostel data was returned by the stay provider.")

            if selected_route:
                best_route = selected_route
                summary_bullets.append(
                    f"🚇 **Transit routing**: Best route is via **{best_route.get('mode')}** taking **{best_route.get('duration_minutes')} minutes** (Est Cost: ${best_route.get('cost_usd'):.2f})."
                )
                if "steps" in best_route:
                    summary_bullets.append(f"   *Route details*: {best_route['steps']}")
            else:
                summary_bullets.append("🚇 **Transit routing**: No flight/train/road route was returned by the directions provider.")

            summary_bullets.append(
                f"💸 **Total Fare Summary**: Stay: **${stay_price:.2f}** | Transit: **${transit_cost:.2f}** | Est. Ticket: **${ticket_cost:.2f}** | **Grand Total: ${total_cost:.2f}** (Target Budget: ${budget_limit:.2f})."
            )
            if data_warnings:
                summary_bullets.append("⚠️ **Data Warnings**: " + " ".join(data_warnings))
            summary_text = "### ✨ Globus 2026 AI Agent Journey Plan\n\n" + "\n".join(summary_bullets)

        return {
            "status": "success",
            "matchName": match_name,
            "matchDate": match_date,
            "stadium": stadium,
            "selectedStay": selected_stay,
            "selectedStayReason": selected_stay_reason,
            "backupStay": backup_stay,
            "stayOptions": stay_options,
            "selectedRoute": selected_route,
            "selectedRouteReason": selected_route_reason,
            "routes": routes,
            "routeOptions": routes,
            "recommendations": recommendations,
            "safetyBriefing": safety_briefing,
            "safetySources": safety_sources,
            "validationChecks": validation_checks,
            "planningStages": planning_stages,
            "dataWarnings": data_warnings,
            "totalFare": {
                "stay": float(stay_price),
                "transit": float(transit_cost),
                "ticket": ticket_cost,
                "total": total_cost,
                "budget": float(budget_limit),
                "status": status_text
            },
            "summary": summary_text
        }

    def _synthesize_response(self, query: str, profile: Dict[str, Any], tools: List[Dict], details: List[Dict]) -> str:
        # Default greeting if no tools triggered
        if not tools:
            return f"""### Operations Briefing
Welcome **{profile.get('name')}**. I am **Globus 2026**, your autonomous World Cup logistics coordinator.

I am ready to assist you with operations details:
- **Staying Places Comparison**: Search hotels, hostels, airbnbs, shared rooms near `{profile.get('stadium', 'Emirates Stadium')}`.
- **Route Service**: Directions from `{profile.get('city', 'London')}` to match gates.
- **Review Service**: Pubs & food review listings.
- **Match Service**: Schedules for followed teams `{", ".join(profile.get('followed_teams', []))}`.

*How can I assist your logistics today? (e.g. ask "Compare airbnbs near Emirates Stadium under $80" or "Get directions")*"""

        # Build responses based on tools triggered
        sections = []
        sections.append(f"### Globus 2026 Logistics Dispatch")
        sections.append(f"**Objective**: Resolve user logistics query: *\"{query}\"*")

        current_sit = f"User **{profile.get('name')}** is located in **{profile.get('city')}** following **{', '.join(profile.get('followed_teams') or [])}**. Favorite stadium is **{profile.get('stadium')}**."
        sections.append(f"**Current Situation**: {current_sit}")

        # Extract data
        stays_data = next((d for d in details if "stays" in d), None)
        route_data = next((d for d in details if "routes" in d), None)
        review_data = next((d for d in details if "reviews" in d), None)
        match_data = next((d for d in details if "fixtures" in d), None)

        plan_bullets = []
        if stays_data:
            plan_bullets.append(f"#### 🏨 Staying Places Comparison (Near {stays_data.get('stadium')})")
            plan_bullets.append("Below is a side-by-side price and quality comparison of lodging stays relative to the target match stadium:")
            plan_bullets.append("")
            plan_bullets.append("| Accommodation Name | Type | Price/Night | Rating | Distance to Stadium | Amenities |")
            plan_bullets.append("| :--- | :---: | :---: | :---: | :---: | :--- |")

            for s in stays_data["stays"]:
                type_badge = s["type"].upper().replace("_", " ")
                amenities_str = ", ".join(s["amenities"])
                plan_bullets.append(
                    f"| **{s['name']}** | `{type_badge}` | **${s['price_usd']}** | {s['rating']}/5 | {s['distance_miles']} miles | {amenities_str} |"
                )
            plan_bullets.append("")

        if route_data:
            plan_bullets.append("#### 🚇 Route Service Navigation Options")
            for r in route_data["routes"]:
                plan_bullets.append(f"- **{r['mode']}**: takes **{r['duration_minutes']} mins** (Est Cost: ${r['cost_usd']:.2f}). Route: *{r['steps']}*")

        if review_data:
            plan_bullets.append("#### 🍔 Nearby Recommendations & Services")
            venue_name = review_data.get("venue") or "Target Location"
            plan_bullets.append(f"Recommendations around **{venue_name}**:")
            reviews_val = review_data.get("reviews")
            if isinstance(reviews_val, list):
                for rev in reviews_val:
                    plan_bullets.append(f"- **{rev.get('establishment', rev.get('name'))}** ({rev.get('type')}) - Rating: **{rev.get('rating')}/5**: *\"{rev.get('review', 'No review text available')}\"*")
            elif isinstance(reviews_val, dict):
                for cat_key, places in reviews_val.items():
                    cat_name = cat_key.replace("_", " ").title()
                    plan_bullets.append(f"##### 📍 {cat_name}")
                    if not places:
                        plan_bullets.append("*(No nearby establishments returned by Places API)*")
                    for p in places:
                        plan_bullets.append(f"- **{p.get('name')}** - Rating: **{p.get('rating')}/5** ({p.get('distance_miles')} miles away). Address: *{p.get('address')}*")

        if match_data:
            plan_bullets.append("#### ⚽ Match Service Fixtures")
            for f in match_data["fixtures"]:
                plan_bullets.append(f"- **vs {f['opponent']}** ({f['competition']}): Kickoff *{f['date']}* - Played **{f['location']}**")

        sections.append("**Recommended Plan**:\n" + "\n".join(plan_bullets))

        sections.append(f"""**Key Constraints**:
- Destination: {profile.get('stadium')}
- Transit limits: Transit cost efficiency & timing.

**Dependencies**:
- Transit schedules matching kickoff timings.
- Room vacancy at selected lodging.

**Risks and Mitigations**:
- *Risk*: Room bookings fill up fast. *Mitigation*: Secure reservation through the Stay Service immediately.
- *Risk*: Transit congestion near stadium. *Mitigation*: Use walking corridors for the final mile.

**MCP Client Node Calls**:
```json
{json.dumps(tools, indent=2)}
```

**Final Decision**: Logistics plan registered. Stays and directions synced to user matching dashboard widgets.""")

        return "\n\n".join(sections)

agent_service = AgentService()
