# contact-form

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_AwS9hToaBpBLBgTVLch8GR0VR5R4)

## Environment Variables

Create a `.env.local` file with:

```bash
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=your-admin-password
ADMIN_SESSION_SECRET=your-long-random-secret
CRM_AGENT_API_TOKEN=your-agent-api-token
```

- `DATABASE_URL`: Postgres connection string used by Drizzle.
- `ADMIN_PASSWORD`: Password for signing in at `/admin/login`.
- `ADMIN_SESSION_SECRET`: Secret used to sign the admin session cookie.
- `CRM_AGENT_API_TOKEN`: Optional Bearer token used by trusted CRM agents.

## Admin Dashboard

After setting the environment variables, start the app and open:

- Login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

The dashboard shows recent contact form submissions from visitors who reached out.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
