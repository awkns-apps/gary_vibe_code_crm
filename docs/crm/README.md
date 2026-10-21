# CRM agent integration

This CRM is the curated business workspace. `contact_messages` is a separate,
immutable inbox. Agents may read inbox records, but must not treat them as CRM
clients until a change proposal is reviewed.

## Standard workflow

API base path: `/api/crm/v1`. Authenticate trusted agents with
`Authorization: Bearer $CRM_AGENT_API_TOKEN`.

1. Create a run with `POST /api/crm/v1/agent-runs`.
2. Read client context from `GET /api/crm/context/clients/{id}`.
3. Perform one bounded task: contact cleanup, needs, market, or pricing analysis.
4. Create an analysis or a change proposal.
5. Record evidence, confidence, model, prompt version and source references.
6. Mark the run completed. Never overwrite an approved analysis.

See [agent-integration.md](./agent-integration.md), [analysis-schemas.md](./analysis-schemas.md)
and [openapi.yaml](./openapi.yaml).
