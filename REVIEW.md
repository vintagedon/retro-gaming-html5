# Code Review Instructions

Guidance for the automated reviewer on pull requests in this repository. This replaces the default review scope.

This is a spec-driven repository. Every pull request implements a specification under `docs/specs/` whose validation checklist the author has checked off. The most valuable thing a review can do here is test whether those checked boxes are true, because nothing else in the pipeline does.

Be helpful rather than pedantic. Frame findings as suggestions a human accepts or rejects, and say what evidence would change your mind.

## Do not comment on

A duplicate finding costs the maintainer attention that belongs elsewhere. Where an actual check on the pull request already reports a problem, do not repeat it.

- Lint, formatting, and typecheck output, when a check reports them.
- Em dashes and writing-style guide violations. These are caught elsewhere and are not review findings.
- Dependency version bumps in `package.json` or the lockfile unless the change alters runtime behavior.
- Missing tests for code the specification did not require.

This repository has no test workflow. A reproduced failing test is a reportable finding here, not a duplicate; say how you reproduced it.

## Flag first

These have each shipped past review in this repository before, so they are the calibration target rather than a generic list.

**A checked validation box that the tree does not satisfy.** The specification's checklist is the contract. If a box claims a behavior is proven and no test exercises it, or the test that exercises it cannot fail, that is the highest-value finding available and it outranks anything else in the diff.

**A test that passes under the mutation it names.** A test whose comment or title names a discriminating mutation, and which still passes when that mutation is active, is a false statement in the repository. Assertions that compare a pure function to itself, compare two differently-constructed fixtures, or assert only that something differed all belong here.

**A lifecycle guarantee broken by a new layer.** Pause, blur, visibility change, restart, and focus behavior are established contracts in the core. A shell, HUD, or menu added above them frequently reintroduces a defect the layer below already fixed. Check the combinations rather than each handler alone: pause then blur, pause then hide, pause then restart, focus a control then press a gameplay key.

**A claim contradicted by the tree.** Commit messages, pull request descriptions, and completion reports that state something was archived, recorded, or reconciled when it was not. Verify the claim against the files.

**A defect only visible when the game runs.** Rendering that contradicts the rules, a control that is unusable at its specified rate, an element invisible or off-screen at a supported viewport. A suite passing does not mean the game works, and this repository has shipped a renderer drawing enemies in the wrong direction past a green suite.

**Unexpected writes outside the game directory.** Each game owns `<game>/` and its published destination under the preview umbrella, and `publish.sh` writes outside the tree by design. What is not by design is an ordinary test run touching the shared preview root, a sibling game's published directory, the umbrella root, or an operator path. Flag those as high severity, and flag a publisher whose destination is not its own approved subfolder.

**Cross-game coupling.** This is a monorepo of independent games. A game reaching into a sibling's directory, importing from one, or sharing state through the umbrella root is a finding regardless of how convenient it looks. Shared code is extracted deliberately, never by one game reaching sideways.

## Severity calibration

Reserve CRITICAL for something that breaks play, corrupts state, writes somewhere it does not own, or couples two games together. Use WARNING for a contract violation that a player or a fresh clone would hit. Everything else is a SUGGESTION.

Interior README and index staleness is real and worth reporting, and it is a SUGGESTION. Group those into one finding rather than one per file.

Aim for the findings that change what the maintainer does. A review of twenty-five suggestions and one warning buries the warning.

## Repository shape

This is a monorepo of independent browser games. Each game lives in its own top-level directory with its own `AGENTS.md`, `README.md`, `package.json`, test suite, `publish.sh`, and servable `game/` tree. There is no cross-game code dependency and no shared runtime.

A pull request normally touches one game plus repository-level records. Review the diff against that game's own `AGENTS.md` first, since conventions are per-game where they differ. Treat each game's directory as the unit of isolation: paths, imports, tests, and published output all stay inside it.

## Context worth knowing

- Games are self-contained static sites with no backend, no build step, and relative paths only. Flag anything that assumes otherwise.
- Licensed reference packs under ignored `reference-files*/` directories are studied, never copied. Flag any copied pack source.
- Specifications are the public record and are never deleted. A superseded one is marked `deprecated` with a pointer to its replacement. Flag a deleted tracked specification.
- The maintainer merges. Agents commit, push, and open pull requests, and never merge.
