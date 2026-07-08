# How BMAD Guided Implementation — BeMad

A concise summary of how the **BMAD Method** drove BeMad from a raw spec to a
verified, documented app. For the AI/MCP integration record (what worked, what
AI missed), see [the AI-integration log](ai-integration-log.md); this document
focuses on the *method* and how it shaped the build.

## The pipeline

```
brief → project-context → PRD → architecture → epics/stories → sprint-planning
      → [ per story:  create-story → dev-story → tea/automate → code-review → commit ]
      → epic retrospective → (next epic)
```

Each phase is a dedicated skill run in its own context, producing a durable
artifact that the next phase consumes. Planning produced the brief, the
`project-context.md` (conventions every downstream agent auto-loads), the PRD
(22 FRs, 6 NFRs), and a 14-decision architecture spine (AD-1…AD-14). Delivery
turned that into 4 epics of stories, tracked in `sprint-status.yaml`.

## How it guided implementation

- **Story-context engine (`create-story`).** Rather than copying the epic, each
  story file is engineered to give the developer *everything*: the exact ACs, the
  architecture guardrails that apply, the files to touch (NEW vs UPDATE),
  learnings from prior stories, and explicit scope fences. This front-loading is
  what kept implementation from reinventing wheels or breaking regressions.
- **Red-green development (`dev-story`).** Failing tests first, minimal code to
  green, then refactor — with the story file as the authoritative task list. The
  agent updates only permitted sections (status, tasks, Dev Agent Record, File
  List, Change Log) and does not stop until the story is complete.
- **Guardrail-test expansion (`tea/automate`).** Where a story added runtime
  surface, a test-architect pass broadened coverage beyond the happy path.
- **Adversarial code review (`code-review`).** A 3-layer parallel review (a
  context-free "blind" hunter, an edge-case hunter with repo access, and an
  acceptance auditor against the spec) ran on every story in fresh context. It
  caught a real, often self-introduced defect in nearly every story — the single
  most valuable quality gate (details in the AI-integration log). Findings were
  triaged (patch / defer / dismiss); patches applied before the story closed.
- **Per-story commits.** One reviewed, green commit per story (an Epic-1 retro
  action item) — a bisectable history where every change is isolated.
- **Retrospectives feed forward.** After each epic, a retro extracted lessons and
  logged action items into `sprint-status.yaml`; later stories picked them up
  (e.g. `data-testid` E2E locators, client fetch timeout, focus-return,
  CI + test-DB isolation, the coverage gate). Deferred issues live in
  `deferred-work.md` and are revisited by name in later stories.

## The artifacts (where to look)

| Artifact | Role |
| -------- | ---- |
| `_bmad-output/planning-artifacts/` | brief, PRD, architecture spine, epics |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | the ledger — every epic/story/retro status + open action items |
| `_bmad-output/implementation-artifacts/<epic>-<story>-*.md` | per-story spec + Dev Agent Record + Senior Developer Review |
| `_bmad-output/implementation-artifacts/deferred-work.md` | tracked deferrals, resolved as later stories address them |
| `_bmad-output/implementation-artifacts/epic-*-retro-*.md` | per-epic retrospectives |
| `docs/qa/` | the QA evidence (coverage, a11y, security, performance) |

## What the method bought

- **Traceability:** every line of code maps back through a story to an AC, an
  architecture decision, and a PRD requirement.
- **Quality by construction:** the adversarial gate turned "the tests pass" into
  "an independent reviewer tried to break it and couldn't" — repeatedly upgrading
  weak or wrong tests before they shipped.
- **No silent scope creep:** scope fences + the defer/retro loop kept
  measure-and-document stories from smuggling in behaviour changes, and kept
  known gaps visible rather than forgotten.
