// Profanity in copy is always bleeped (FR-18): stored strings render strong
// profanity as `F***`, `S***`, etc. This denylist is the set of uncensored
// strong tokens that must NEVER appear verbatim in the catalog. Mild words the
// voice guide keeps (e.g. "dammit") are intentionally NOT listed.
//
// Pure + exported so the catalog test guards FR-18, and Story 3.3 can reuse it
// as a lint guard against un-bleeped hardcoded copy.

export const PROFANITY_DENYLIST: readonly string[] = [
  "fuck",
  "shit",
  "cunt",
  "asshole",
  "bitch",
  "bastard",
  "dick",
  "piss",
];

// Leading word-boundary + stem (NO trailing boundary) so inflected/compound
// forms are caught too: `fucking`, `shitty`, `bitches`, `dickhead`. A bleep
// guard should err toward catching — a rare false positive (flagging clean copy)
// is far safer than shipping un-bleeped profanity.
const DENY_RE = new RegExp(`\\b(?:${PROFANITY_DENYLIST.join("|")})`, "i");

/** True if `text` contains an uncensored strong-profanity token or an inflection
 *  of one (case-insensitive). Bleeped forms like `s***` do not match. */
export function hasUnbleepedProfanity(text: string): boolean {
  return DENY_RE.test(text);
}
