# @cloudagi/web

Next.js 15 web application for CloudAGI — landing page, seller registration wizard, and buyer terminal.

## Stack

- Next.js 15 App Router + React 19 (Server Components by default)
- Tailwind CSS 4 with `@theme` design tokens
- shadcn/ui component primitives
- `motion` (Framer Motion) for animations
- Geist font family (mono + sans)

## Run locally

```bash
# From monorepo root
bun install
bun dev:web

# Or from this directory
bun dev
```

## Structure

```
src/
  app/           Route segments (layout, page, globals.css)
  components/    Shared UI components
  lib/           Utilities (cn, etc.)
public/          Static assets
```

## Notes

- Dark mode is the default color scheme.
- Design tokens live in `src/app/globals.css` under `@theme`.
- The `@cloudagi/shared` package provides cross-app types and schemas.
