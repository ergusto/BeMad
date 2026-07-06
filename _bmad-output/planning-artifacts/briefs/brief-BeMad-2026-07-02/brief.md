---
title: "Product Brief: BeMad — Todo App"
status: ready
created: 2026-07-02
updated: 2026-07-02
---

# Product Brief: BeMad (Todo App)

## Executive Summary

BeMad is a deliberately small, full-stack todo application for managing personal tasks. It does a handful of things — create, view, edit, complete, and delete tasks — and it does them fast, reliably, and with zero onboarding. Open the app and your list is already there; every action reflects instantly; your data survives refreshes and sessions.

What sets BeMad apart is not its feature set — it is its **voice**. Every piece of user-facing copy in the app is written in the style of Mr. Torgue from the *Borderlands* franchise: loud, hilarious, relentlessly enthusiastic. Empty states, buttons, loading messages, error banners, and completion confirmations all shout encouragement at you. The result is a task manager with the reliability of a boring tool and the personality of an explosion. The engineering, the specs, and the documentation stay entirely professional — the character lives only where the user can see it.

The bet: task management is a solved, commoditized problem, so the way to stand out is delight, not features. BeMad keeps the core airtight and lets personality do the differentiating.

## The Problem

Personal todo apps have converged on two unappealing extremes. On one end, feature-heavy tools bury a simple need — "write down a task, see it, check it off" — under projects, tags, deadlines, priorities, and collaboration dashboards nobody asked for. On the other, minimalist tools are so sterile and characterless that they are forgettable and joyless to use.

Meanwhile, the underlying job stays the same: people need a fast, dependable place to capture tasks and clear them, without a manual and without friction. When a tool is slow, loses data on refresh, or demands a sign-up before it does anything useful, people abandon it and fall back to sticky notes and memory — both of which fail them.

BeMad addresses both problems at once: it strips the experience down to the essential loop, and it makes that loop *fun* to run.

## The Solution

A single-user todo app with a small, well-defined backend API and a fast, responsive frontend.

- **Core loop:** create a task (short text), see the full list immediately on open, edit a task's text, toggle tasks complete/incomplete (completed items visually distinct from active ones), and delete tasks.
- **Task shape:** each todo has a short text description, a completion status, and basic metadata (creation time).
- **Feel:** optimistic, instant UI updates on every action; polished empty, loading, and error states; works cleanly on desktop and mobile.
- **Persistence:** a backend CRUD API stores and retrieves todos durably, so data is consistent across refreshes and sessions.
- **Personality:** all user-facing copy is written in Mr. Torgue's voice (bleeped profanity, e.g. `F***`). This is a defined product surface — the "voice pack" — kept separate from application logic so it is easy to maintain and, later, to swap or extend.
- **Living copy:** every string has ~5 interchangeable variants of identical meaning. The app rotates between them — a fresh pick on each page load, and interactive controls re-roll their label on every interaction — so the copy rarely repeats and the app never feels static.

## What Makes This Different

The differentiator is **delight through voice**, honestly stated — not a technical moat. Any competent team can build a CRUD todo app; almost none ship one with a distinctive, memorable personality baked into every interaction.

- **Personality as the product.** The Torgue voice turns mundane situations (an empty list, a completed task, a failed save) into small, shareable moments of humor.
- **It never gets stale.** Because every string rotates among ~5 variants, repeat users keep getting fresh lines — the humor doesn't wear out the way a single fixed joke would.
- **Reliability underneath the noise.** The joke only works if the app is genuinely fast and dependable. Solid engineering is the setup; the voice is the punchline.

Being honest about the moat: this is execution- and taste-driven differentiation. It is defensible only as long as the experience stays tight and the voice stays genuinely funny.

## Who This Serves

**Primary user:** an individual managing their own personal tasks who wants a fast, no-friction todo tool and enjoys a product with a sense of humor. They open BeMad, dump tasks, clear them, and move on — and get a laugh while doing it.

Success for this user looks like: never needing instructions, never losing a task, and actually *wanting* to open the app.

There are no secondary user roles in v1 (no accounts, no shared lists, no admins) — deliberately.

## Success Criteria

- **Usable with zero guidance.** A first-time user can create, edit, complete, and delete tasks without any onboarding or explanation.
- **Reliable persistence.** Tasks survive page refreshes and persist across sessions; nothing silently disappears.
- **Instant feel.** Under normal conditions, every interaction feels immediate; no perceptible lag on add/complete/delete.
- **Clear status at a glance.** Completed tasks are unmistakably distinguishable from active ones.
- **Polished edges.** Empty, loading, and error states are all handled gracefully and never break the flow.
- **The voice lands.** In-app copy reads as authentically Mr. Torgue and raises a smile — without ever obscuring what an action does or harming usability. Personality never costs the user clarity.

## Scope

**In (v1):**
- Create a todo (short text description).
- View the full list of todos on open.
- Edit a todo's text (in place).
- Toggle a todo complete / incomplete, with completed items visually distinct.
- Delete a todo.
- Basic metadata per todo (creation time).
- Responsive UI (desktop + mobile) with empty, loading, and error states.
- Optimistic/instant UI updates.
- Backend CRUD API with durable, consistent persistence.
- Mr. Torgue–voiced copy across all user-facing surfaces (bleeped profanity).
- ~5 interchangeable variants per string, rotated on page load and on each interaction with interactive controls.
- Basic client- and server-side error handling.

**Out (v1), by design:**
- User accounts, authentication, and multi-user support.
- Collaboration / shared lists.
- Task prioritization, deadlines/due dates, reminders, and notifications.
- Tags, categories, sub-tasks, search, or filtering.
- Multiple selectable voices (architecture leaves the door open; not built in v1).

**Forward-compatibility constraint:** while auth and multi-user are excluded from v1, the architecture must not preclude adding them later.

## Non-Functional Priorities

- **Simplicity** — the solution should be easy to understand, deploy, and extend by future developers.
- **Performance** — interactions feel instantaneous under normal conditions.
- **Maintainability** — clean separation of concerns; the voice/copy layer is centralized and does not entangle with logic.
- **Resilience** — graceful client- and server-side error handling that never disrupts the core flow.

## Vision

If the core lands, BeMad can grow along two independent axes without betraying its minimalist soul: **capability** (optional accounts and sync, so lists follow you across devices) and **personality** (a library of selectable voice packs beyond Mr. Torgue). The long-term identity is "the todo app with a soul" — proof that even the most commoditized utility can be worth choosing because it is a genuine pleasure to use. The immediate goal, however, is unchanged: nail the minimal core and make it feel like a complete, delightful product.
