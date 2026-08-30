# Production Deployment Policy

## Goal
Preserve free-tier hosting usage by making production deployments deliberate, batched, and predictable.

## Rules
- `main` is the only branch eligible for production deployment.
- Feature branches, development branches, and pull requests must never deploy to Vercel.
- A normal commit or merge to `main` is intentionally ignored by Vercel.
- Production deploys only when the latest `main` commit message contains `[deploy]`.
- Validate and batch changes before releasing.
- Never trigger a second manual/API deployment after a Git-triggered release.
- Use rollback/promotion of an existing deployment when possible instead of rebuilding.

## Release
After validating the accumulated `main` state, create one deliberate release commit, for example:

```bash
git commit --allow-empty -m "release: production [deploy]"
git push origin main
```

This single commit releases all accumulated, previously skipped changes on `main`.

## Normal work
Commits without `[deploy]` do not consume a Vercel build/deployment:

```bash
git commit -m "fix: improve borrower validation"
git push origin main
```

## Emergency release
Use `[deploy]` only after the intended production state is verified. Do not use `--force` or rebuild an existing verified deployment unless recovery requires it.
