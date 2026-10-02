## Getting Started

`npm run dev` calls the local API at `http://localhost:3001` when `NEXT_PUBLIC_API_BASE_URL` is unset. Copy `.env.example` to `.env.local` only if the API is on another origin. Do not put `DEEPSEEK_API_KEY` or other backend secrets in this app.

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
