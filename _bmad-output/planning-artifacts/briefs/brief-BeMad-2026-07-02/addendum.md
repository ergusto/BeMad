# Addendum — BeMad (Todo App)

Depth captured alongside the brief for downstream consumers (PRD, UX, architecture). The brief stays lean; supporting detail lives here.

> **⚠️ Read first — decisions that change the spec (full detail in §4):**
> - **In-place text editing IS in v1 scope** — this *extends* the original spec in §1 (which listed only create/view/complete/delete). Don't miss it.
> - **Completion is a toggle** (complete ↔ active).
> - **Persistence choice is still open** — deferred to the architecture stage.

---

## 1. Original Spec (verbatim, as provided by the user)

> The goal of this project is to design and build a simple full-stack Todo application that allows individual users to manage personal tasks in a clear, reliable, and intuitive way. The application should focus on clarity and ease of use, avoiding unnecessary features or complexity, while providing a solid technical foundation that can be extended in the future if needed.
>
> From a user perspective, the application should allow the creation, visualization, completion, and deletion of todo items. Each todo represents a single task and should include a short textual description, a completion status, and basic metadata such as creation time. Users should be able to immediately see their list of todos upon opening the application and interact with it without any onboarding or explanation.
>
> The frontend experience should be fast and responsive, with updates reflected instantly when the user performs an action such as adding or completing a task. Completed tasks should be visually distinguishable from active ones to clearly communicate status at a glance. The interface should work well across desktop and mobile devices and include sensible empty, loading, and error states to maintain a polished user experience.
>
> The backend will expose a small, well-defined API responsible for persisting and retrieving todo data. This API should support basic CRUD operations and ensure data consistency and durability across user sessions. While authentication and multi-user support are not required for the initial version, the architecture should not prevent these features from being added later if the product evolves.
>
> From a non-functional standpoint, the system should prioritize simplicity, performance, and maintainability. Interactions should feel instantaneous under normal conditions, and the overall solution should be easy to understand, deploy, and extend by future developers. Basic error handling is expected both client-side and server-side to gracefully handle failures without disrupting the user flow.
>
> The first version of the application intentionally excludes advanced features such as user accounts, collaboration, task prioritization, deadlines, or notifications. These capabilities may be considered in future iterations, but the initial delivery should remain focused on delivering a clean and reliable core experience.
>
> Success for this project will be measured by the ability of a user to complete all core task-management actions without guidance, the stability of the application across refreshes and sessions, and the clarity of the overall user experience. The final result should feel like a complete, usable product despite its deliberately minimal scope.

---

## 2. Voice & Copy Guide — Mr. Torgue (in-app copy only)

**Scope of the voice:** ALL user-facing copy in the running app/website. **NOT** the brief, PRD, architecture, code comments, commit messages, API field names, or logs — those are plain and professional.

**Voice characteristics:**
- LOUD. Heavy use of ALL CAPS for emphasis and excitement.
- Relentlessly enthusiastic and hyperbolic; treats trivial actions as EPIC.
- Loves EXPLOSIONS and describing things as BADASS / AWESOME / EXTREME.
- Profanity is **bleeped**: render as `F***`, `S***`, etc. Never uncensored.
- Occasional brief "quiet aside" in lowercase before returning to shouting (a canonical Torgue beat) — use sparingly.
- **Clarity rule:** the humor must never hide what an action does. If a user can't tell what a button does or what went wrong, the voice has failed. Volume yes; ambiguity no.

### Rotating variants (core mechanic)

Every user-facing string is defined as a **set of ~5 variants that all mean the same thing**. The app rotates between them so the copy rarely repeats and the app feels alive:

- **On page load**, each surface picks a variant.
- **Interactable elements** (buttons, etc.) re-roll to a different variant **every time the user interacts with them** — so the "add" button might say `ADD IT!!!` on one click and `MAKE IT SO!` on the next.
- All variants of a given key are **semantically identical** — the clarity rule holds for every variant. Rotation changes the flavor, never the meaning.
- Rotation should avoid immediately repeating the same variant back-to-back (prefer "next different variant" over pure random).

**Accessibility note:** ALL-CAPS styling should come from CSS `text-transform`, not shouty stored strings, so assistive tech reads normally. Rotating the visible label on interactive controls is fine because every variant carries identical meaning; keep the underlying `aria-label`/role stable and descriptive so screen-reader users get a consistent, unambiguous action name even as the display text rotates.

### Example variant sets (illustrative starting points — not final; ~5 each)

**App title / header**
- `BeMad — GET S*** DONE, EXPLOSIVELY`
- `BeMad — YOUR TASKS. YOUR CARNAGE.`
- `BeMad — THE LOUDEST TODO LIST ALIVE`
- `BeMad — WRITE IT. CRUSH IT. REPEAT.`
- `BeMad — TASK ANNIHILATION STATION`

**Add-task input placeholder**
- `TYPE A TASK. ANY TASK. MAKE IT COUNT.`
- `WHAT ARE WE DESTROYING TODAY?`
- `DROP A TASK IN HERE, CHAMPION.`
- `NAME YOUR NEXT VICTIM (IT'S A TASK).`
- `WHAT NEEDS DOING? SAY IT LOUD.`

**Add button**
- `ADD IT!!!`
- `MAKE IT SO!`
- `SLAM IT ON THE LIST`
- `LOCK AND LOAD`
- `INCOMING TASK!`

