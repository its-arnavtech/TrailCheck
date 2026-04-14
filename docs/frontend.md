# TrailCheck Frontend

This document covers the frontend in `frontend/trailcheck-web/`: routes, component structure, API integration, auth/session behavior, and the custom map and visual systems.

## Overview

The frontend is a Next.js 16 App Router app built with React 19, TypeScript, and Tailwind CSS 4.

Its job is to:

- render the park discovery experience
- display park and trail details
- surface live park conditions from the backend
- let users sign in and sign up
- let signed-in users submit reports
- let signed-in users save parks to favorites and want-to-go lists

The frontend is split between:

- server-rendered pages that fetch data
- client components for auth, preferences, reporting, search, and map interaction

## Stack

From [`frontend/trailcheck-web/package.json`](../frontend/trailcheck-web/package.json), the main stack is:

- Next.js `16.1.7`
- React `19.2.3`
- TypeScript
- Tailwind CSS 4
- `react-hot-toast`
- `three`
- `globe.gl`
- `maplibre-gl`
- `topojson-client`
- `us-atlas`

The map experience also uses `three-slippy-map-globe` in the actual implementation.

## Route structure

The app is organized under `frontend/trailcheck-web/app/`.

### `/`

Implemented in [`app/page.tsx`](../frontend/trailcheck-web/app/page.tsx).

This is the landing page. It:

- fetches parks from the backend
- builds hero and card visuals
- renders:
  - `HomeHeader`
  - `ParkMap`
  - `ParksExplorer`

The page is marked `dynamic = 'force-dynamic'`, so it always behaves like a live data page.

### `/parks/[slug]`

Implemented in [`app/parks/[slug]/page.tsx`](</c:/TrailCheck/frontend/trailcheck-web/app/parks/[slug]/page.tsx>).

This page loads:

- park catalog data via `getPark(slug)`
- park digest data via `getParkDigest(slug)`
- a visual via `getParkVisual()`

It then renders:

- park hero content
- saved-park controls
- live digest notification and summary
- active hazards
- forecast cards
- in-park trail search
- auth panel
- report panel

### `/trails/[id]`

Implemented in [`app/trails/[id]/page.tsx`](</c:/TrailCheck/frontend/trailcheck-web/app/trails/[id]/page.tsx>).

This page loads one trail via `getTrail(id)` and renders:

- trail overview
- park alerts
- reported hazards
- recent reports
- weather forecast
- auth panel
- report form

## Layout and globals

[`app/layout.tsx`](../frontend/trailcheck-web/app/layout.tsx):

- defines metadata
- imports global CSS
- imports MapLibre CSS
- mounts the toaster component

[`app/globals.css`](../frontend/trailcheck-web/app/globals.css) defines the visual system:

- CSS custom properties for background, surface, border, accent, and shadow tokens
- light and dark theme variable sets
- smooth-scroll behavior
- background gradients and subtle pattern overlays

The current theme uses:

- `"Segoe UI"` as the primary sans font
- `"Cascadia Code"` as the mono font

## Data access layer

All backend communication is centralized in [`lib/api.ts`](../frontend/trailcheck-web/lib/api.ts).

### Why this file matters

It provides:

- shared TypeScript types for backend responses
- one API base URL definition
- auth header injection
- common error parsing
- route-specific fetch helpers

### API base URL

The frontend uses:

```ts
process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'
```

So the frontend expects `.env.local` to define the backend origin when needed.

### Main functions

Catalog and content:

- `getParks()`
- `getPark()`
- `getTrails()`
- `getTrail()`
- `getParkDigest()`

Auth:

- `signup()`
- `signin()`
- `getCurrentUser()`

Reporting:

- `createReport()`

Saved parks:

- `getMyParkPreferences()`
- `getParkPreference()`
- `updateParkPreference()`

### Error handling

`parseError()` tries to surface backend messages and also clears stored auth state on `401`, which keeps session expiry behavior consistent across the app.

## Auth and session state

Session persistence is implemented in [`lib/auth.ts`](../frontend/trailcheck-web/lib/auth.ts).

### Local storage keys

- `trailcheck.auth.token`
- `trailcheck.auth.user`

### Browser events

Instead of a state library, the app uses custom events:

