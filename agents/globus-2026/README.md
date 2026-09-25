# Globus 2026 Agent Package

This folder contains the Agent Builder implementation package for:

`Globus 2026 - The Autonomous World Cup Logistics Agent`

Use this package when configuring the Goal-Oriented agent in Vertex AI Agent Builder.

## Files

- `agent.yaml` - Agent Builder configuration summary.
- `system-instruction.md` - Paste-ready system instruction.
- `tools/openapi.yaml` - OpenAPI tool bridge spec for the FastAPI logistics endpoints.
- `tools/tool-manifest.yaml` - Tool list, approval policy, and data ownership notes.
- `eval-prompts.md` - Test prompts for validating agent behavior.

## Agent Builder Setup

1. Create a Goal-Oriented agent in Vertex AI Agent Builder.
2. Name it `Globus 2026`.
3. Select Gemini 3 Pro as the reasoning engine.
4. Use model ID `gemini-3-pro-preview` where a model ID is required.
5. Paste `system-instruction.md` into the system instruction field.
6. Add the backend Cloud Run or local FastAPI URL as an OpenAPI tool using `tools/openapi.yaml`.
7. Keep approval enabled for every write/action endpoint.

## Local Tool Bridge

During local development, the backend tool bridge runs at:

`http://localhost:8080/api/v1/logistics`

Production should expose the same routes through Cloud Run and protect them with IAM or API authentication.
