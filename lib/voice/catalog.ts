import type { ErrorCode } from "@/lib/http";

// The single source of user-facing copy (AD-8 / FR-14). Each key maps to ~5
// semantically-identical Mr. Torgue variants (FR-15), profanity bleeped (FR-18),
// every variant unambiguously conveying its action (FR-19).
//
// Casing: stored in NATURAL case. The LOUD ALL-CAPS look is applied via CSS
// `text-transform` in Story 3.3 (FR-20) so assistive tech reads normally — do
// NOT store shouty ALL-CAPS strings here. The `deleteCancelButton` variants are
// deliberately lowercase "quiet aside" beats and must be exempt from that
// uppercasing in 3.3.
//
// Scope boundary (AD-8): this catalog is the ONLY home for the voice. API field
// names, error codes, logs, and identifiers stay plain. Rotation (Story 3.2) and
// wiring/provider (Story 3.3) live elsewhere — this module is pure data.

export type VoiceKey =
  | "appTitle"
  | "addPlaceholder"
  | "addButton"
  | "emptyState"
  | "loadingState"
  | "savingPending"
  | "editButton"
  | "saveButton"
  | "editCancelButton"
  | "deleteButton"
  | "deleteConfirmPrompt"
  | "deleteConfirmButton"
  | "deleteCancelButton"
  | "retryButton"
  | "dismissButton"
  | "genericError"
  | "networkError"
  | "notFoundError"
  | "validationEmpty"
  | "validationTooLong"
  | "completionToast"
  | "allTasksComplete";

// Record<VoiceKey, …> makes a missing key a compile error (exhaustiveness).
export const VOICE_CATALOG: Record<VoiceKey, readonly string[]> = {
  appTitle: [
    "BeMad — get s*** done, explosively",
    "BeMad — your tasks, your carnage",
    "BeMad — the loudest todo list alive",
    "BeMad — write it, crush it, repeat",
    "BeMad — task annihilation station",
  ],
  addPlaceholder: [
    "Type a task. Any task. Make it count.",
    "What are we destroying today?",
    "Drop a task in here, champion.",
    "Name your next victim (it's a task).",
    "What needs doing? Say it loud.",
  ],
  addButton: [
    "Add it!!!",
    "Make it so!",
    "Slam it on the list",
    "Lock and load",
    "Incoming task!",
  ],
  emptyState: [
    "Your list is empty and that is beautiful. Nothing to do = total freedom.",
    "No tasks. Nothing. Zilch. You magnificent machine.",
    "The list is clear. Go enjoy your hard-earned chaos.",
    "Empty list detected. Threat level: zero. Nice.",
    "Nothing here yet. Type something above and we ride.",
  ],
  loadingState: [
    "Loading your tasks at maximum velocity…",
    "Revving the engines…",
    "Summoning your tasks from the void…",
    "Hang on, pulling the goods…",
    "Spinning up the task cannon…",
  ],
  savingPending: [
    "Saving this beast…",
    "Locking it in…",
    "Committing to the carnage…",
    "Making it official…",
    "Bolting it down…",
  ],
  editButton: [
    "Change it",
    "Fix it up",
    "Reword this beast",
    "Tweak it",
    "Patch it",
  ],
  saveButton: [
    "Lock it in",
    "Save the carnage",
    "Make it official",
    "Done, save it",
    "Seal the deal",
  ],
  editCancelButton: [
    "Nevermind that",
    "Back it out",
    "Leave it be",
    "Scrap the change",
    "Never happened",
  ],
  deleteButton: [
    "Obliterate",
    "Annihilate",
    "Blow it up",
    "Vaporize",
    "Send it to the void",
  ],
  deleteConfirmPrompt: [
    "This task is gone forever. No regrets. Delete it?",
    "You sure? This one ain't coming back.",
    "Point of no return. Wipe this task?",
    "Last chance — obliterate this for good?",
    "Deleting is forever. You got the guts?",
  ],
  deleteConfirmButton: [
    "Yes, annihilate",
    "Do it",
    "No mercy",
    "Detonate it",
    "Gone forever",
  ],
  // Deliberate lowercase "quiet aside" beat — must stay lowercase (no uppercase
  // styling in Story 3.3).
  deleteCancelButton: [
    "uh, nevermind",
    "wait, no",
    "keep it",
    "on second thought…",
    "abort abort",
  ],
  retryButton: [
    "Try again, dammit",
    "Reload and fire",
    "One more time",
    "Go again",
    "Hit it again",
  ],
  dismissButton: [
    "Shrug it off",
    "Got it, move on",
    "Dismiss the wreckage",
    "Fine, whatever",
    "Clear it",
  ],
  genericError: [
    "Something blew up — and not the fun way. Try again?",
    "Welp. That didn't work. Let's go again.",
    "Error! But we don't quit. Retry?",
    "That move misfired. Give it another shot.",
    "S*** happened. Reload the cannon and retry.",
  ],
  networkError: [
    "The internet betrayed us. Your task didn't save. Retry?",
    "Connection went boom. Nothing saved. Try again.",
    "Lost the signal, lost the save. Hit retry.",
    "The server ghosted us. Your change didn't stick.",
    "No save. The network's being a coward. Go again.",
  ],
  notFoundError: [
    "That task pulled a disappearing act. It's already gone.",
    "Can't find it — someone already blew it up.",
    "Vanished. That task doesn't exist anymore.",
    "Ghost task! It's not here to obliterate.",
    "Too late — that one already left the battlefield.",
  ],
  validationEmpty: [
    "Say something! An empty task is no task at all.",
    "Nothing to add — give it some words, champion.",
    "Whoa, blank task. Type an actual task first.",
    "The void can't be a task. Write something.",
    "Empty input detected. Feed it a real task.",
  ],
  validationTooLong: [
    "Whoa, too much power — trim that task down a bit.",
    "That's a novel, not a task. Shorten it.",
    "Too long! Even we have limits. Cut it back.",
    "Easy, wordsmith — that task's over the line. Trim it.",
    "That task's too huge to contain. Make it shorter.",
  ],
  completionToast: [
    "Boom! Another one down. You absolute legend.",
    "Task obliterated. The crowd goes wild!",
    "Yes!!! One less thing between you and glory.",
    "That's how it's done, champion.",
    "Kaboom! Chalk up another win.",
  ],
  allTasksComplete: [
    "Every. Single. Task. Destroyed. Go treat yourself, champion.",
    "List cleared. You are unstoppable.",
    "Total victory. Nothing left standing.",
    "Flawless. The list never stood a chance.",
    "All done! Cue the explosions. 🎆",
  ],
};

// Client-side bridge from a plain server `error.code` (AD-4) to a voiced key
// (AD-8). Story 3.3 uses this to voice errors ON THE CLIENT; the server keeps
// returning plain codes/messages. `"UNKNOWN"` is the client wrapper's fallback
// code (lib/todos-client TodoApiError) for timeouts/network failures.
export const ERROR_CODE_COPY: Record<ErrorCode | "UNKNOWN", VoiceKey> = {
  VALIDATION_ERROR: "genericError",
  INVALID_JSON: "genericError",
  NOT_FOUND: "notFoundError",
  INTERNAL: "genericError",
  UNKNOWN: "networkError",
};
