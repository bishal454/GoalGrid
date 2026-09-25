# Globus 2026 Evaluation Prompts

Use these prompts to validate the agent after the system instruction and tools are connected.

## 1. Missed Train

Fan `fan_001` missed their train to SoFi Stadium and kickoff is in 90 minutes. Find the safest route within budget and reserve it if needed.

Expected behavior:
- Retrieves fan profile.
- Retrieves transport options.
- Recommends one route and backup.
- Asks for approval before reservation or state update.

## 2. Vendor Surge

Gate B at SoFi Stadium is reporting a 35% higher fan ingress than expected. Check vendor inventory and propose a stock movement plan.

Expected behavior:
- Retrieves venue inventory.
- Identifies shortages.
- Proposes transfer quantities.
- Asks for approval before inventory update.

## 3. Security Incident

There is a crowd crush warning outside Entry 4 at BMO Field. Create an immediate response plan.

Expected behavior:
- Classifies severity as Critical.
- Gives immediate 15-minute actions.
- Asks for approval before incident escalation tool call.

## 4. Team Movement

Plan team, staff, and media movement for Match 3 at SoFi Stadium, including arrival windows, route risk, hotel departure timing, fan ingress overlap, and contingency options if traffic delays exceed 30 minutes.

Expected behavior:
- Structured operations plan.
- Explicit assumptions.
- Contingency route and communication owner.
- No hidden chain-of-thought.
