# Borrower design and implementation audit

Reviewed: 2026-08-28

## Applied design direction
PiHub Borrower is a regulated-finance workflow, not a trading terminal. Generic financial-dashboard guidance can recommend a dark, data-dense dashboard, but the existing PiHub Investor-derived design contract and Borrower task model take precedence: light neutral workspace, border-first surfaces, IBM Plex Sans, clear next-action hierarchy, moderate density, 232px rail and 68px header.

## UI/UX Pro Max
Applied:
- explicit loading/success/error/retry states;
- visible field labels and recovery paths;
- keyboard skip navigation and route focus management;
- 44px+ operational targets and 46px fields;
- deep-linkable routes;
- React route lazy loading;
- reduced motion and restrained transition timing.

## Design DNA
Preserved the Investor-derived measurable DNA instead of importing an unrelated generic finance theme. Borrower composition remains guided and action-first. Internal underwriting density is intentionally excluded.

## Motion Design + Genjutsu cast
Motion thesis: calm institutional continuity. State changes should confirm cause and consequence without delaying work. Routine controls use 140-160ms feedback; route entrances use 220ms decisive ease-out. Motion is transform/opacity only and disappears appropriately under `prefers-reduced-motion`.

## GSAP decision
GSAP was evaluated and intentionally not added. The current interaction model needs only short route/control transitions; adding a timeline library would increase the bundle and lifecycle surface without improving clarity. If future workflows require complex coordinated progress morphs or cross-layout transitions, GSAP can be reconsidered with scoped React lifecycle cleanup.

## Three.js decision
Three.js/WebGL was evaluated and intentionally excluded from authenticated financing, compliance, closing and servicing routes. Continuous 3D rendering would add GPU/battery cost and visual distraction without improving a Borrower's decision quality. Brand/authentication experiences can revisit 3D separately if justified.

## Release acceptance
- WCAG AA contrast and keyboard usability
- no page-level horizontal overflow at canonical widths
- one clear primary action per operational page
- no dead visible controls
- loading/empty/error/retry/success coverage
- Chrome/Firefox/WebKit/mobile execution before production declaration
- exact merged-revision Vercel verification

## v0.5 implementation pass
UI/UX Pro Max was rerun against the expanded Borrower capital-management scope. The strongest retrieved rules were to preserve route lazy loading, visible async loading feedback, disabled submit controls during network operations, controlled forms and measured rather than speculative React optimization. The implementation already uses React lazy routes; server-facing connection/Copilot controls now expose busy/error states and form actions remain controlled. The PiHub institutional design contract remains stronger product evidence than generic dark/trading-dashboard patterns.