- `trailcheck-auth-changed`
- `trailcheck-park-preferences-changed`

This is a lightweight pattern that works well for the current project size.

### What this enables

- auth changes can update multiple components without prop drilling
- park preference changes refresh favorite and saved-park views across the app

## Auth UI

The main auth surface is [`components/auth-panel.tsx`](../frontend/trailcheck-web/components/auth-panel.tsx).

It supports:

- sign in
- sign up
- account display when already signed in
- sign out
- embedded saved-park lists

### Validation behavior

The component mirrors backend validation rules for:

- supported email providers
- password length
- age bounds
- password confirmation

This gives the user fast feedback before a request is sent.

### Compact mode

`AuthPanel` supports a `compact` variant for embedding inside park and trail report sections.

## Saved parks and favorites

TrailCheck supports two per-user park lists:

- favorites
- want-to-go

### Relevant components

- [`ParkFavoriteButton`](../frontend/trailcheck-web/components/park-favorite-button.tsx)
- [`ParkPreferenceActions`](../frontend/trailcheck-web/components/park-preference-actions.tsx)
- [`FavoritesPanel`](../frontend/trailcheck-web/components/favorites-panel.tsx)
- [`SavedParksPanel`](../frontend/trailcheck-web/components/saved-parks-panel.tsx)

### Responsibilities

`ParkFavoriteButton`
- fetches current preference state
- toggles favorites
- shows toast feedback

`ParkPreferenceActions`
- park-page control for both favorites and want-to-go

`FavoritesPanel`
- shows only favorite parks
- displayed from the home-page header modal

`SavedParksPanel`
- shows both saved lists
- rendered inside the signed-in account panel

## Report submission flow

Report submission is handled by:

- [`components/reportform.tsx`](../frontend/trailcheck-web/components/reportform.tsx)
- [`components/park-report-panel.tsx`](../frontend/trailcheck-web/components/park-report-panel.tsx)

### `ReportForm`

This client component:

- checks for a token before submit
- posts reports through `createReport()`
- lets the user enter note, surface condition, and rating
- refreshes the route after success
- uses toasts for feedback

### `ParkReportPanel`

This wraps `ReportForm` on the park page and adds trail selection so a report can be submitted from the park view as well as from an individual trail page.

## Search explorers

The frontend uses small focused search UIs.

### `ParksExplorer`

[`components/parks-explorer.tsx`](../frontend/trailcheck-web/components/parks-explorer.tsx)

- client component
- searches park name and state
- uses `useDeferredValue`
- renders the park card grid

### `ParkTrailsExplorer`

[`components/park-trails-explorer.tsx`](../frontend/trailcheck-web/components/park-trails-explorer.tsx)

- client component
- searches trails inside one park
- also uses `useDeferredValue`
- links to trail detail pages

## Header and modal behavior

[`components/home-header.tsx`](../frontend/trailcheck-web/components/home-header.tsx) controls the main landing-page header.

It:

- checks local auth state on mount
- listens for auth changes
- opens an auth modal
- opens a favorites modal for signed-in users

The nav remains intentionally simple:

- discover anchor
- external NPS link
- favorites
- account/login action

## Park visuals and content

Park imagery and short descriptive copy are handled in [`lib/park-content.ts`](../frontend/trailcheck-web/lib/park-content.ts).

### Inputs used

The app mixes:

- local images from `public/Park_images/`
- known static Wikimedia URLs
- a cached Wikipedia REST thumbnail fetch for hero fallbacks

### Main functions

`getParkVisual(slug, parkName)`
- used for larger hero-style images
- tries Wikipedia first
- falls back to known static imagery and copy

`getParkVisualMap(parks)`
- used for park tiles on the landing page
- prefers local image assets

This gives the UI a stronger identity than generic placeholders.

## Map and 3D visualization

The landing page map experience is one of the most distinctive frontend features.

### Entry point

[`components/park-map.tsx`](../frontend/trailcheck-web/components/park-map.tsx) currently renders `USMap3D`.

### `USMap3D`

[`components/maps/USMap3D.tsx`](../frontend/trailcheck-web/components/maps/USMap3D.tsx) lays out:

- one large mainland globe panel
- inset globe panels for Alaska, Hawaii, American Samoa, and the Virgin Islands

### `USGlobePanel`

