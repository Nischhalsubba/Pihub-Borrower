# PiHub Borrower UI Contract

## Purpose

Borrower is not a parallel visual theme. Investor remains the canonical PiHub UI source of truth wherever the two applications express the same interaction or information pattern. Borrower may introduce a new pattern only when the underlying borrower workflow has no Investor equivalent.

This contract converts that principle into an implementation rule that can be reviewed and tested.

## 1. Exact Investor-parity components

The following must be rendered by shared `@pihub/ui` primitives or shared Investor-derived CSS. Borrower must not redefine their typography, color, spacing, radius, height, focus state, hover state, disabled state, motion, or responsive behavior.

| UI area | Canonical implementation | Borrower rule |
| --- | --- | --- |
| Global header | `PlatformShell` + `investor-base.css` | Exact Investor geometry |
| Desktop sidebar | `PlatformShell` | Exact Investor rail, active state and icon language |
| Mobile navigation | `PlatformShell` | Shared responsive behavior |
| Search / command trigger | `platform-utilities.css` | Exact size, focus, shortcut and command panel |
| Language selector | `platform-utilities.css` | Exact size and selected state |
| Notification trigger / popover | `platform-utilities.css` | Exact geometry and interaction |
| Account trigger / dropdown | `WorkspaceAccount` | Exact Investor geometry and menu behavior |
| Page heading | `PageHead` | Exact hierarchy and spacing |
| Card surface | `Card` | Exact border, radius, padding and elevation |
| Card header action | `Card action` + `primitives.css` | Shared header/action alignment |
| Buttons | `.ph-button` | Exact Investor height, radius, typography and state behavior |
| Inputs / selects / textareas | `Field` + `.ph-field` | Exact control geometry and focus ring |
| Status chips | `Status` | Exact semantic tokens and shape |
| Tables | `.ph-table` / `.ph-table-wrap` | Exact headers, rows, borders and overflow behavior |
| Callouts | `.ph-callout` | Shared informational surface; semantic variants may change tone only |
| Route motion | `PlatformRouteMotion` | Shared restrained GSAP motion and reduced-motion behavior |

### Non-negotiable parity rule

If a Borrower component can be expressed with an existing shared Investor primitive, it must use that primitive. A Borrower stylesheet may arrange shared components, but it may not repaint them.

## 2. Borrower-specific system

Borrower has workflows that Investor does not own. These are allowed to have Borrower-specific composition while inheriting all visual tokens and shared controls.

### Borrower Organization Profile

Purpose: represent the borrowing legal entity, its primary user, borrower permissions and current financing context.

Rules:
- the outer hero is a canonical `.ph-card` surface;
- organization identity may use a Borrower-specific mark and summary grid;
- badges use shared `Status` components;
- actions use shared `.ph-button` variants;
- detail modules use shared `Card` surfaces;
- layout may use a Borrower-specific main/rail composition;
- no Borrower-specific global color, radius, shadow, typography or control-height tokens are allowed.

### Borrower Application Journey

Purpose: guide a borrower from product discovery to a complete application and downstream PiHub review.

Rules:
- workflow-owned layouts may use step rails, next-action strips and application context panels;
- form controls remain shared Investor controls;
- one primary action per view;
- save and submit are visually and behaviorally distinct;
- submission state must remain explicit and never be implied by a local save;
- the journey must remain operable by keyboard and under reduced motion.

### Product Discovery

Purpose: match borrower financing needs against available financing products.

Rules:
- filter controls use shared `Field` controls;
- results use the shared Investor table system;
- reset/filter actions use shared buttons;
- availability uses shared semantic statuses;
- product-specific data composition may differ from Investor opportunity columns because the user goal is different.

### Borrower Requests and Document Room

Purpose: make downstream requests explicit, owned and recoverable.

Rules:
- tables, buttons and statuses remain shared;
- Borrower-specific columns and action labels are allowed;
- priority cannot be communicated by color alone;
- destructive or reversible document actions must not masquerade as primary progression actions.

## 3. Design DNA

Borrower inherits the current Investor DNA:
- IBM Plex Sans / IBM Plex Mono;
- cobalt action accent with midnight structural navigation;
- 4px base spacing system;
- border-first white surfaces;
- restrained shadows;
- compact-comfortable enterprise density;
- functional 120–360ms motion with no bounce;
- no decorative Three.js, particles, shaders, parallax or scroll spectacle in operational Borrower routes.

Three.js remains appropriate only for a separately defined authentication/brand surface. It is intentionally excluded from dense financing workflows because it adds rendering cost without improving decision clarity.

## 4. Accessibility and responsive contract

Borrower must preserve:
- visible labels for every form control;
- programmatic label/control association;
- visible focus states;
- normal-text contrast of at least WCAG AA;
- minimum 44px primary touch targets;
- semantic buttons and links rather than clickable generic containers;
- horizontal containment for wide tables;
- no document-level horizontal overflow;
- responsive validation at 375, 768, 1024 and 1440px classes;
- `prefers-reduced-motion` behavior for every non-essential animation.

## 5. Regression rule

A parity change is incomplete unless automated tests prove the relevant shared geometry or behavior. Borrower E2E tests should fail when a shared control, card, account menu, table or shell silently drifts away from the Investor contract.

The goal is not to make Borrower look approximately like Investor. The goal is to make shared PiHub interactions literally shared, leaving Borrower-specific code responsible only for borrower-specific workflow composition.
