# Project: Game Engine Development & Migration (Phaser.js)

## 1. Project Overview
- **Goal**: Build a robust, modular game engine using **Phaser.js** and upgrade the existing boilerplate/pre-developed structure found in the `awef` folder.
- **Reference Specification**: The core game design, mechanics, and requirements are defined in the Notion document: [Notion Game Spec](https://app.notion.com/p/minjoon-402830c6ebdb806f8225fe24613d1d34). *(Note: If direct access is restricted, ask the user to export or paste the spec contents).*
- **Current Workspace Structure**:
  - Root: Empty engine skeleton / project configuration.
  - `awef/`: Pre-developed code and early prototypes. Your task is to analyze, refactor, and scale this folder into a clean, production-ready architecture.

---

## 2. Core Architecture & Tech Stack
- **Engine Core**: Phaser.js (Latest stable version)
- **Language/Setup**: JavaScript / Modular ES Modules (or TypeScript if configured in `awef`)
- **Design Pattern**: 
  - Scene-based architecture (Boot, Preload, Menu, Game, UI, GameOver)
  - Component or Manager-based systems (e.g., InputManager, SoundManager, StateManager) if scaling is needed.
  - Clean separation of concerns: Keep game physics, UI overlays, and asset loading decoupled.

---

## 3. Development Workflow for Claude
When working on this project, follow these engineering guidelines:

1. **Analyze `awef` First**: Before writing new code, inspect the contents of the `awef` folder to understand what is already implemented, what patterns were used, and what needs refactoring.
2. **Align with Notion Spec**: Break down the game requirements from the Notion link into modular systems (e.g., player movement, collision rules, scoring, UI states).
3. **Incremental Implementation**: 
   - Step 1: Fix/Upgrade the engine foundation and asset loading pipeline.
   - Step 2: Port and enhance gameplay mechanics from `awef`.
   - Step 3: Implement missing features specified in the Notion document.
4. **Code Quality**: Write clean, self-documenting code with clear error handling and asset fallback management.

---

## 4. Initial Prompt for Claude (Copy & Paste to Start)
When initializing this workspace with Claude, use the following prompt to kick off the development:

> "We are building a Phaser.js game engine and upgrading the pre-developed prototype located in the `awef` folder. Please inspect the workspace (`awef` and root structure) and review the game specification in this Notion link: https://app.notion.com/p/minjoon-402830c6ebdb806f8225fe24613d1d34. 
> 
> Let's start by analyzing what exists in `awef/`, outlining a clean engine architecture using Phaser.js, and creating a step-by-step roadmap to implement the game."