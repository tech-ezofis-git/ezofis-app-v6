import dayjs, { type Dayjs } from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

// Date shapes found in OCR results and imported data, tried in order (strict).
// Numeric dates are read day first (15/10/2026 = 15 Oct), as on Indian and
// European documents; month-first is only tried when day-first can't be a
// date (10/15/2026).
const DATE_FORMATS = [
  'YYYY/MM/DD',
  'YYYY.MM.DD',
  'YYYYMMDD',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'DD-MM-YYYY',
  'D-M-YYYY',
  'DD.MM.YYYY',
  'D.M.YYYY',
  'DD/MM/YY',
  'DD-MM-YY',
  'DD.MM.YY',
  'DD-MMM-YYYY',
  'D-MMM-YYYY',
  'DD MMM YYYY',
  'D MMM YYYY',
  'D MMMM YYYY',
  'MMM D, YYYY',
  'MMMM D, YYYY',
  'MMM D YYYY',
  'MMMM D YYYY',
  'MM/DD/YYYY',
  'M/D/YYYY',
]

const TIME_FORMATS = ['HH:mm', 'HH:mm:ss', 'hh:mm A', 'h:mm A', 'hh:mm a']

const DATE_TIME_FORMATS = DATE_FORMATS.flatMap((date) =>
  TIME_FORMATS.map((time) => `${date} ${time}`),
)

/**
 * Reads a date typed or extracted in any common shape ("15/10/2026",
 * "15.10.2026", "October 15th, 2026", ISO …). Returns null when the text
 * isn't a date at all ("Net 30", "N/A", "Invalid Date"), so callers can leave
 * the field empty instead of showing "Invalid Date".
 */
export const parseFlexibleDate = (raw: unknown): Dayjs | null => {
  if (raw instanceof Date) return dayjs(raw).isValid() ? dayjs(raw) : null
  const text = String(raw ?? '')
    .trim()
    .replace(/(\d)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
  if (!text || !/\d/.test(text)) return null

  // ISO dates and timestamps ("2026-10-15", "2026-10-15T08:42:29Z").
  if (/^\d{4}-\d{1,2}-\d{1,2}([T ]|$)/.test(text)) {
    const iso = dayjs(text)
    return iso.isValid() ? iso : null
  }

  const parsed = dayjs(text, [...DATE_FORMATS, ...DATE_TIME_FORMATS], true)
  return parsed.isValid() ? parsed : null
}

/** "YYYY-MM-DD" for a readable date, else null. */
export const toIsoDate = (raw: unknown): string | null =>
  parseFlexibleDate(raw)?.format('YYYY-MM-DD') ?? null
