<!--
---
schema: fixed-address-doc-v1
document_type: project-charter
status: Draft
owner: "[Owner]"
updated: YYYY-MM-DD
tags:
  - type: charter
  - domain: [see tagging-strategy.md for allowed values]
---
-->

<!--
FRONTMATTER: Always include. Schema is always "fixed-address-doc-v1"
and document_type is always "project-charter." The charter freezes
scope and architectural decisions. It does not prescribe implementation
sequence; that belongs in specs.

SOURCES: A charter draws from the one-pager (vision, reasoning,
architecture) and any GDR outputs (validated data, gap analysis).
The one-pager preserves the full reasoning arc; the charter distills
it into commitments.
-->

# [Project Name] — Project Charter

<!--
IDENTITY AND PURPOSE: 2-4 sentences stating what this project is,
who it serves, and why it exists. Pull directly from the one-pager's
vision section. This is the project's elevator pitch; a reader
should understand the project's reason for existing after this
paragraph alone.
-->

## 1. Identity and Purpose

[What this project is, who it serves, and why it exists.]

---

<!--
SCOPE AND BOUNDARIES: Three subsections: in scope (v1), in scope
(future versions), and out of scope. Be specific about what's
included and excluded. The critical constraints subsection captures
non-negotiable rules that agents and contributors must not violate.
Source from the one-pager's architecture decisions and any GDR
findings that establish boundaries.

This section is what prevents scope creep. If a decision isn't
recorded here, it's open for future reconsideration. If it is
recorded here, it's frozen until the charter is formally revised.
-->

## 2. Scope and Boundaries

**In scope (v1):**

- [Deliverable or capability 1]
- [Deliverable or capability 2]

**In scope (v2/future):**

- [Deferred deliverable 1]
- [Deferred deliverable 2]

**Out of scope:**

- [Explicitly excluded item 1]
- [Explicitly excluded item 2]

**Critical constraint:** [Non-negotiable rule that must not be violated. Add as many of these as needed, each as its own bold-prefixed paragraph.]

---

<!--
OBJECTIVES AND ACCEPTANCE CRITERIA: Primary and secondary outcomes
state what success looks like in plain language. Acceptance criteria
are specific, testable conditions grouped by category. Source the
outcomes from the one-pager's vision and value proposition sections.
Acceptance criteria should be concrete enough that an agent or
reviewer can verify pass/fail without ambiguity.
-->

## 3. Objectives and Acceptance Criteria

### Primary Outcome

[What the project achieves when complete. 2-3 sentences.]

### Secondary Outcome

[Additional value delivered. 1-2 sentences. Omit if no meaningful secondary outcome exists.]

### Acceptance Criteria

**[Category 1]:**

- [Testable criterion]
- [Testable criterion]

**[Category 2]:**

- [Testable criterion]
- [Testable criterion]

---

<!--
PROJECT DETAILS: Three subsections covering technology, architecture,
and roadmap. This is the densest section and where GDR outputs
contribute most. Technology and methodology describes the stack and
approach. Architecture shows the structural design with tables and
diagrams as needed. Roadmap breaks execution into phases with
concrete deliverables per phase.

The roadmap defines phases, not timelines. Each phase should be
independently specifiable (one or more specs per phase).
-->

## 4. Project Details

### 4.1 Technology and Methodology

[Tech stack, frameworks, execution approach. Source from one-pager
architecture decisions and GDR technology recommendations.]

### 4.2 Architecture

[Structural design with tables, component descriptions, and design
rationale. This section can be as detailed as needed for the
project's complexity.]

### 4.3 Roadmap

**Phase 1: [Phase Name]**

- [Deliverable or milestone]
- [Deliverable or milestone]

**Phase 2: [Phase Name]**

- [Deliverable or milestone]
- [Deliverable or milestone]

---

<!--
SECURITY AND COMPLIANCE: Include when the project has security
requirements, handles sensitive data, or operates under regulatory
constraints. Omit entirely (preserve the number gap) for projects
with no security considerations. Do not pad with generic statements.
-->

## 5. Security and Compliance

[Security requirements, data handling constraints, compliance
obligations, disclaimers.]

---

<!--
OPERATIONS, SUPPORT, AND MAINTENANCE: How the project stays healthy
after initial delivery. Include update tracking, monitoring needs,
cost model, and maintenance cadence. Omit (preserve number gap) for
one-shot deliverables with no ongoing maintenance.
-->

## 6. Operations, Support, and Maintenance

[Ongoing maintenance requirements, update tracking, cost model.]

---

<!--
DEPENDENCIES AND RELATIONSHIPS: Table of external dependencies,
shared assets, peer projects, infrastructure requirements, and
external data sources. Include the dependency type (shared asset,
infrastructure, external data, upstream, peer) to clarify the
relationship. Omit (preserve number gap) for standalone projects
with no meaningful dependencies.
-->

## 7. Dependencies and Relationships

| Dependency | Relationship | Type |
|-----------|-------------|------|
| [Dependency] | [How it relates] | [Shared asset / Infrastructure / External data / Upstream / Peer] |

---

<!--
METADATA AND HISTORY: Standard metadata block plus source documents
table. The lineage subsection captures how the project idea evolved
(which sessions, which models, which insights led here). Multi-model
contribution table documents which AI models contributed what, for
provenance and reproducibility.

Source documents must include every document that informed the
charter: one-pagers, GDRs, reference materials, prior art.
-->

## 8. Metadata and History

| Field | Value |
|-------|-------|
| Author | [Author] |
| Created | YYYY-MM-DD |
| Version | 1.0 |
| Status | Draft |
| Repository | [URL or TBD] |

### Source Documents

| Document | Role |
|----------|------|
| [One-pager filename] | Ideation session capture |
| [GDR filename] | Deep research output |

### Lineage

[2-4 sentences: how this project idea originated and evolved. What
sessions, insights, or external inputs led to the charter. This
provides provenance for future readers who need to understand why
decisions were made.]

### Multi-Model Contribution

| Model | Contribution |
|-------|-------------|
| [Model name] | [What it contributed] |

<!--
TEMPLATE NOTES:

Section numbering is fixed (1-8). This is the "fixed-address-doc"
pattern: external references can cite "Section 2" and it always
means Scope and Boundaries. If a section is omitted, preserve the
number gap.

The charter freezes the WHAT and WHY. The HOW and WHEN belong in
specs. If you find yourself writing implementation details beyond
what's needed for architectural context, that content belongs in a
spec, not here.

A charter should be writable in a single session from a completed
one-pager and any GDR outputs. If the charter feels difficult to
write, the one-pager likely needs more work first.
-->
