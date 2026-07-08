import { describe, it, expect } from "vitest";
import {
  nextVariantIndex,
  createRotationController,
} from "@/lib/voice/rotation";

// Deterministic seeded PRNG (mulberry32) — no Math.random, so sequences are
// reproducible.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("nextVariantIndex (pure selector)", () => {
  it("count <= 1 always returns 0", () => {
    const rng = mulberry32(1);
    expect(nextVariantIndex(1, null, rng)).toBe(0);
    expect(nextVariantIndex(0, null, rng)).toBe(0);
    expect(nextVariantIndex(1, 0, rng)).toBe(0);
  });

  it("never returns lastIndex when count > 1", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const last = i % 5;
      const next = nextVariantIndex(5, last, rng);
      expect(next).not.toBe(last);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(5);
    }
  });

  it("keeps all indices reachable over many draws", () => {
    const rng = mulberry32(7);
    const seen = new Set<number>();
    let last: number | null = null;
    for (let i = 0; i < 500; i++) {
      last = nextVariantIndex(5, last, rng);
      seen.add(last);
    }
    expect(seen).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("is deterministic given the same seed", () => {
    const draw = (seed: number) => {
      const rng = mulberry32(seed);
      const out: number[] = [];
      let last: number | null = null;
      for (let i = 0; i < 20; i++) {
        last = nextVariantIndex(5, last, rng);
        out.push(last);
      }
      return out;
    };
    expect(draw(123)).toEqual(draw(123));
    expect(draw(123)).not.toEqual(draw(999)); // different seed → different sequence
  });

  it("strictly alternates with exactly 2 variants", () => {
    const rng = mulberry32(99);
    // With 2 variants the only non-repeating choice is the other index.
    expect(nextVariantIndex(2, 0, rng)).toBe(1);
    expect(nextVariantIndex(2, 1, rng)).toBe(0);
    // Driven across many draws, it must ping-pong 0,1,0,1,…
    let last = nextVariantIndex(2, null, rng);
    for (let i = 0; i < 50; i++) {
      const next = nextVariantIndex(2, last, rng);
      expect(next).toBe(last === 0 ? 1 : 0);
      last = next;
    }
  });

  it("treats null / out-of-range lastIndex as no-previous (any in-range index)", () => {
    const rng = mulberry32(3);
    for (const last of [null, -1, 99]) {
      const next = nextVariantIndex(4, last, rng);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(4);
    }
  });
});

describe("createRotationController (per-key state)", () => {
  it("never repeats a key's variant back-to-back", () => {
    const ctrl = createRotationController(mulberry32(11));
    let prev = -1;
    for (let i = 0; i < 500; i++) {
      const next = ctrl.pick("addButton", 5);
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it("tracks keys independently", () => {
    // Two keys interleaved: each must still never repeat ITS OWN last pick.
    const ctrl = createRotationController(mulberry32(5));
    let lastA = -1;
    let lastB = -1;
    for (let i = 0; i < 300; i++) {
      const a = ctrl.pick("addButton", 5);
      expect(a).not.toBe(lastA);
      lastA = a;
      const b = ctrl.pick("deleteButton", 5);
      expect(b).not.toBe(lastB);
      lastB = b;
    }
  });

  it("keeps all variants reachable for a key", () => {
    const ctrl = createRotationController(mulberry32(9));
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(ctrl.pick("emptyState", 5));
    expect(seen).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("is deterministic given the same seed", () => {
    const run = () => {
      const ctrl = createRotationController(mulberry32(77));
      return Array.from({ length: 20 }, () => ctrl.pick("addButton", 5));
    };
    expect(run()).toEqual(run());
  });

  it("pickExcluding never returns the caller-supplied current index", () => {
    const ctrl = createRotationController(mulberry32(31));
    for (let i = 0; i < 500; i++) {
      const current = i % 5;
      expect(ctrl.pickExcluding(current, 5)).not.toBe(current);
    }
  });

  it("pickExcluding does not touch per-key state (independent of pick)", () => {
    // Deterministic proof: two controllers with the same seed produce the same
    // pick() sequence even if one interleaves pickExcluding() calls (which must
    // not consume/alter per-key state)… they DO share the RNG though, so instead
    // assert pickExcluding leaves the per-key chain's no-repeat intact.
    const ctrl = createRotationController(mulberry32(8));
    let lastPick = ctrl.pick("addButton", 5);
    for (let i = 0; i < 200; i++) {
      ctrl.pickExcluding(2, 5); // arbitrary surface-local rerolls
      const next = ctrl.pick("addButton", 5);
      expect(next).not.toBe(lastPick); // per-key no-repeat still holds
      lastPick = next;
    }
  });

  it("per-surface reroll never repeats a surface's own label even when another surface advanced the shared key state (the review bug)", () => {
    // Repro of the fixed FR-16 bug: surface A shows index 2; surface B (same key)
    // advances the shared per-key last; A's reroll must still exclude its OWN 2.
    const ctrl = createRotationController(mulberry32(4));
    let aShown = 2;
    for (let i = 0; i < 300; i++) {
      ctrl.pick("deleteButton", 5); // surface B churns the shared per-key state
      const aNext = ctrl.pickExcluding(aShown, 5); // surface A rerolls its own label
      expect(aNext).not.toBe(aShown);
      aShown = aNext;
    }
  });
});
