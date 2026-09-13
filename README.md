# Fortuneteller

Personal finance tracking API.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Zod for request validation
- JWT access + refresh token authentication

## Getting started

```bash
cp .env.example .env   # then fill in secrets
docker compose up -d   # starts local Postgres
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled server
- `npm run lint` — lint the codebase
- `npm run format` — format the codebase with Prettier
