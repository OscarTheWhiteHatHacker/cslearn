/**
 * Application-wide constants.
 * All magic numbers and configuration values should be defined here.
 */

/* ─── Character / Token Limits ─── */

/** Maximum character length for a single question */
export const MAX_QUESTION_CHARS = 3000

/** Maximum tokens for AI-generated content (questions, lessons) */
export const MAX_TOKENS = 2500

/** Maximum character length for teacher feedback */
export const MAX_FEEDBACK_CHARS = 2000

/** Minimum password length */
export const MIN_PASSWORD_LENGTH = 8

/** Maximum number of questions per set */
export const MAX_QUESTIONS_PER_SET = 20

/* ─── Polling / Real-time ─── */

/** Polling interval in milliseconds for live-updating pages */
export const POLLING_INTERVAL_MS = 8000

/** Debounce delay for auto-save feedback in milliseconds */
export const FEEDBACK_DEBOUNCE_MS = 2000

/* ─── Pagination ─── */

/** Number of students per page on the teacher dashboard */
export const STUDENTS_PER_PAGE = 10

/** Number of items per page for general pagination */
export const ITEMS_PER_PAGE = 10

/* ─── UI / Layout ─── */

/** Max width of content area in pixels */
export const MAX_CONTENT_WIDTH = 1280

/** Header height in pixels */
export const HEADER_HEIGHT = 64

/** Duration of animations in milliseconds */
export const ANIMATION_DURATION_MS = 200

/* ─── API ─── */

/** Default timeout for API fetch requests in milliseconds */
export const API_TIMEOUT_MS = 10000

/** Maximum number of login attempts before rate limiting */
export const MAX_LOGIN_ATTEMPTS = 5

/* ─── Password Validation ─── */

/** Password must contain at least one uppercase letter */
export const PASSWORD_REQUIRES_UPPERCASE = true

/** Password must contain at least one lowercase letter */
export const PASSWORD_REQUIRES_LOWERCASE = true

/** Password must contain at least one digit */
export const PASSWORD_REQUIRES_DIGIT = true

/** Password must contain at least one special character */
export const PASSWORD_REQUIRES_SPECIAL = true

/* ─── Scoring ─── */

/** Ratio threshold for "good" score (≥ 70%) */
export const SCORE_GOOD_THRESHOLD = 0.7

/** Ratio threshold for "needs work" score (≥ 40%) */
export const SCORE_NEEDS_WORK_THRESHOLD = 0.4

/* ─── Dark Mode ─── */

/** Local storage key for persisting dark mode preference */
export const DARK_MODE_STORAGE_KEY = 'cslearn-theme'
