# Shan Viewports

Preview any site across mobile, tablet, and desktop viewports side-by-side.

Live at [viewports.shan8851.com](https://viewports.shan8851.com)

## What it does

Enter a public URL and instantly see it rendered in multiple device viewports. Drag to reposition, resize from any edge or corner, and add custom viewport sizes.

- **Live iframe embeds** when the target site allows framing
- **Snapshot fallback** via server-side screenshot when framing is blocked
- **Smart scaling** — mobile viewports render near 1:1, larger screens scale down proportionally so text stays legible
- **Multi-edge resize** — drag any edge or corner to resize a viewport
- **Preset devices** — iPhone SE, iPhone 15 Pro, Pixel 8, iPad Mini, iPad Pro, MacBook Air, Small Laptop
- **Custom viewports** — any dimensions from 200px to 2000px

## Tech

- Next.js (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- JetBrains Mono

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run tests with Vitest |
