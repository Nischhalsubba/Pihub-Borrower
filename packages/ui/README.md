# @pihub/ui

Canonical PiHub product chrome for independently deployed role applications.

Investor is the current visual reference implementation. Borrower now consumes the same neutral PiHub contract through:

- `pihub-system.css` — tokens and shared primitives
- `pihub-shell.css` — sidebar, active state, topbar and responsive shell
- `pihub-auth.css` — shared PiHub access composition
- `pihub-motion.css` — motion and reduced-motion policy

Investor, Borrower, Advisory and Admin may own different workflows and permissions. They must not redefine shared authentication geometry, shell colors, navigation states, global control sizing, typography, spacing, focus behavior or motion curves.

See `docs/PIHUB_PRODUCT_DESIGN_SYSTEM.md` for the product-level contract and quality gates.
