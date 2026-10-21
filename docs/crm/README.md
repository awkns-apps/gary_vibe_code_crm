# CRM and Hermes integration

Use [Hermes setup](hermes.md) to choose the integration mode and configure a worker.
The app stores inquiries, clients, deals, analyses, runs and proposals. It does not
invoke an AI model or install a schedule.

- [Human user guide](../user-guide.md)
- [Hermes setup and acceptance checklist](hermes.md)
- [Authentication, write policy and implementation limits](agent-integration.md)
- [Local script workflow and JSON payloads](../../scripts/crm-analyst/README.md)
- [Analysis payload conventions](analysis-schemas.md)
- [HTTP OpenAPI reference](openapi.yaml)
- [Current verification coverage](verification.md)

HTTP base: `/api/crm/v1` (rewritten to `/api/crm`). Authenticate with an admin
cookie or `Authorization: Bearer <CRM_AGENT_API_TOKEN>`. The token is optional for
the app but required for HTTP workers without a browser session.

Local Hermes scripts instead connect directly to `DATABASE_URL`. They create
unqualified leads and analyses awaiting review, without using change proposals.
The two modes have different access boundaries; follow the guide for your mode.
