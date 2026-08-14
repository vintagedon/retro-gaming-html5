<!--
---
title: "Documentation"
description: "Specifications and documentation standards for the retro gaming monorepo"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-14"
version: "2.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
---
-->

# Documentation

Specifications and documentation standards for the retro gaming monorepo. `specs/` holds the public specifications that are the unit of work; `documentation-standards/` holds the templates and writing rules used by specs and directory READMEs.

---

## 1. Contents

```
docs/
├── specs/                          # Public specifications, the unit of work
│   └── README.md
├── documentation-standards/        # Template library and guidelines
│   └── README.md
└── README.md                       # This file
```

---

## 2. Subdirectories

| Directory | Description |
|-----------|-------------|
| [specs/](specs/README.md) | Public specifications; each is implemented on a branch and closed by a pull request |
| [documentation-standards/](documentation-standards/README.md) | Templates and the tagging and writing-style guides |

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory |
| [AGENTS.md](../AGENTS.md) | Working model and conventions |
