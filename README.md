# Eventra — Festival & Event Management

> One place to organise events, programmes, participants, schedules, and results.

Eventra is a web application project for coordinating festivals and multi-part events. The codebase combines a React interface with an Express server and a database layer, with a focus on keeping event operations organised for the people running them.

<p>
  <a href="https://eventra-ruddy.vercel.app/"><img src="https://img.shields.io/badge/Open-Live_App-0A7B83?style=for-the-badge&logo=vercel" alt="Open Eventra live app" /></a>
  <a href="https://github.com/farixhere/eventra-updated"><img src="https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github" alt="Eventra source on GitHub" /></a>
</p>

## What Eventra is for

Festival organisers often need to coordinate several connected workflows. Eventra brings those workflows into one application instead of scattering them across separate documents and tools.

## Main capabilities in the codebase

- **Event operations:** events, venues, teams, participants, and registrations.
- **Programme planning:** programme entries, criteria, schedules, and scheduling workflows.
- **Results workflows:** results, corrections, appeals, and publishing-related operations.
- **Festival communication:** announcements, public festival pages, downloads, and media assets.
- **Organiser workflows:** organisations, memberships, invitations, roles, and permissions.
- **Account endpoints:** signup, login, logout, profile, verification, and password-reset routes.
- **Backend foundation:** Express API, database access through Neon, and audit-related infrastructure.

The exact availability of each workflow depends on the current deployment and database configuration. API routes in the source do not, by themselves, prove that every production workflow has been fully tested.

## Live application

**[Open Eventra](https://eventra-ruddy.vercel.app/)**

This deployment is provided as a preview of the product. The live deployment and this repository may not always be on the same revision.

## Tech stack

- **Frontend:** React, TypeScript, Vite
- **Server:** Node.js, Express, TypeScript
- **Database:** Neon serverless PostgreSQL integration
- **UI:** Tailwind CSS and reusable interface components
- **Icons and motion:** Lucide React and Motion

## Run locally

### Requirements

- Node.js
- npm
- A Neon PostgreSQL database and connection string for database-backed workflows

### 1. Clone the repository

```bash
git clone https://github.com/farixhere/eventra-updated.git
cd eventra-updated
npm install
```

### 2. Configure environment variables

Set the database connection string in your local environment:

```bash
DATABASE_URL=your_neon_connection_string
PORT=3000
```

Do not commit real credentials. Use your hosting provider's environment-variable settings for production.

### 3. Start development

```bash
npm run dev
```

The development script starts the Express server through `tsx`. Use the port printed by the server, or set `PORT` to your preferred local port.

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the frontend and bundle the server |
| `npm start` | Start the built server |
| `npm run lint` | Run the TypeScript check |

## Project status

Eventra is an evolving project. Before using it for a real festival, configure the database, apply the required schema migrations, and test sign-in, permissions, registration, scheduling, and result-publishing flows in the target environment.

## Security notes

- Keep database connection strings and API credentials private.
- Configure production environment variables in the hosting platform.
- Verify authentication, organisation-level access controls, and database migrations before handling real participant data.

---

Built by [Faris](https://github.com/farixhere).