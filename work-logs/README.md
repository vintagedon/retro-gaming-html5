<!--
---
title: "Work Logs"
description: "Date-based development history and milestone documentation"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
---
-->

# Work Logs

Date-based development history. Each work log captures what was done, what changed, what problems arose, and what comes next. Work logs are the project's memory of execution; they complement specs (what to do) and charters (why to do it) with a record of what actually happened.

---

## 1. Contents

```
work-logs/
├── worklog-2026-05-18-repo-hydration-pass.md  # Initial repository hydration pass
└── README.md                          # This file
```

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [Worklog Template](../docs/documentation-standards/worklog-readme-template.md) | Template for work log entries |

---

## 5. Conventions

Naming: Date-primary by default, using `worklog-YYYY-MM-DD.md` or `worklog-YYYY-MM-DD-brief-topic.md` when multiple logs share a date.

Template: Follow the worklog template in `docs/documentation-standards/worklog-readme-template.md`.

Milestone gathering: Related entries get gathered into milestone directories as patterns emerge organically. Do not pre-create milestone directory structures. When a cluster of worklogs clearly belongs together, create a directory and move them.

Agents: Agent-generated worklogs follow the same format. Include the agent name and session source in the frontmatter or an HTML comment at the bottom.
