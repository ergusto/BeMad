"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { VOICE_CATALOG, type VoiceKey } from "./catalog";
import { createRotationController, type RotationController } from "./rotation";

// One client-side voice provider owns the per-key rotation state (AD-9). Story
// 3.3 wraps the app in <VoiceProvider> and consumes copy via useVoice(). Copy
// that conveys current state/selection is NOT routed through this (FR-17).

const VoiceContext = createContext<RotationController | null>(null);

export function VoiceProvider({
  children,
  rng = Math.random,
}: {
  children: ReactNode;
  /** Injectable for deterministic tests; defaults to Math.random at runtime. */
  rng?: () => number;
}) {
  // One controller for the app's lifetime; the lazy initializer runs once.
  const [controller] = useState(() => createRotationController(rng));
  return (
    <VoiceContext.Provider value={controller}>{children}</VoiceContext.Provider>
  );
}

/**
 * Returns the current voiced variant for `key` plus a `reroll` for interactive
 * controls (call on activation, FR-16). SSR-safe: renders variant 0 on the
 * server + first client paint, then rotates in a mount effect (post-hydration,
 * no mismatch — AC #2).
 */
export function useVoice(key: VoiceKey): { text: string; reroll: () => void } {
  const controller = useContext(VoiceContext);
  if (!controller) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  const variants = VOICE_CATALOG[key];
  const count = variants.length;
  const [index, setIndex] = useState(0);

  // Post-hydration first rotation (client-only). setState-in-effect is the
  // intended pattern here: rotating during render would randomize the SSR/first
  // paint and cause a hydration mismatch (AC #2). This deliberately swaps
  // variant 0 → a rotated variant after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration randomization by design
    setIndex(controller.pick(key, count));
  }, [controller, key, count]);

  // Reroll excludes THIS surface's current index so an interactive control never
  // repeats its own visible label (FR-16), independent of other surfaces sharing
  // the key.
  const reroll = () =>
    setIndex((current) => controller.pickExcluding(current, count));

  return { text: variants[index] ?? variants[0] ?? "", reroll };
}