**Empty state (no todos)**
- `YOUR LIST IS EMPTY AND THAT IS BEAUTIFUL. NOTHING TO DO = TOTAL FREEDOM.`
- `NO TASKS. NOTHING. ZILCH. YOU MAGNIFICENT MACHINE.`
- `THE LIST IS CLEAR. GO ENJOY YOUR HARD-EARNED CHAOS.`
- `EMPTY LIST DETECTED. THREAT LEVEL: ZERO. NICE.`
- `NOTHING HERE YET. TYPE SOMETHING ABOVE AND WE RIDE.`

**Loading state**
- `LOADING YOUR TASKS AT MAXIMUM VELOCITY...`
- `REVVING THE ENGINES...`
- `SUMMONING YOUR TASKS FROM THE VOID...`
- `HANG ON, PULLING THE GOODS...`
- `SPINNING UP THE TASK CANNON...`

**Complete a task (control label; keep aria-label stable, e.g. "Mark task complete")**
- `CRUSH IT`
- `DONE AND DONE`
- `NAIL IT`
- `SMASH IT`
- `WIPE IT OUT`

**Completion confirmation (toast)**
- `BOOM! ANOTHER ONE DOWN. YOU ABSOLUTE LEGEND.`
- `TASK OBLITERATED. THE CROWD GOES WILD!`
- `YES!!! ONE LESS THING BETWEEN YOU AND GLORY.`
- `THAT'S HOW IT'S DONE, CHAMPION.`
- `KABOOM! CHALK UP ANOTHER WIN.`

**Edit button**
- `CHANGE IT`
- `FIX IT UP`
- `REWORD THIS BEAST`
- `TWEAK IT`
- `PATCH IT`

**Edit save button**
- `LOCK IT IN`
- `SAVE THE CARNAGE`
- `MAKE IT OFFICIAL`
- `DONE, SAVE IT`
- `SEAL THE DEAL`

**Delete button**
- `OBLITERATE`
- `ANNIHILATE`
- `BLOW IT UP`
- `VAPORIZE`
- `SEND IT TO THE VOID`

**Delete confirmation (message)**
- `THIS TASK IS GONE FOREVER. NO REGRETS. DELETE IT?`
- `YOU SURE? THIS ONE AIN'T COMING BACK.`
- `POINT OF NO RETURN. WIPE THIS TASK?`
- `LAST CHANCE — OBLITERATE THIS FOR GOOD?`
- `DELETING IS FOREVER. YOU GOT THE GUTS?`
  - confirm: `YES, ANNIHILATE` / `DO IT` / `NO MERCY` / `BLOW IT UP` / `GONE FOREVER`
  - cancel: `uh, nevermind` / `wait, no` / `keep it` / `on second thought...` / `abort abort`

**All tasks complete**
- `EVERY. SINGLE. TASK. DESTROYED. GO TREAT YOURSELF, CHAMPION.`
- `LIST CLEARED. YOU ARE UNSTOPPABLE.`
- `TOTAL VICTORY. NOTHING LEFT STANDING.`
- `FLAWLESS. THE LIST NEVER STOOD A CHANCE.`
- `ALL DONE! CUE THE EXPLOSIONS. 🎆`

**Generic error**
- `SOMETHING BLEW UP — AND NOT THE FUN WAY. TRY AGAIN?`
- `WELP. THAT DIDN'T WORK. LET'S GO AGAIN.`
- `ERROR! BUT WE DON'T QUIT. RETRY?`
- `THAT MOVE MISFIRED. GIVE IT ANOTHER SHOT.`
- `S*** HAPPENED. RELOAD THE CANNON AND RETRY.`

**Network / save failure**
- `THE INTERNET BETRAYED US. YOUR TASK DIDN'T SAVE. RETRY?`
- `CONNECTION WENT BOOM. NOTHING SAVED. TRY AGAIN.`
- `LOST THE SIGNAL, LOST THE SAVE. HIT RETRY.`
- `THE SERVER GHOSTED US. YOUR CHANGE DIDN'T STICK.`
- `NO SAVE. THE NETWORK'S BEING A COWARD. GO AGAIN.`

**Retry button**
- `TRY AGAIN, DAMMIT`
- `RELOAD AND FIRE`
- `ONE MORE TIME`
- `GO AGAIN`
- `HIT IT AGAIN`

---

## 3. Architecture-Enabling Notes (for downstream, not v1 features)

- **Voice pack layer.** Centralize all copy in one place (a copy/i18n-style module) so the personality is a swappable layer. Enables future voices and keeps logic clean. v1 ships exactly one pack (Torgue). Each key maps to an **array of ~5 variants** rather than a single string.
- **Rotation mechanism.** A small selector picks a variant per key on page load, and re-rolls interactive controls' labels on each interaction. Should avoid repeating the same variant twice in a row (e.g. cycle through a shuffled order, or "pick a different index"). Keep it a thin, testable helper decoupled from components.
- **Forward-compatibility for auth/multi-user.** v1 is single-user with no accounts, but data model and API should not hard-code assumptions that block adding a user/owner concept later.
- **Durability.** "Consistent and durable across sessions" implies real server-side persistence (not just in-memory/localStorage) as the source of truth.

---

## 4. Resolved Decisions & Open Questions

**Resolved (confirmed by user, 2026-07-02):**
- **Completion is a toggle** — tasks move freely between complete ↔ active.
- **In-place text editing IS in v1 scope** (extends the original spec's create/view/complete/delete with edit).
- **Rotating copy variants** — every user-facing string has ~5 interchangeable variants of identical meaning; the app rotates between them (see §2).

**Open (deferred, not blocking the brief):**
- **Persistence choice** (file, SQLite, hosted DB) — to be decided in the architecture planning stage that follows this brief.
