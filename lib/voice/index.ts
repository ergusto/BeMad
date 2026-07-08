// Voice pack: the centralized Mr. Torgue copy catalog (keyed arrays of ~5
// variants) + the client-side error-code→copy map + the profanity bleep guard
// (Story 3.1, AD-8/FR-14/15/18/19/20). The deterministic rotation selector
// (Story 3.2, AD-9) and the client voice provider + surface wiring (Story 3.3)
// build on this pure-data module.
export * from "./catalog";
export * from "./bleep";
