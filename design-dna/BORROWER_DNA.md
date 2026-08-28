# PiHub Borrower Design DNA

## Design system
- Visual source: Investor-derived PiHub institutional system.
- Typography: IBM Plex Sans for interface copy; tabular/mono treatment only for IDs and numeric columns where useful.
- Shell: 232px desktop rail, 68px utility header.
- Surfaces: light neutral workspace, white border-first cards, restrained elevation.
- Controls: 44px minimum actions; 46px fields; visible focus ring; one primary action per page.
- Rhythm: 4/8px base with 16/24/32px section tiers.
- Responsive targets: 375, 768, 1024, 1440, 1920/2048.

## Design style
- Mood: calm, credible, guided, institutional.
- Borrower hierarchy: next obligation > due date/status > transaction detail > internal mechanics.
- Copy: plain-language borrower consequences, not internal underwriting jargon.
- Data density: moderate. Servicing tables are compact enough to scan but never Investor-analytics dense.

## Motion
- Corporate motion personality.
- 150–220ms control feedback; 220ms route entrance.
- `cubic-bezier(.2,0,0,1)` for entrances/state changes.
- Transform/opacity only. No layout-driven animation.
- Reduced-motion removes route travel and nonessential transitions.

## Effects
No Three.js/WebGL, particle systems, parallax or decorative canvas inside financing, closing, compliance or servicing workflows. These surfaces optimize trust, readability and operational speed.
