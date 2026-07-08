import { describe, it, expect } from "vitest";
import {
  VOICE_CATALOG,
  ERROR_CODE_COPY,
  PROFANITY_DENYLIST,
  hasUnbleepedProfanity,
  type VoiceKey,
} from "@/lib/voice";

const entries = Object.entries(VOICE_CATALOG) as [VoiceKey, readonly string[]][];

describe("voice catalog — structure (FR-15)", () => {
  it("every key has at least 5 variants", () => {
    for (const [key, variants] of entries) {
      expect(variants.length, `key "${key}"`).toBeGreaterThanOrEqual(5);
    }
  });

  it("no variant is empty or blank", () => {
    for (const [key, variants] of entries) {
      for (const v of variants) {
        expect(v.trim().length, `key "${key}" variant "${v}"`).toBeGreaterThan(0);
      }
    }
  });

  it("no exact-duplicate variants within a key", () => {
    for (const [key, variants] of entries) {
      expect(new Set(variants).size, `key "${key}"`).toBe(variants.length);
    }
  });
});

describe("voice catalog — profanity bleeped (FR-18)", () => {
  it("no variant contains an un-bleeped strong-profanity token", () => {
    for (const [key, variants] of entries) {
      for (const v of variants) {
        expect(
          hasUnbleepedProfanity(v),
          `key "${key}" variant "${v}" contains un-bleeped profanity`,
        ).toBe(false);
      }
    }
  });

  it("the guard actually detects uncensored tokens (and ignores bleeped ones)", () => {
    expect(hasUnbleepedProfanity("that shit broke")).toBe(true);
    expect(hasUnbleepedProfanity("kick some fucking task")).toBe(true); // inflection
    expect(hasUnbleepedProfanity("shitty situation")).toBe(true); // compound
    expect(hasUnbleepedProfanity("s*** happened")).toBe(false);
    expect(hasUnbleepedProfanity("try again, dammit")).toBe(false); // mild, allowed
    expect(PROFANITY_DENYLIST).toContain("shit");
  });
});

describe("voice catalog — natural case, caps via CSS (FR-20)", () => {
  it("no variant is stored in shouty ALL-CAPS", () => {
    for (const [key, variants] of entries) {
      for (const v of variants) {
        // Must contain a lowercase letter…
        expect(/[a-z]/.test(v), `key "${key}" variant "${v}" is ALL-CAPS`).toBe(
          true,
        );
        // …and must not stack consecutive ALL-CAPS words (catches "ADD IT now").
        expect(
          /[A-Z]{2,}\s+[A-Z]{2,}/.test(v),
          `key "${key}" variant "${v}" has consecutive ALL-CAPS words`,
        ).toBe(false);
      }
    }
  });
});

describe("error-code → voice mapping (AD-8)", () => {
  // The full server ErrorCode set (lib/http) plus the client wrapper's UNKNOWN.
  const CODES = [
    "VALIDATION_ERROR",
    "INVALID_JSON",
    "NOT_FOUND",
    "INTERNAL",
    "UNKNOWN",
  ] as const;

  it("maps every error code to a real catalog key", () => {
    for (const code of CODES) {
      const key = ERROR_CODE_COPY[code];
      expect(key, `code "${code}"`).toBeDefined();
      expect(VOICE_CATALOG[key], `code "${code}" → key "${key}"`).toBeDefined();
    }
  });

  it("has no extra/unknown error codes", () => {
    expect(Object.keys(ERROR_CODE_COPY).sort()).toEqual([...CODES].sort());
  });
});

describe("voice catalog — control labels stay usable as accessible names", () => {
  // These keys render as button labels; in Story 3.3 the visible (voiced) text
  // becomes the accessible name (WCAG 2.5.3). Rotating names must stay short +
  // single-line so they read as clear action names (FR-19/FR-20).
  const CONTROL_LABEL_KEYS: VoiceKey[] = [
    "addButton",
    "editButton",
    "saveButton",
    "editCancelButton",
    "deleteButton",
    "deleteConfirmButton",
    "deleteCancelButton",
    "retryButton",
    "dismissButton",
  ];

  it("every control-label variant is concise (<= 40 chars) and single-line", () => {
    for (const key of CONTROL_LABEL_KEYS) {
      for (const v of VOICE_CATALOG[key]) {
        expect(v.length, `key "${key}" variant "${v}"`).toBeLessThanOrEqual(40);
        expect(v.includes("\n"), `key "${key}" variant "${v}"`).toBe(false);
      }
    }
  });
});

describe("voice catalog — snapshot", () => {
  it("matches the committed catalog snapshot", () => {
    expect(VOICE_CATALOG).toMatchSnapshot();
  });
});
