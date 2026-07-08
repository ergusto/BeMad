import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// FR-14 guard: no hardcoded user-facing copy remains in the component — every
// such string now comes from the voice pack via useVoice / FIXED_COPY. We read
// the component source and assert the previously-hardcoded phrases are gone.
// (Curated to distinctive phrases that can't collide with data-testids, aria
// labels, identifiers, or comments.)

const source = readFileSync(
  fileURLToPath(new URL("../../app/todo-app.tsx", import.meta.url)),
  "utf8",
);

const FORBIDDEN_LITERALS = [
  "No tasks yet.",
  "Loading…",
  "Saving…",
  "Delete this task?",
  "What needs doing?",
  "Add task",
];

describe("voice wiring (FR-14: no hardcoded user-facing strings)", () => {
  it("app/todo-app.tsx contains none of the old hardcoded phrases", () => {
    for (const phrase of FORBIDDEN_LITERALS) {
      expect(source, `hardcoded phrase "${phrase}"`).not.toContain(phrase);
    }
  });

  it("app/todo-app.tsx sources copy from the voice pack", () => {
    expect(source).toContain("useVoice");
    expect(source).toContain("ERROR_CODE_COPY");
    expect(source).toContain("FIXED_COPY");
  });
});
