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
  "לשנה טובה תיכתבו ותיחתמו",
  "שנה טובה ומבורכת",
  "כתיבה וחתימה טובה",
  "תזכו לשנים רבות",
];

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

/**
 * Rotating trivia. Hedges ("מסורת מספרת", "יש הנמנעים") are deliberate — the
 * underlying sources disagree, and the hedge is what keeps these accurate.
 */
export const FACTS: readonly string[] = [
  "השנה, תשפ״ז, היום הראשון של החג חל בשבת — ולכן לא תוקעים בשופר ביום הראשון, אלא רק ביום השני.",
  "הצירוף ״ראש השנה״ מופיע בתנ״ך פעם אחת בלבד, בספר יחזקאל — ודווקא שם הוא לא מתכוון לחג שאנחנו חוגגים. בתורה החג נקרא ״יום תרועה״.",
  "תשרי הוא בכלל החודש השביעי. ספירת החודשים בתורה מתחילה בניסן — ובכל זאת השנה מתחילה בתשרי.",
  "זה החג היחיד שנחגג יומיים גם בארץ וגם בחו״ל. חכמים ראו בשני הימים יחידה אחת וקראו להם ״יומא אריכתא״ — יום אחד ארוך.",
  "ראש השנה לעולם לא חל בימים ראשון, רביעי ושישי. הכלל נקרא ״לא אד״ו ראש״.",
  "ראש השנה הוא החג היחיד שחל בראש חודש, כשהירח מתחדש וכמעט אינו נראה — ״תקעו בחודש שופר, בכסה ליום חגנו״.",
  "נהוג לשמוע מאה קולות שופר בכל יום של החג.",
  "המסורת מספרת שברימון יש תרי״ג גרגירים כמניין המצוות — אבל בפועל המספר משתנה מרימון לרימון. סמל יפה, לא נתון בוטני.",
  "הדבש כשר לאכילה למרות שהדבורה עצמה אינה כשרה — אחד המקרים היחידים מסוגם בהלכה.",
  "מנהג שליחת איגרות ״שנה טובה״ התחיל באשכנז כבר במאה ה-14. הגלויה המודפסת הצטרפה רק במאה ה-19.",
  "ללחן המוכר של ״ונתנה תוקף״ אין שורשים עתיקים — יאיר רוזנבלום כתב אותו ב-1990 לזכר בני קיבוץ בית השיטה שנפלו במלחמת יום הכיפורים.",
];

/** The families celebrating together this year. */
export const FAMILIES_GREETING =
  "שנה טובה למשפחת נאור · נחום · קומסקי · נחמד · בן ארצי";

/** The closing blessing. */
export const CLOSING_BLESSING = `שנה טובה ומתוקה לכולנו · ${HEBREW_YEAR}`;
