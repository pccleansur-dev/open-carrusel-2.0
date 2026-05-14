# Open Carrusel

Local-first app to create, edit, export, publish, and schedule Instagram carousels with AI.

This community-ready copy is sanitized:
- no personal carousels
- no uploads
- no webhook URLs
- no API keys
- no local Claude settings

## What is included

- Next.js app
- Editor, preview, export, publish, schedule
- Templates system
- Brand configuration
- Docker support
- Claude/Codex integration hooks
- Clean local data store

## Quick start

1. Install Node.js 20+.
2. Clone or unzip this folder.
3. Open a terminal in the project root.
4. Run:

```bash
npm install
npm run setup
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Full setup guide

See [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

That guide covers:
- local setup
- Docker setup
- Claude Code / Codex setup
- brand setup
- Instagram publishing setup with Make
- scheduling behavior
- file locations
- troubleshooting

## Environment variables

Copy `.env.example` to `.env` if you want Docker publishing / Codex support:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Notes

- `scripts/setup.mjs` seeds clean local data files automatically.
- `public/uploads/` stores logos and reference images.
- `data/` stores carousels, templates, exports, and integrations.
- Scheduled publishing requires the app/server to be running.

## License

MIT
