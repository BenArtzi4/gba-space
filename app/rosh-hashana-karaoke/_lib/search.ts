// Hebrew-aware search normalisation.
//
// Hebrew text in the wild is punctuated inconsistently: niqqud may or may not
// be present, and abbreviations are written with a real gershayim (״) or with
// an ASCII double quote depending on who typed them. Without normalising both
// sides of the comparison, "צהל" fails to match "צה״ל" and "שיר" fails to match
// "שִׁיר" — which reads as a broken search rather than a strict one.

/** Combining marks: niqqud, cantillation, and the like (U+0591–U+05C7). */
const HEBREW_MARKS = /[֑-ׇ]/g;
/** Geresh/gershayim plus the ASCII and curly quotes people type instead. */
const QUOTES = /[׳״'"‘’“”]/g;
/** Maqaf and the dash family. */
const DASHES = /[־\-‐-―]/g;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(HEBREW_MARKS, "")
    .replace(QUOTES, "")
    .replace(DASHES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the query is purely digits — meaning "jump to this song number". */
export function isNumericQuery(query: string): boolean {
  return /^\d+$/.test(query.trim());
}
