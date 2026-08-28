# PiHub Product Design System

## Product principle

PiHub is one product with role-specific applications. Investor, Borrower, Advisory and Admin may differ in workflow content and permissions, but they must not invent separate visual languages for authentication, shell navigation, global controls, typography, spacing, color, motion or accessibility behavior.

The current PiHub Investor experience is the approved visual source of truth. Borrower consumes the same product contract through `@pihub/ui` layers in `packages/ui/src/`.

## Canonical runtime layers

1. `pihub-system.css` — product tokens and shared primitives.
2. `pihub-shell.css` — sidebar, active navigation state, topbar, environment state and responsive shell.
3. `pihub-auth.css` — shared PiHub access composition and authentication visual language.
4. `pihub-motion.css` — reduced-motion and interaction policy.

The legacy Borrower stylesheet loads first. Canonical PiHub layers load after it and own all shared product chrome. New shared product rules belong in these PiHub layers rather than another module-specific patch stylesheet.

## Locked product anchors

| Contract | Canonical value |
| --- | --- |
| Desktop sidebar | 232px |
| Product topbar | 72px |
| Operational target | 44px minimum |
| Workspace background | `#F5F7FB` |
| Sidebar | `#0B1220` |
| Active sidebar surface | `#111A2B` |
| Active sidebar marker | `#5B8CFF`, 3px × 22px |
| Active icon | `#7DA2FF` |
| Primary action | `#2457E6` |
| Font | IBM Plex Sans |
| Numeric/system font | IBM Plex Mono |
| Standard nav motion | 180ms |
| Standard easing | `cubic-bezier(.2, 0, 0, 1)` |
| Hover movement | maximum 3px horizontal on nav |
| Card radius | 16px |
| Control radius | 10px |

## Authentication contract

PiHub access uses the same split-screen composition across modules:

- light technical-grid form pane;
- PiHub brand and product-family access rail;
- module-specific secure-access eyebrow and copy;
- visible field labels and 48px inputs;
- dark midnight technical-grid visual pane;
- one product-level statement plus three compact proof points;
- no production credential disclosure;
- responsive single-pane fallback below tablet widths.

Advanced visual technology is permitted only in the unauthenticated brand scene. Operational financial pages remain CSS/React-first. Borrower currently uses the static CSS fallback, preserving the Investor visual language without adding continuous rendering work to finance workflows.

## Sidebar contract

Every role application uses the same interaction language:

- neutral state: muted label and icon;
- hover: quiet surface lift plus `translateX(3px)` where a precise pointing device is present;
- active: midnight-raised surface, white label, cobalt icon, 3px left marker;
- `aria-current="page"` communicates the same state to assistive technology;
- only one navigation item may be active for a route;
- motion is disabled or reduced when `prefers-reduced-motion: reduce` is set.

Module-specific navigation groups and destinations are allowed. The geometry and state language are not.

## Allowed module variance

Modules may own:

- page content and workflow ordering;
- role-specific navigation labels and destinations;
- business tables, forms, metrics and permission-driven actions;
- domain-specific empty states and status copy.

Modules may not own alternative definitions for:

- shell navy/accent colors;
- sidebar active state;
- topbar height and global-control geometry;
- authentication layout;
- spacing scale;
- shared radii and shadows;
- focus treatment;
- global motion curves and durations.

## Quality gates

Changes to shared PiHub chrome must pass:

- TypeScript validation and production build;
- design-system static contract tests;
- Chromium, Firefox, WebKit and mobile Playwright flows;
- WCAG A/AA serious and critical Axe scans;
- keyboard skip navigation;
- responsive geometry with no page-level horizontal overflow;
- reduced-motion behavior.

This contract is deliberately boring in the best possible way. A borrower should know they are still inside PiHub before reading a single heading.
