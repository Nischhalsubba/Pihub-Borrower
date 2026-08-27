# @pihub/platform

Shared application metadata and platform contracts that are safe for every PiHub frontend to consume.

Phase 3 makes this package executable: it owns application/origin metadata plus explicit browser-local demo-session helpers used only by the new demo workspaces. Production authentication remains a server responsibility.

Dependency rule: applications may import this package; this package must never import an application.
