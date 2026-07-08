import type { VoiceKey } from "./catalog";

// Deterministic rotation (AD-9 / FR-16): pure selection with an INJECTED RNG so
// it's fully testable and reproducible. No `Math.random` in here — the provider
// supplies the RNG at runtime.

/**
 * Pick the next variant index in `[0, count)`.
 * - `count <= 1` → `0`.
 * - Otherwise returns an index **≠ `lastIndex`** (no back-to-back repeat),
 *   chosen from the other `count − 1` indices via `rng()` (∈ `[0, 1)`).
 * - `lastIndex` null / out-of-range → treated as "no previous" (any index).
 * All indices remain reachable over many draws.
 */
export function nextVariantIndex(
  count: number,
  lastIndex: number | null,
  rng: () => number,
): number {
  if (count <= 1) return 0;
  const candidates: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i !== lastIndex) candidates.push(i);
  }
  // candidates is never empty here (count >= 2).
  const pick = Math.min(
    candidates.length - 1,
    Math.floor(rng() * candidates.length),
  );
  return candidates[pick] as number;
}

export interface RotationController {
  /** Pick + record the next variant index for `key`, excluding that key's
   *  previous pick. Used for load-time selection + transient surfaces so
   *  showings of a key vary across the app. */
  pick(key: VoiceKey, count: number): number;
  /** Pick the next index excluding a caller-supplied `current` index — for an
   *  interactive control re-rolling its OWN label, so it never repeats the
   *  variant that surface is currently showing (FR-16, per-surface). Does not
   *  touch per-key state. */
  pickExcluding(current: number | null, count: number): number;
}

/** One controller owns per-key `lastIndex` state (AD-9: the voice provider holds
 *  a single instance). Pure aside from the injected `rng`. */
export function createRotationController(rng: () => number): RotationController {
  const last: Partial<Record<VoiceKey, number>> = {};
  return {
    pick(key, count) {
      const index = nextVariantIndex(count, last[key] ?? null, rng);
      last[key] = index;
      return index;
    },
    pickExcluding(current, count) {
      return nextVariantIndex(count, current, rng);
    },
  };
}