[`components/maps/USGlobePanel.tsx`](../frontend/trailcheck-web/components/maps/USGlobePanel.tsx) is the main 3D renderer. It:

- uses Three.js
- uses `three-slippy-map-globe`
- renders tiled globe imagery
- projects park markers into screen space
- shows hover tooltips
- draws overlay geometry
- disposes WebGL resources carefully on cleanup

### Alternate map path

[`components/maps/ThreeMapPanel.tsx`](../frontend/trailcheck-web/components/maps/ThreeMapPanel.tsx) renders a flat region map with Three.js and marker sprites. It appears to be an alternate visualization path that still exists in the repo.

### Supporting map data

Supporting data and helpers live in:

- `lib/park-map-data.ts`
- `lib/park-globe-data.ts`
- `components/maps/usGlobeOverlays.ts`
- `components/maps/usBoundariesData.ts`

## Server and client component split

The current division is clear and practical.

### Server-rendered areas

Page entry points fetch data on the server:

- home page
- park page
- trail page

### Client-rendered areas

Interactive pieces are client components:

- auth
- favorites
- saved parks
- park preference toggles
- report forms
- search explorers
- map rendering

This keeps client state localized to interaction-heavy features.

## Runtime data flow

Home page:

1. server component calls `getParks()`
2. backend returns parks and trails
3. frontend renders the landing hero, globe, and park grid

Park page:

1. server component loads park catalog data
2. server component loads park digest data
3. client components handle saved-park state and reporting

Trail page:

1. server component loads one trail
2. backend includes reports, local hazards, live alerts, and weather
3. client report form enables authenticated writes

Auth changes:

1. user signs in or out
2. local storage is updated
3. auth-changed event is dispatched
4. listening components resync themselves

Preference changes:

1. user toggles favorite or want-to-go
2. frontend calls the backend
3. preference-changed event is dispatched
4. saved-park UI refreshes across the app

## Environment variables

The frontend currently needs:

```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
```

If it is not set, the app falls back to `http://localhost:3001`.

## Common commands

From `package.json`:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Typical local startup:

```bash
cd frontend/trailcheck-web
npm install
npm run dev
```

## Important files

- [`frontend/trailcheck-web/app/page.tsx`](../frontend/trailcheck-web/app/page.tsx)
- [`frontend/trailcheck-web/app/layout.tsx`](../frontend/trailcheck-web/app/layout.tsx)
- [`frontend/trailcheck-web/app/globals.css`](../frontend/trailcheck-web/app/globals.css)
- [`frontend/trailcheck-web/app/parks/[slug]/page.tsx`](</c:/TrailCheck/frontend/trailcheck-web/app/parks/[slug]/page.tsx>)
- [`frontend/trailcheck-web/app/trails/[id]/page.tsx`](</c:/TrailCheck/frontend/trailcheck-web/app/trails/[id]/page.tsx>)
- [`frontend/trailcheck-web/lib/api.ts`](../frontend/trailcheck-web/lib/api.ts)
- [`frontend/trailcheck-web/lib/auth.ts`](../frontend/trailcheck-web/lib/auth.ts)
- [`frontend/trailcheck-web/lib/park-content.ts`](../frontend/trailcheck-web/lib/park-content.ts)
- [`frontend/trailcheck-web/components/auth-panel.tsx`](../frontend/trailcheck-web/components/auth-panel.tsx)
- [`frontend/trailcheck-web/components/parks-explorer.tsx`](../frontend/trailcheck-web/components/parks-explorer.tsx)
- [`frontend/trailcheck-web/components/park-preference-actions.tsx`](../frontend/trailcheck-web/components/park-preference-actions.tsx)
- [`frontend/trailcheck-web/components/reportform.tsx`](../frontend/trailcheck-web/components/reportform.tsx)
- [`frontend/trailcheck-web/components/maps/USMap3D.tsx`](../frontend/trailcheck-web/components/maps/USMap3D.tsx)
- [`frontend/trailcheck-web/components/maps/USGlobePanel.tsx`](../frontend/trailcheck-web/components/maps/USGlobePanel.tsx)

## Bottom line

The frontend is a polished Next.js application that mixes server-rendered park data, browser-based session state, and a custom visual layer built around rich park imagery and interactive 3D map exploration.
