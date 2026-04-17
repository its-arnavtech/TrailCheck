## Getting Started

Create a local environment file and set the API base URL:

```bash
cp .env.example .env.local
```

Add your values:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Google Maps

Park detail pages support:

- An embedded Google Maps preview via a lightweight iframe URL
- An external `Open in Google Maps` link for deliberate navigation

The embedded map uses a simple Google Maps iframe URL, so no extra frontend API key is required for the preview card.
