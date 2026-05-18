<!--
---
title: "Assets"
description: "Project-level images, banners, diagrams, and visual resources"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: assets
---
-->

# Assets

Project-level images, banners, diagrams, and visual resources. Files here support repository documentation and presentation. Game runtime assets live inside each game's `game/assets/` directory and are not stored here.

---

## 1. Contents

```
assets/
├── background-section-infographic.jpg  # Repository overview image
├── repo-banner.jpg                     # Repository banner image
└── README.md               # This file
```

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../README.md) | Parent directory; typically references banner images |

---

## 5. Conventions

Naming: Use descriptive, lowercase, hyphenated filenames: `architecture-diagram.png`, `project-banner.svg`.

Formats: Prefer SVG for diagrams and icons, PNG or JPG for screenshots and complex images. Avoid large uncompressed formats.

References: Link project-level assets from markdown using relative paths: `![Alt text](assets/filename.png)` from the repo root, or `![Alt text](../assets/filename.png)` from a subdirectory.
