// Rosh Hashana copy for the karaoke page. Hebrew year תשפ״ז (5787) begins at
// sundown on 11 Sept 2026.
//
// IMPORTANT: every greeting here is a *Rosh Hashana* greeting. "גמר חתימה טובה"
// and "צום קל" belong to Yom Kippur — the first only applies after the first
// night of Rosh Hashana, and the second wishes an easy fast on what is a feast
// day. Neither belongs on this page.

export const HEBREW_YEAR = "תשפ״ז";

/** Rotating header greetings. One is chosen per page load. */
export const GREETINGS: readonly string[] = [
  "שנה טובה ומתוקה",
  "כתיבה וחתימה טובה",
  "שנת בריאות ואושר",
  "חג שמח ושנה נפלאה",
  "שנת שפע והצלחה",
  "שנה של התחלות חדשות",
  "שנת שלום ושלווה",
  "שנה של בשורות טובות",
];

export const GREETING_EMOJI = "🍯";

/**
 * From the piyyut "אחות קטנה" (אברהם חזן גירונדי, ספרד, המאה ה-13), sung on
 * the eve of Rosh Hashana.
 */
export const HERO_LINE = "תִּכְלֶה שָׁנָה וְקִלְלוֹתֶיהָ, תָּחֵל שָׁנָה וּבִרְכוֹתֶיהָ";

export interface Siman {
  /** Emoji, or the literal string "rimon" for the inline SVG pomegranate. */
  icon: string;
  label: string;
  /** The traditional wish — shown as a tooltip. */
  wish: string;
}

/**
 * The universally recognised core only. The full seven-siman seder is the
 * Sephardi/Mizrahi custom and the family minhag here isn't known. Note that
 * Unicode has no pomegranate and no shofar emoji — hence the inline SVG and
 * the postal horn, which is the accepted stand-in.
 */
export const SIMANIM: readonly Siman[] = [
  { icon: "🍎", label: "תפוח בדבש", wish: "שתחדש עלינו שנה טובה ומתוקה" },
  { icon: "rimon", label: "רימון", wish: "שירבו זכויותינו כרימון" },
  { icon: "🍯", label: "דבש", wish: "שתהא השנה מתוקה" },
  { icon: "🥯", label: "חלה עגולה", wish: "שנה שמתגלגלת בשלום" },
  { icon: "📯", label: "שופר", wish: "יום תרועה יהיה לכם" },
  { icon: "🐟", label: "ראש דג", wish: "שנהיה לראש ולא לזנב" },
];

export const FACT_LABEL = "הידעתם?";

/**
 * Rotating trivia — one is chosen per page load, same as the greeting. Stored
 * without the "הידעתם?" prefix, which the component renders as a styled label
 * so it stays visually consistent across every entry.
 */
export const FACTS: readonly string[] = [
  "בתורה לא מופיע השם ״ראש השנה״, אלא החג מצוין כ״יום תרועה״ או ״זכרון תרועה״.",
  "ראש השנה הוא החג היחיד שנחגג במשך יומיים מלאים גם בארץ ישראל, ומוגדר בהלכה כ״יומא אריכתא״ (יום ארוך אחד).",
  "על פי ההלכה אסור להכין שופר מקרן של פרה, כדי שלא להזכיר את ״חטא העגל״ ביום הדין.",
  "בא׳ בתשרי אנחנו לא חוגגים את היום הראשון של בריאת העולם, אלא את היום השישי שבו נבראו אדם וחוה.",
  "מנהג ה״תשליך״, שבו מתפללים ליד מקור מים כדי להשליך את החטאים, התפתח בגרמניה רק בסביבות המאה ה-15.",
  "המנהג לטבול דווקא תפוח בדבש התבסס בקרב יהודי אשכנז בימי הביניים, בעוד שעדות אחרות נהגו להשתמש בסוכר, סילאן או ריבות.",
  "הסיבה שאוכלים רימון בראש השנה מבוססת על האמונה המסורתית שכל רימון מכיל בדיוק 613 גרעינים, כנגד תרי״ג מצוות.",
  "במהלך תפילות החג בבית הכנסת נהוג לתקוע בשופר 100 פעמים (ויש קהילות הנוהגות לתקוע 101 פעמים).",
  "אכילת ראש של דג או כבש בסעודת החג נועדה לסמל את הברכה ״שנהיה לראש ולא לזנב״, המסמלת מנהיגות והובלה.",
  "ראש השנה הוא החג היהודי היחיד שחל בתחילת החודש (א׳ בתשרי), בדיוק כאשר הירח ״מתכסה״ וכמעט ואינו נראה בשמיים.",
];

/** The families celebrating together this year. */
export const FAMILIES_GREETING =
  "שנה טובה למשפחת נאור · נחום · קומסקי · נחמד · בן ארצי";

/** The closing blessing. */
export const CLOSING_BLESSING = `שנה טובה ומתוקה לכולנו · ${HEBREW_YEAR}`;
