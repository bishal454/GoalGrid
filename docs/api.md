# Offside AI - API Documentation

This document outlines the API endpoints exposed by the Python FastAPI backend.

## Base URL
- **Development:** `http://localhost:8080`
- **Production:** `https://<backend-cloud-run-url>`

## Authentication
Requests should include authorization headers where appropriate (e.g. JWT Bearer token or api keys retrieved via GCP Secret Manager).

## Endpoints

### 1. General & Health
- **`GET /`**: Home status endpoint.
- **`GET /health`**: Microservice health check status.

### 2. Agents & AI Chat
- **`POST /api/v1/agents/chat`**: Send messages to Gemini-powered agents.
- **`GET /api/v1/agents/list`**: Get list of active agents configured in Vertex AI Agent Builder.

### 3. Sports Data (MongoDB Atlas)
- **`GET /api/v1/sports/live`**: Retrieve live sports events feed.
- **`GET /api/v1/sports/teams/{team_id}`**: Get historical stats for a specific team.

### 4. Live Match Internet RAG
- **`GET /api/v1/live-matches/feed?league=eng.1`**: Retrieves soccer match cards from an internet scoreboard, normalizes them, ranks live and recently completed matches first, and returns source metadata for the dashboard.

Supported league values include `eng.1`, `esp.1`, `ita.1`, `ger.1`, `fra.1`, `usa.1`, `uefa.champions`, and `uefa.europa`.

### 5. Globus 2026 Logistics Tool Bridge
- **`GET /api/v1/logistics/fans/{fan_id}`**: Retrieve fan profile, budget, location, ticket, and accessibility state.
- **`GET /api/v1/logistics/transport/options?fan_id=fan_001&venue_id=sofi_stadium`**: Retrieve ranked transport options for a fan and venue.
- **`POST /api/v1/logistics/inventory/update`**: Propose or execute an inventory update. Requires `approved: true` to mutate state.
- **`POST /api/v1/logistics/incidents/escalate`**: Propose or execute incident escalation. Requires `approved: true` to mutate state.
- **`POST /api/v1/logistics/action-log`**: Persist an agent decision or completed action.
- **`GET /api/v1/logistics/state`**: Inspect local prototype logistics state.

The Agent Builder OpenAPI tool spec is available at `agents/globus-2026/tools/openapi.yaml`.
