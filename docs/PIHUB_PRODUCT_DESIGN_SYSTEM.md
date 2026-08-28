# PiHub Product Design System

## Product principle

PiHub is one product with role-specific applications. Investor, Borrower, Advisory and Admin may differ in workflow content and permissions, but they must not invent separate visual languages for shell navigation, global controls, typography, spacing, color, motion or accessibility behavior.

The current PiHub Investor experience remains the approved visual source of truth. Borrower consumes the same product contract through the shared `@pihub/ui` layers in `packages/ui/src/` while keeping authentication explicitly scoped to the Borrower application.

## Canonical runtime layers

1. `pihub-system.css` — product tokens, semantic spacing and shared primitives.
2. `pihub-shell.css` — sidebar, active navigation state, topbar, environment state and responsive shell.
3. `pihub-auth.css` — Borrower-scoped PiHub access composition and authentication visual language.
4. `pihub-motion.css` — interaction and reduced-motion fallback policy.
5. `ProductRouteMotion.tsx` — GSAP route and surface choreography for authenticated pages.

The legacy Borrower stylesheet loads first. Canonical PiHub layers load after it and own shared product chrome. New shared product rules belong in these layers rather than another module-specific patch stylesheet.

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

## Spacing contract

PiHub uses a fixed 4/8/12/16/24/32/48/64 spacing scale. Shared layouts consume semantic aliases instead of introducing arbitrary page-specific values:

- page horizontal inset: `--pihub-layout-inline`;
- section rhythm: `--pihub-section-gap` = 24px;
- grid rhythm: `--pihub-grid-gap` = 16px;
- standard card padding: `--pihub-card-padding` = 24px;
- desktop workspace top/bottom padding: 32px / 64px.

Module pages may choose different grid structures, but repeated surface, section and form spacing must resolve to the shared scale.

## Authentication contract

Each role application owns a module-scoped login. The Borrower access page therefore shows Borrower only and does not display Investor, Advisory or Admin as tabs or pseudo-navigation.

Borrower authentication uses:

- light technical-grid form pane;
- `PiHub Borrower` brand context and secure-access label;
- visible field labels and 48px inputs;
- dark midnight technical-grid visual pane with Borrower-specific financing copy;
- Borrower proof points for application, requests and servicing;
- no production credential disclosure;
- responsive single-pane fallback below tablet widths.

Cross-role discovery or role switching belongs to the identity/launcher layer, not inside a role application's login form.

## Motion contract

GSAP 3.13 is the coordinated application-motion engine. Motion is intentionally bounded because PiHub is an operational finance product, not a decorative demo reel.

- authenticated route changes use short transform-only entrance choreography;
- standard cards can receive a very small scale-settle within the route sequence;
- Borrower login uses coordinated transform-only sequences across the form and brand panel;
- no route or authentication sequence fades primary text, avoiding transient contrast failures;
- no continuous decorative loops, canvas/WebGL renderers or application-owned `requestAnimationFrame` loops are permitted in finance workflows;
- every GSAP context is cleaned up after route/unmount changes;
- `gsap.matchMedia()` respects `prefers-reduced-motion` and removes transforms instead of animating when reduced motion is requested.

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
- spacing scale;
- shared radii and shadows;
- focus treatment;
- global motion curves and durations.

Authentication keeps the shared PiHub visual language but remains role-scoped rather than exposing other modules as login controls.

## Quality gates

Changes to shared PiHub chrome must pass:

- deterministic `npm ci` installation;
- TypeScript validation and production build;
- design-system static contract tests;
- Chromium, Firefox, WebKit and mobile Playwright flows;
- WCAG A/AA serious and critical Axe scans;
- keyboard skip navigation;
- responsive geometry with no page-level horizontal overflow;
- reduced-motion behavior;
- no cross-module selector leakage on the Borrower login.

A borrower should know they are inside PiHub immediately, while seeing only the controls that belong to the Borrower role.
