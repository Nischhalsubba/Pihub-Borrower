# PiHub Borrower

Standalone PiHub Borrower / origination workspace.

## Ownership

This repository owns Borrower-only product discovery, financing applications, corporate/project/financial information, document requests, closing status, and Borrower account flows.

It does **not** contain Investor, Advisory, Admin, or Access applications.

## Shared UI snapshot

`packages/ui`, `packages/platform`, `packages/domain`, and `packages/contracts` are the shared PiHub foundation snapshot required by the extracted Borrower application. They are included here temporarily so this repository builds and deploys independently without importing source from another application repository. They can be replaced by versioned `@pihub/*` packages when the dedicated PiHub Platform repository is created.

## Commands

- `npm ci --legacy-peer-deps`
- `npm run dev`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e`

## Deployment

Vercel should connect this repository directly with Root Directory `.`. `vercel.json` builds only this Borrower application.
