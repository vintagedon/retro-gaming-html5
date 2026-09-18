# CargoLander

Lunar Lander rung of the wireframe arc: continuous physics, fuel and thrust notches, survivable impacts with a limited craft count, and a telemetry HUD built from the published h5gameui kit CSS as an outside consumer.

## Layout

- `game/` is the servable game. Static files only, relative paths, no build step, no runtime dependency.
  - `game/core/` pure simulation. No `window`, no `document`, no `Date.now`, no `performance.now`, no `Math.random`. Randomness comes from a seeded RNG whose state serializes with the snapshot.
  - `game/runtime/` fixed-step clock and frame runner, plus the `window.__cl` deterministic seam used by tests.
  - `game/ui/` HUD projector over the vendored kit CSS, and the 1920x1080 stage fitter.
  - `game/vendor/h5gameui/` the pinned kit revision. Do not edit vendored files; see `game/vendor/h5gameui/MANIFEST.json`.
- `tests/` tracked development toolchain. Node unit tests (`node --test`) and Chromium-headless Playwright tests. Test source, seeds, and fixtures are committed; `node_modules/`, reports, and downloaded browsers are not.
- `publish.sh` copies only `game/` to the preview umbrella. The test toolchain never ships.

## Rules that matter here

- Zero image and zero audio files under `game/`. Geometry is procedural Canvas, chrome is CSS and inline SVG on the framework tokens.
- The core computes every value the HUD displays, including all ratios. Adapters never divide.
- Kit defects are reported in `consumer-report.md` and the pull request, never patched in the vendored tree or the framework repository.
- One `CONFIG` object owns all tuning. Retuning the feel never touches simulation code.

## Commands

```bash
npm install          # once; dev toolchain only
npm run test:unit    # node --test over tests/
npm run test:e2e     # playwright test, Chromium headless
npm test             # both
```

See the repository root [AGENTS.md](../AGENTS.md) for the spec-driven lifecycle this game was built under.
