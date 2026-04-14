# TrailCheck Docs

This folder contains documentation for the main TrailCheck systems.

## Available docs

- [Backend](./backend.md)
  Covers the NestJS API, Prisma schema, auth flow, endpoints, external services, and runtime architecture.

- [Frontend](./frontend.md)
  Covers the Next.js app structure, routes, API client layer, session handling, saved parks, reporting, and the map system.

- [Model](./trailcheck-model.md)
  Covers the local model pipeline, dataset generation, QLoRA training, inference, validation, evaluation, and backend integration.

## Suggested reading order

1. Read [Backend](./backend.md) first for the API and data model.
2. Read [Frontend](./frontend.md) next for how the web app consumes that backend.
3. Read [Model](./trailcheck-model.md) for the AI and local-model pipeline.
