<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## GigSpot

- This app uses Next.js 16.2.9 App Router, React 19, TypeScript, and Tailwind CSS 4. Pages and layouts live in `src/app`, route handlers in `src/app/api`, and shared UI in `src/components`. Tailwind theme and utilities live in `src/app/globals.css`.
- Await route `params` and `cookies()` on the server. Client pages can unwrap promised `params` with React's `use()`.
- NextAuth v4 is configured in `src/lib/auth.ts`. Band-scoped handlers resolve membership and roles through `src/lib/band-context.ts` and the `activeBandId` cookie. Preserve the existing session and authorization behavior when changing UI. The app still uses `src/middleware.ts`, which Next.js 16 deprecates in favor of `proxy.ts`.
- Prisma 5 uses MySQL and `prisma/schema.prisma`. Keep existing API contracts and the schema intact for UI-only work.
- The rehearsal route is `src/app/dashboard/rehearse/[setlistId]/page.tsx`. Its client components load song or gig setlist context from existing read endpoints. Keep camera access, ArUco detection, MediaPipe hand landmarks, and canvas projection in `rehearsal-camera.tsx` alongside the route.
- Use `npm run dev` for local development and `npm run lint` for ESLint. `npx tsc --noEmit --incremental false` checks TypeScript without writing build output.
