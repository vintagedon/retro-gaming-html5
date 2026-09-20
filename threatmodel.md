<!--
---
title: "Threat Model"
description: "The deployed surface of the retro-gaming monorepo: nginx preview now, Azure Static Web Apps later, and what that means for attack surface"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-20"
version: "1.0"
status: "Active"
tags:
  - type: threat-model
  - domain: security
  - tech: [static-site, nginx, azure-static-web-apps]
related_documents:
  - "[Agent Instructions](AGENTS.md)"
  - "[Vector Vortex](vector-vortex/README.md)"
  - "[Asset Attribution](vector-vortex/game/assets/ATTRIBUTION.md)"
---

# Threat Model

What is actually deployed, and what that surface implies. This file describes the current reality: static browser games on an internal nginx preview, moving to Azure Static Web Apps later.

## Deployed surface

- **Hosting:** nginx internal preview now (`retrogaming.donfather.site/<game>/`), Azure Static Web Apps later. Plain static file serving.
- **No backend:** no server-side rendering, no APIs, no dynamic endpoints, no cookies. The entire application logic ships as auditable ES modules.
- **Persistence:** `localStorage` under one namespaced key per game (for example `retrohtml5.vector-vortex.v1`). It stores only user preferences and a best score. It is the only persistence in the system.

## Threats and treatments

### localStorage is a user-modifiable input

Anything in `localStorage` can be edited by the user or by any script running on the page origin. The games therefore treat persisted values as hostile input, not trusted state: every field is validated on load (type and range), invalid values fall back to defaults, and quota or security errors degrade silently to a no-storage session. The defensive storage validation exercises malformed fixtures, out-of-range values, and unavailable storage directly. No session tokens, no personal data, no in-progress game state ever persists, so tampering costs at most a corrupted high score.

### Untrusted input surface

The only other inputs are keyboard and pointer events, which the game consumes in-process and never passes to `eval`, remote endpoints, or dynamic HTML construction. There is no file upload, no URL parameter parsing, no message-channel listener.

### Third-party asset provenance and licensing

Shipped assets (fonts, music, effect sprites) are third-party works. Each game records pack, author, licence, source, and transformation per file in its `game/assets/ATTRIBUTION.md`, and only assets whose licence permits redistribution of the file itself in a public repository are shipped; a pack whose terms do not permit that is rejected and the conflict is reported in the attribution file. Runtime risk from shipped assets is bounded by format choice: fonts, PNGs, and audio containers are decoded by the browser's own parsers, never by in-page code.

### Publish path and destination scoping

Each game's `publish.sh` wipes and repopulates only its own `<game>/` subfolder under the destination root. A basename-and-parent guard refuses any other destination, so a misconfigured run cannot touch the umbrella root or a sibling game. The unit and browser suites publish into an isolated destination inside the checkout and never require the production directory to exist. The publish writes a deterministic content digest marker so a served build can be identified from the files alone.

### Toolchain supply chain

Runtime dependencies: none. The served games are vanilla ES modules with no runtime package. Development dependencies (`@playwright/test`, `http-server`) are pinned in a committed lockfile and never ship to the served site; the publish copies only the game's `game/` tree. The vendored UI framework snapshot is byte-identical to a pinned upstream commit with a per-file SHA-256 manifest.

## Out of scope

The nginx host configuration and TLS termination are part of the platform, not of this repository, and are covered by the host's own hardening. The later Azure Static Web Apps deployment inherits the same application-level posture: it adds hosting-platform identity and configuration concerns and removes the self-managed nginx surface entirely.
