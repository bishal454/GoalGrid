# Globus 2026 - Agent Builder Implementation Plan

## Objective
Create a Goal-Oriented Agent Builder agent named `Globus 2026 - The Autonomous World Cup Logistics Agent` using Gemini 3 Pro as the reasoning engine. The agent should plan and execute World Cup logistics workflows with human approval checkpoints, grounded schedule/regulation context, and operational state stored in MongoDB.

## Scope for This Part
This plan covers:
- Creating the Goal-Oriented agent in Vertex AI Agent Builder.
- Selecting Gemini 3 Pro as the reasoning engine.
- Writing and installing the first system instruction for logistics reasoning.
- Preparing the agent for later MongoDB MCP, Fivetran, grounding, and Cloud Run tool integration.

## Phase 1 - Agent Builder Setup

Tasks:
- Open Vertex AI Agent Builder in Google Cloud.
- Create a new Goal-Oriented agent.
- Name it `Globus 2026`.
- Set the model/reasoning engine to Gemini 3 Pro.
- Use model ID `gemini-3-pro-preview` where direct model selection asks for an ID.
- Set the agent purpose to World Cup 2026 logistics planning and task execution.

Deliverables:
- Agent Builder project created.
- Agent visible in Agent Builder console.
- Gemini 3 Pro selected as the reasoning model.

Acceptance checks:
- Agent can receive a logistics task.
- Agent responds with structured operational planning output.
- Agent does not behave like a generic chatbot.

## Phase 2 - First System Instruction

Tasks:
- Paste the first system instruction from `docs/agent-builder/globus-2026-agent.md`.
- Keep the instruction focused on private reasoning, logistics constraints, risk ranking, HITL approval, and operational output.
- Do not ask the agent to reveal hidden chain-of-thought. Use private reasoning plus visible rationale.

Key instruction behavior:
- Identify the goal.
- Retrieve or request missing operational data.
- Check constraints such as venue, time, capacity, route, security, weather, staffing, and compliance.
- Propose a plan.
- Pause for user approval before executing risky tool actions.
- Provide contingency options.

Deliverables:
- System instruction installed in Agent Builder.
- First prompt test completed.

Acceptance checks:
- Agent outputs sections like Objective, Current Situation, Constraints, Recommended Plan, Timeline, Risks, Contingency Plan, and Final Decision.
- Agent marks missing critical data as unverified instead of guessing.
- Agent asks for approval before booking, updating inventory, notifying stakeholders, or changing operational state.

## Phase 3 - Grounding Data Preparation

Tasks:
- Collect official FIFA 2026 schedule, host venue, and regulation PDFs.
- Upload verified documents to a Google Cloud Storage bucket.
- Connect those documents to Agent Builder as a grounding or data source.
- Add metadata to each document: source name, date, document type, and trust level.

Deliverables:
- GCS bucket with official logistics/schedule context.
- Agent Builder grounding source connected.

Acceptance checks:
- Agent can answer schedule and venue questions from verified documents.
- Agent cites or references the relevant source context.
- Agent refuses to invent missing schedule data.

## Phase 4 - MongoDB MCP Operational State

Tasks:
- Create MongoDB Atlas collections for:
  - `fan_profiles`
  - `team_movements`
  - `venue_inventory`
  - `transport_options`
  - `incident_reports`
  - `agent_action_logs`
- Configure MongoDB MCP Server.
- Connect MongoDB MCP as an Agent Builder tool.
- Define read/write permissions carefully.

Deliverables:
- MongoDB Atlas database.
- MCP connection available to the agent.
- Test data for fans, venues, transport, and inventory.

Acceptance checks:
- Agent can retrieve a fan or venue state.
- Agent can propose updates.
- Agent asks for approval before writing operational changes.
- Agent action logs are persisted.

## Phase 5 - Human-in-the-Loop Approval

Tasks:
- Define approval-required actions:
  - Booking or changing transport.
  - Updating vendor inventory.
  - Sending stakeholder notifications.
  - Re-routing fans or teams.
  - Escalating security, medical, or crowd-control incidents.
- Add tool approval prompts to the agent workflow.
- Require explicit user confirmation before execution.

Deliverables:
- HITL approval behavior configured.
- Demo scenario with approval pause.

Acceptance checks:
- Agent pauses before taking action.
- Agent clearly explains action, risk, and expected result.
- Agent continues after approval without losing context.

## Phase 6 - Cloud Run Tool Bridge

Tasks:
- Use the existing FastAPI backend or create a dedicated Cloud Run service for non-native tools.
- Add endpoints for:
  - `GET /logistics/fan/{id}`
  - `GET /logistics/transport/options`
  - `POST /logistics/inventory/update`
  - `POST /logistics/incident/escalate`
  - `POST /logistics/action-log`
- Store API keys and MongoDB credentials in Secret Manager.

Deliverables:
- Cloud Run service deployed.
- Agent Builder tool calls connected to Cloud Run endpoints.

Acceptance checks:
- Agent can call backend tools.
- Secrets are not exposed in frontend code.
- Tool failures return useful recovery instructions.

## Phase 7 - Demo Scenario

Recommended demo:
Fan says: `I missed my train to the stadium and kickoff is in 90 minutes. Get me there within my budget.`

Expected agent loop:
- Retrieve fan profile from MongoDB.
- Check current location, ticket venue, budget, and kickoff time.
- Retrieve transport alternatives.
- Compare shuttle, rideshare, transit, and walking transfer options.
- Recommend the safest feasible plan.
- Ask for approval before booking or reserving.
- Execute selected tool after approval.
- Log the action.

Winning demo angle:
- Show Agent Builder chat on one side.
- Show MongoDB Compass or app dashboard updating on the other side.
- Trigger a failure such as `shuttle sold out`.
- Show the agent pivoting to the next option without needing a new user prompt.

## Phase 8 - Validation Matrix

Test cases:
- Missing fan profile: agent asks for missing ticket ID or location.
- Transport sold out: agent automatically proposes next-best option.
- Weather alert: agent adjusts route/timing and escalates risk.
- Inventory surge: agent proposes vendor stock update and asks for approval.
- Venue capacity conflict: agent refuses unsafe routing.
- Medical/security issue: agent classifies as Critical and escalates.

Pass criteria:
- Agent uses structured logistics output.
- Agent does not hallucinate operational facts.
- Agent performs HITL before state-changing actions.
- Agent uses tools for live state instead of relying only on text.
- Agent logs decisions and actions.

## Immediate Next Steps

1. Create the Agent Builder Goal-Oriented agent.
2. Select Gemini 3 Pro / `gemini-3-pro-preview`.
3. Paste the system instruction from `docs/agent-builder/globus-2026-agent.md`.
4. Run the first manual test prompt:

```text
Plan team, staff, and media movement for Match 3 at SoFi Stadium, including arrival windows, route risk, hotel departure timing, fan ingress overlap, and contingency options if traffic delays exceed 30 minutes.
```

5. Confirm that output is structured, safety-aware, and approval-oriented.
6. Add MongoDB MCP as the first tool integration.
