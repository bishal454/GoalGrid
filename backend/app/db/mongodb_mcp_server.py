import json
import sys
import os

class MongoMCPServer:
    def __init__(self) -> None:
        # Resolve path to mock logistics seed data
        seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "logistics_seed.json")
        try:
            with open(seed_path, "r", encoding="utf-8") as file:
                self.db = json.load(file)
        except Exception:
            # Fallback mock DB setup
            self.db = {
                "fans": [
                    {
                        "fan_id": "fan_001",
                        "name": "Alice Smith",
                        "current_location": "Downtown",
                        "ticket_id": "ticket_101",
                        "venue_id": "venue_01",
                        "budget_usd": 50,
                        "accessibility_needs": [],
                        "preferred_modes": ["train", "walk"]
                    },
                    {
                        "fan_id": "fan_002",
                        "name": "Bob Jones",
                        "current_location": "Suburbs",
                        "ticket_id": "ticket_102",
                        "venue_id": "venue_01",
                        "budget_usd": 20,
                        "accessibility_needs": ["wheelchair access"],
                        "preferred_modes": ["bus"]
                    }
                ]
            }

    def list_tools(self) -> list:
        return [
            {
                "name": "get_fan_profile",
                "description": "Retrieve fan profile details (budget constraints, current location, preferences) from MongoDB.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "fan_id": {"type": "string", "description": "The target fan profile identifier"}
                    },
                    "required": ["fan_id"]
                }
            },
            {
                "name": "get_weather_update",
                "description": "Query weather status and weather advisories synced via Fivetran from OpenWeatherMap.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "City or area to query weather conditions for"}
                    },
                    "required": ["city"]
                }
            },
            {
                "name": "get_transit_status",
                "description": "Retrieve active transit delays, route availability, and schedules.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "route": {"type": "string", "description": "The specific transit route (e.g. Red Line, Bus 42)"}
                    },
                    "required": ["route"]
                }
            }
        ]

    def handle_call(self, tool_name: str, arguments: dict) -> dict:
        if tool_name == "get_fan_profile":
            fan_id = arguments.get("fan_id")
            fan = next((f for f in self.db.get("fans", []) if f.get("fan_id") == fan_id), None)
            if fan:
                return {"status": "success", "fan": fan}
            return {"status": "error", "message": f"Fan {fan_id} not found."}
        
        elif tool_name == "get_weather_update":
            city = arguments.get("city", "").lower()
            weather_data = {
                "london": {"temperature": "14C", "condition": "Light Rain", "status": "Caution"},
                "madrid": {"temperature": "22C", "condition": "Sunny", "status": "Clear"},
                "milan": {"temperature": "18C", "condition": "Partly Cloudy", "status": "Clear"},
                "new york": {"temperature": "28C", "condition": "Thundershowers", "status": "Severe Warning"}
            }
            res = weather_data.get(city, {"temperature": "15C", "condition": "Overcast", "status": "Normal"})
            return {"status": "success", "city": city, "weather": res}
            
        elif tool_name == "get_transit_status":
            route = arguments.get("route", "").upper()
            transit_data = {
                "RED LINE": {"status": "Delayed by 15 mins", "reason": "Signal failure"},
                "BUS 42": {"status": "Suspended", "reason": "Road block"},
                "TRAIN 7": {"status": "Normal Service", "reason": "None"}
            }
            res = transit_data.get(route, {"status": "Normal Service", "reason": "None"})
            return {"status": "success", "route": route, "transit": res}

        return {"status": "error", "message": f"Unknown tool: {tool_name}"}

    def start(self) -> None:
        # Standard input/output loop matching MCP stdio specifications
        for line in sys.stdin:
            try:
                request = json.loads(line.strip())
                method = request.get("method")
                req_id = request.get("id")

                if method == "initialize":
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "capabilities": {
                                "tools": {}
                            },
                            "serverInfo": {
                                "name": "mongodb-mcp-server",
                                "version": "1.0.0"
                            }
                        }
                    }
                elif method == "tools/list":
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "tools": self.list_tools()
                        }
                    }
                elif method == "tools/call":
                    params = request.get("params", {})
                    name = params.get("name")
                    arguments = params.get("arguments", {})
                    result = self.handle_call(name, arguments)
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": json.dumps(result)
                                }
                            ]
                        }
                    }
                else:
                    response = {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32601,
                            "message": f"Method not found: {method}"
                        }
                    }
                
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
            except Exception as exc:
                sys.stderr.write(f"Error handling request: {exc}\n")
                sys.stderr.flush()

if __name__ == "__main__":
    server = MongoMCPServer()
    server.start()
