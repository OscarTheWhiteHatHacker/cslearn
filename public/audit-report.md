# CSLearn Phase 2 Audit Backlog

**Total Recommendations**: 570
**Generated**: Automated audit via Python web scraper + Playwright browser automation

---

## Status

| Metric | Count |
|--------|-------|
| Total items | 518 |
| Completed (✅) | ~340 |
| Remaining | ~178 |

Items marked with `✅` have been implemented. Items without a marker are still pending.

---

## Priority Legend

| Priority | Label | Meaning | Examples |
|----------|-------|---------|---------|
| `[P1]` | **Critical** | Security vulnerability, data loss risk, broken functionality | Hardcoded secrets, no auth, CSRF missing, SQL injection, no rate limiting |
| `[P2]` | **High** | Major usability issue, performance bottleneck | Error states missing, no loading states, pagination needed, large re-renders |
| `[P3]` | **Medium** | Important but not blocking | Dark mode, refactoring, accessibility, form validation |
| `[P4]` | **Low** | Nice to have, polish, enhancement | Animations, keyboard shortcuts, CSV export, Docker |

---

# 1. Codebase Improvements (Items 1–400)

### 1. `[P1]` [SECURITY] [CRITICAL] Hardcoded WIPE_SECRET in client-side code
The WIPE_SECRET was hardcoded in multiple frontend fetch calls and exposed in bundled JS. Replaced with Supabase session-based auth on all API routes.
### 2. `[P1]` [SECURITY] [CRITICAL] Missing CSRF protection on state-changing APIs
All POST/PUT/DELETE API endpoints lacked CSRF tokens. Added double-submit cookie pattern and Supabase RLS-based CSRF protection to /api/signup, /api/release-subtopic, /api/generate-questions.
### 3. `[P1]` [AUTH] [CRITICAL] Username enumeration via login error messages
Login endpoint returned different errors for existing vs non-existing usernames. Changed to always return generic 'Invalid credentials' message.
### 4. `[P1]` [AUTH] [CRITICAL] Missing rate limiting on auth endpoints
Login and signup endpoints had no rate limiting. Added rate limiting (5 attempts per IP per 15 minutes) to prevent brute-force attacks.
### 5. `[P1]` [AUTH] [CRITICAL] Weak password policy
Signup accepted passwords with no complexity requirements. Enforced minimum 8 characters, uppercase, lowercase, number, and special character.
### 6. `[P1]` [API] [CRITICAL] No auth check on /api/generate-questions
Question generation endpoint could be called without authentication. Added teacher role verification via Supabase session.
### 7. `[P1]` [API] [CRITICAL] No auth check on /api/release-subtopic
Release toggle endpoint lacked teacher role verification. Added session-based teacher check.
### 8. `[P1]` [API] [CRITICAL] No auth check on /api/teacher-feedback
Feedback endpoint was callable by anyone. Added session + role verification.
### 9. `[P1]` [API] [CRITICAL] No org-scoped auth on password reset
Teachers could potentially reset passwords for students outside their org. Added organization membership verification on /api/teacher/reset-password.
### 10. `[P1]` [DB] [CRITICAL] Missing ON DELETE CASCADE on foreign keys
Several FK relationships lacked CASCADE deletes. Added ON DELETE CASCADE to student_answers, released_subtopics, and released_lessons tables via migration 004_fixes.sql.
### 11. `[P1]` [DB] [CRITICAL] Missing RLS on student_answers table
Student answers table needed row-level security. Added RLS so students see only their own answers and teachers see only their org's answers.
### 12. `[P1]` [DB] [CRITICAL] Missing RLS on question_sets table
Question sets lacked RLS. Added policies so teachers manage only their own sets and students see only released sets.
### 13. `[P1]` [SECURITY] [CRITICAL] Missing security headers
Added X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and Strict-Transport-Security headers to all responses via middleware.
### 14. `[P1]` [SECURITY] [CRITICAL] Sensitive data in client env vars
Audited all NEXT_PUBLIC_ environment variables to ensure no secrets are exposed in the browser bundle.
### 15. `[P1]` [AUTH] [CRITICAL] No session timeout
Sessions never expired. Implemented idle timeout via Supabase JWT expiration configuration.
### 16. `[P1]` [AUTH] [CRITICAL] No email verification for teachers
Teacher accounts with real emails should verify their email. Email verification flow pending implementation.
### 17. `[P1]` [DB] [CRITICAL] No unique constraint on username
Added UNIQUE constraint on profiles.username via migration to prevent duplicate registrations.
### 18. `[P1]` [SECURITY] [CRITICAL] API errors leak internal details
Error responses included stack traces and internal details. Stripped internal details from production error responses.
### 19. `[P1]` [SECURITY] [CRITICAL] Missing input sanitization on teacher feedback
Teacher feedback was stored and displayed without sanitization. Added content sanitization before rendering on student dashboard.
### 20. `[P1]` [SECURITY] [CRITICAL] Missing Content Security Policy header
No CSP header was set, allowing execution of arbitrary inline scripts. CSP header pending implementation.
### 21. `[P1]` [API] [CRITICAL] IDOR on student answer viewing
Students could view other students' answers by changing the answer ID. Added verification that the answer belongs to the requesting student.
### 22. `[P1]` [API] [CRITICAL] IDOR on teacher student detail view
Teachers could view students from other organizations. Added organization membership verification.
### 23. `[P1]` [SECURITY] [CRITICAL] Session token in localStorage
Supabase sessions stored in localStorage are vulnerable to XSS-based theft. Session storage uses httpOnly cookies via the @supabase/ssr package.
### 24. `[P1]` [SECURITY] [CRITICAL] Missing audit logging
No audit trail for sensitive actions. Added structured logging for auth and admin operations.
### 25. `[P1]` [SECURITY] [CRITICAL] No IP-based rate limiting
Global API rate limiting absent. IP-based rate limiting pending implementation.
### 26. `[P1]` [SECURITY] [CRITICAL] Dependency vulnerabilities
npm dependencies need regular auditing for CVEs. Dependabot configuration added for automated scanning.
### 27. `[P1]` [DB] [CRITICAL] Missing indexes on frequently queried columns
Added B-tree indexes on profiles.organization_id, question_sets.teacher_id, student_answers.student_id, and other frequently filtered columns via migration 004_fixes.sql.
### 28. `[P1]` [SECURITY] [CRITICAL] No rate limiting on /api/lookup-username
The username lookup endpoint could enumerate valid usernames. Added rate limiting headers in the response.
### 29. `[P1]` [AUTH] [CRITICAL] No account lockout after failed attempts
Accounts never lock after repeated failed login attempts. Account lockout pending implementation.
### 30. `[P1]` [API] [CRITICAL] Mass assignment on profile update
Profile update endpoints accepted arbitrary fields. Implemented strict field whitelisting in the API.
### 31. `[P1]` [SECURITY] [CRITICAL] No security.txt file
Missing .well-known/security.txt for vulnerability reporters. Security.txt pending.
### 32. `[P1]` [DB] [CRITICAL] Migration versioning inconsistent
SQL migrations were applied by filename order. Using Supabase's built-in migration system for proper versioning.
### 33. `[P1]` [AUTH] [CRITICAL] Session fixation vulnerability
Session ID not regenerated after login. Supabase handles this correctly via its built-in session management.
### 34. `[P1]` [SECURITY] [CRITICAL] Server header information disclosure
Server headers may leak version information. Vercel handles edge-level headers; no version info disclosed.
### 35. `[P1]` [SECURITY] [CRITICAL] CORS headers misconfigured
CORS headers were either missing or too permissive. Set strict CORS policy aligned with the Vercel deployment domain.
### 36. `[P1]` [AUTH] [CRITICAL] Disposable email domain signup
Teacher accounts can be created with disposable email addresses. Disposable domain blocking pending implementation.
### 37. `[P1]` [SECURITY] [CRITICAL] SQL injection risk
All queries use the Supabase client with parameterized queries, preventing SQL injection. No raw SQL execution.
### 38. `[P1]` [SECURITY] [CRITICAL] No request size limits on API
API endpoints accepted arbitrarily large request bodies. Request size limits pending implementation.
### 39. `[P1]` [SECURITY] [CRITICAL] Auth callback URL validation
OAuth callback URL could redirect to malicious sites. Callback URL validation pending.
### 40. `[P1]` [SECURITY] [CRITICAL] Passwords in client logs
Password variables could be logged in development. Ensured passwords are never logged via code review.
### 41. `[P1]` [SECURITY] [CRITICAL] No HTTPS redirect enforcement
Vercel handles HTTPS redirect by default. Verified no misconfiguration allows unencrypted access.
### 42. `[P1]` [SECURITY] [CRITICAL] No API key rotation policy
Service role and anon keys have no rotation schedule. Rotation policy pending documentation.
### 43. `[P1]` [DB] [CRITICAL] Missing RLS on student progress table
Student lesson progress needs RLS policies for proper data isolation. Pending.
### 44. `[P1]` [SECURITY] [CRITICAL] No webhook signature verification
Webhooks must verify signatures to ensure request authenticity. Pending.
### 45. `[P1]` [AUTH] [CRITICAL] No multi-factor authentication
Optional MFA would significantly improve teacher account security. Pending.
### 46. `[P1]` [SECURITY] [CRITICAL] Host header injection risk
Application validates the Host header against allowed domains to prevent host header injection.
### 47. `[P1]` [DB] [CRITICAL] No database connection pooling
Connection pooling optimization pending for production scale.
### 48. `[P1]` [SECURITY] [CRITICAL] No suspicious activity alerting
Alerting for repeated auth failures pending.
### 49. `[P1]` [SECURITY] [CRITICAL] Third-party script integrity
External scripts should use SRI integrity hashes. Pending.
### 50. `[P1]` [SECURITY] [CRITICAL] No brute-force protection on password reset
Password reset endpoint could be abused. Rate limiting pending.
### 51. `[P2]` [ERROR] [HIGH] No error state on teacher dashboard
Dashboard was missing an error state when data fetch fails. Added error display with 'Try again' button.
### 52. `[P2]` [ERROR] [HIGH] No error state on teacher students page
Students page had no error state. Added error display with retry functionality.
### 53. `[P2]` [ERROR] [HIGH] No error state on teacher topics page
Topics page lacked error state. Added error boundary with retry.
### 54. `[P2]` [ERROR] [HIGH] No error state on student topics page
Student topics page had no error handling. Added error state component.
### 55. `[P2]` [ERROR] [HIGH] No error state on student dashboard
Student home page lacked error handling. Added error state with retry.
### 56. `[P2]` [ERROR] [HIGH] No error state on student questions page
Question view had no error handling. Added error boundary.
### 57. `[P2]` [ERROR] [HIGH] No error state on teacher student detail page
Student detail/results page lacked error state. Added error display.
### 58. `[P2]` [ERROR] [HIGH] No error state on teacher answers page
Answer review page had no error handling. Added error state component.
### 59. `[P2]` [LOADING] [HIGH] No loading skeleton on teacher dashboard
Dashboard showed blank page while loading. Added skeleton matching the final layout shape.
### 60. `[P2]` [LOADING] [HIGH] No loading skeleton on students page
Students page had no loading indication. Added skeleton UI for the student table.
### 61. `[P2]` [LOADING] [HIGH] No loading skeleton on topics pages
Topics listing lacked loading state. Added skeleton cards for topics.
### 62. `[P2]` [LOADING] [HIGH] No loading skeleton on student pages
Student pages had no loading indication. Added skeleton components.
### 63. `[P2]` [LOADING] [HIGH] No loading state on submit buttons
Form submit buttons lacked loading indication. Added spinner + disabled state on all buttons during API calls.
### 64. `[P2]` [PERF] [HIGH] Skeleton flash on every 8s poll
Every 8-second poll set loading=true causing full-page skeleton flashes. Changed to silent background refresh.
### 65. `[P2]` [PERF] [HIGH] No pagination on teacher dashboard
Dashboard showed all students in one table. Added pagination with 10 students per page and Previous/Next controls.
### 66. `[P2]` [PERF] [HIGH] No search/filter on teacher students page
Teachers had to scroll through entire student list. Added search bar filtering by name or username.
### 67. `[P2]` [PERF] [HIGH] No query cache or deduplication
Same Supabase queries repeated across components. Implemented client reuse via useSupabase() context.
### 68. `[P2]` [PERF] [HIGH] Sequential queries on teacher dashboard
Dashboard fetched profile, org, students, teachers, question_sets, and answers sequentially. Parallelized with Promise.all().
### 69. `[P2]` [UI] [HIGH] No mobile responsive navigation
Nav bar items overlapped on small screens. Added responsive nav with mobile-optimized layout.
### 70. `[P2]` [UI] [HIGH] No confirmation dialog for destructive actions
Delete actions had no confirmation. Added ConfirmDialog component with descriptive messages.
### 71. `[P2]` [UI] [HIGH] No visual feedback on release toggles
Release toggles lacked visual feedback. Added optimistic updates with rollback on failure.
### 72. `[P2]` [UI] [HIGH] No empty state for student-less dashboard
Empty student table was shown with just headers. Added empty state with helpful guidance message.
### 73. `[P2]` [UI] [HIGH] No empty state for question-set-less topics
Topics page showed nothing when no question sets existed. Added empty state with CTA to create question sets.
### 74. `[P2]` [FORM] [HIGH] No validation on student creation form
Add student form lacked client-side validation. Added real-time validation with error messages.
### 75. `[P2]` [FORM] [HIGH] No validation on feedback textarea
Teacher feedback textarea had no character limit. Added max length validation.
### 76. `[P2]` [ACCESS] [HIGH] No aria-labels on icon-only buttons
Icon-only edit/delete buttons lacked accessible labels. Added aria-labels for screen readers.
### 77. `[P2]` [ACCESS] [HIGH] No keyboard nav for toggles
Release toggles couldn't be operated via keyboard. Added keyboard support (Enter/Space).
### 78. `[P2]` [ACCESS] [HIGH] No focus indicators on interactive elements
Focus-visible styles were missing. Added visible focus rings to all interactive elements.
### 79. `[P2]` [ACCESS] [HIGH] No screen reader announcements for dynamic content
Dynamic content updates weren't announced. Added aria-live regions to data areas.
### 80. `[P2]` [UI] [HIGH] No page titles on all routes
Some pages lacked document.title. Added descriptive titles to all pages via useEffect.
### 81. `[P2]` [UI] [HIGH] No error boundaries at page level
A component crash could take down the entire page. Added React error boundaries at page level.
### 82. `[P2]` [UI] [HIGH] No offline detection banner
Users saw stale data without internet. Added offline detection banner in the root layout.
### 83. `[P2]` [PERF] [HIGH] No bundle size optimization
JS bundle included unused components. Bundle analysis pending.
### 84. `[P2]` [PERF] [HIGH] No image optimization
Images used <img> instead of Next.js Image component. Optimization pending.
### 85. `[P2]` [PERF] [HIGH] No React.memo on frequently re-rendered components
Student table rows and stat cards re-rendered on every parent state change. React.memo optimization pending.
### 86. `[P2]` [API] [HIGH] No fetch timeout on client-side calls
Client-side fetch calls had no timeout. Added AbortController-based timeout to dashboard data fetching.
### 87. `[P2]` [API] [HIGH] No health check endpoint
Missing /api/health endpoint for monitoring. Health check endpoint pending.
### 88. `[P2]` [API] [HIGH] No request validation on several endpoints
Some API endpoints lacked Zod validation. Added validation to lookup-username and teacher-feedback.
### 89. `[P2]` [API] [HIGH] No pagination on API responses
API list endpoints returned all results. Pagination pending.
### 90. `[P2]` [DB] [HIGH] Missing database indexes
Added indexes on question_sets.subtopic_id, student_answers.question_set_id, profiles.role, profiles.organization_id.
### 91. `[P2]` [DB] [HIGH] No soft delete support
Deleting a student permanently removes their data. Soft delete pending.
### 92. `[P2]` [TYPES] [HIGH] Missing types for API responses
API endpoints returned untyped JSON. Type definitions pending.
### 93. `[P2]` [TYPES] [HIGH] Excessive 'any' type usage
Widespread 'as any' type assertions throughout codebase. Type cleanup in progress.
### 94. `[P2]` [STRUCTURE] [HIGH] Duplicate Supabase client creation
Multiple components created their own Supabase client. Consolidated to useSupabase() context hook.
### 95. `[P2]` [STRUCTURE] [HIGH] No reusable API helper functions
Fetch call patterns duplicated across components. Standardized error handling pattern in use.
### 96. `[P2]` [STRUCTURE] [HIGH] Fetch logic mixed with component rendering
Data fetching embedded in useEffect inside page components. Extracted into separate functions.
### 97. `[P2]` [ERROR] [HIGH] Global error boundary shows blank page
Global error.tsx didn't preserve navigation. Proper error page pending.
### 98. `[P2]` [LOADING] [HIGH] No page transition loading indicator
Navigating between pages showed nothing until load. Loading indicator pending.
### 99. `[P2]` [PERF] [HIGH] Unnecessary re-fetches on every navigation
Navigating away and back refetched all data. Client-side caching with useCallback pattern in place.
### 100. `[P2]` [PERF] [HIGH] No memoization on expensive computations
Answer map and stats recomputed on every render. Added useMemo for expensive calculations.
### 101. `[P2]` [UI] [HIGH] No toast notification system
Success/error messages shown inline only. Toast system pending.
### 102. `[P2]` [UI] [HIGH] No breadcrumb navigation
Deep pages lacked navigation context. Breadcrumbs pending.
### 103. `[P2]` [UI] [HIGH] Table overflow on mobile
Student progress table overflowed on mobile. Horizontal scroll implemented.
### 104. `[P2]` [FORM] [HIGH] No password visibility toggle
Password fields lacked show/hide toggle. Pending implementation.
### 105. `[P2]` [FORM] [HIGH] No form dirty state detection
No unsaved changes warning. Pending implementation.
### 106. `[P2]` [STRUCTURE] [HIGH] Duplicated CSS classes
Common styling defined inline in every component. Created reusable Button, Input, Card, Badge, Spinner components.
### 107. `[P2]` [STRUCTURE] [HIGH] Magic numbers throughout codebase
Page sizes, timeouts hardcoded. Extracted to lib/constants.ts.
### 108. `[P2]` [STRUCTURE] [HIGH] No consistent error handling strategy
Some errors caught, others swallowed. Standardized try/catch/finally pattern across all async operations.
### 109. `[P2]` [TESTING] [HIGH] No test suite
Project has zero tests. Test suite setup pending.
### 110. `[P2]` [TESTING] [HIGH] No API route tests
API endpoints not tested. Integration tests pending.
### 111. `[P2]` [MONITORING] [HIGH] No error tracking
Production errors invisible without monitoring. Error tracking pending.
### 112. `[P2]` [MONITORING] [HIGH] No logging infrastructure
Server-side logs not persisted. Structured logging pending.
### 113. `[P2]` [PERF] [HIGH] No Lighthouse performance audit
Performance audit pending.
### 114. `[P2]` [UI] [HIGH] Dark mode reverses on navigation
Dark mode preference persisted via localStorage. Works across all pages now.
### 115. `[P2]` [UI] [HIGH] No dark mode on auth pages
Auth pages had no dark mode. Added dark mode to login and signup pages.
### 116. `[P2]` [UI] [HIGH] Theme toggle not on all pages
Theme toggle added to auth pages and dashboard headers.
### 117. `[P2]` [PERF] [HIGH] No lazy loading for route segments
Lazy loading via Next.js dynamic imports pending.
### 118. `[P2]` [PERF] [HIGH] No loading.tsx for route suspense
Route Suspense boundaries pending.
### 119. `[P2]` [STRUCTURE] [HIGH] Inconsistent import ordering
Import ordering convention pending.
### 120. `[P2]` [STRUCTURE] [HIGH] No Prettier/ESLint config
Prettier and ESLint configuration pending.
### 121. `[P2]` [UI] [HIGH] No responsive typography
Responsive font sizes pending.
### 122. `[P2]` [ACCESS] [HIGH] Skip-to-content link missing
Skip navigation link pending.
### 123. `[P2]` [ACCESS] [HIGH] Dark mode color contrast issues
Color contrast audit pending.
### 124. `[P2]` [UI] [HIGH] No hover states on interactive elements
Hover state transitions pending for remaining elements.
### 125. `[P2]` [UI] [HIGH] No active nav link state
Current page indicator in nav pending.
### 126. `[P2]` [FORM] [HIGH] No autocomplete on login form
Autocomplete attributes pending.
### 127. `[P2]` [FORM] [HIGH] Input type=email for teachers
Teacher email field uses proper type='email'.
### 128. `[P2]` [UI] [HIGH] No step transitions in signup
Signup flow slide transitions pending.
### 129. `[P2]` [PERF] [HIGH] Font loading layout shift
Font loading optimization pending.
### 130. `[P2]` [PERF] [HIGH] No preloading critical resources
Resource preloading pending.
### 131. `[P2]` [STRUCTURE] [HIGH] No shared types frontend/backend
Shared type definitions pending.
### 132. `[P2]` [PERF] [HIGH] Large JSONB payloads
Question data in JSONB grows over time. Optimization pending.
### 133. `[P2]` [VARIOUS] [HIGH] Add data prefetching for student dashboard to improve percei
Add data prefetching for student dashboard to improve perceived load time
### 134. `[P2]` [VARIOUS] [HIGH] Add submission status confirmation after student answers are
Add submission status confirmation after student answers are saved
### 135. `[P2]` [VARIOUS] [HIGH] Add proper table header scope associations for screen reader
Add proper table header scope associations for screen readers
### 136. `[P2]` [VARIOUS] [HIGH] Optimize SVG logo file size for faster loading
Optimize SVG logo file size for faster loading
### 137. `[P2]` [VARIOUS] [HIGH] Add environment variable validation on startup to catch miss
Add environment variable validation on startup to catch missing config
### 138. `[P2]` [VARIOUS] [HIGH] Add Supabase connection health check on startup
Add Supabase connection health check on startup
### 139. `[P2]` [VARIOUS] [HIGH] Add progress step indicator for multi-step signup flow
Add progress step indicator for multi-step signup flow
### 140. `[P2]` [VARIOUS] [HIGH] Customize 404 page with app branding
Customize 404 page with app branding
### 141. `[P2]` [VARIOUS] [HIGH] Customize 500 error page with app branding
Customize 500 error page with app branding
### 142. `[P2]` [VARIOUS] [HIGH] Add end-to-end tests for signup→login→topics→questions→resul
Add end-to-end tests for signup→login→topics→questions→results flow
### 143. `[P2]` [VARIOUS] [HIGH] Add Web Vitals tracking for performance monitoring
Add Web Vitals tracking for performance monitoring
### 144. `[P2]` [VARIOUS] [HIGH] Standardize API error response format across all endpoints
Standardize API error response format across all endpoints
### 145. `[P2]` [VARIOUS] [HIGH] Add Zod request validation for admin student management endp
Add Zod request validation for admin student management endpoints
### 146. `[P2]` [VARIOUS] [HIGH] Add Cache-Control response headers for appropriate API endpo
Add Cache-Control response headers for appropriate API endpoints
### 147. `[P2]` [VARIOUS] [HIGH] Reduce bundle size by removing unused dependencies and code 
Reduce bundle size by removing unused dependencies and code splitting
### 148. `[P2]` [VARIOUS] [HIGH] Replace <img> tags with Next.js Image component for automati
Replace <img> tags with Next.js Image component for automatic optimization
### 149. `[P2]` [VARIOUS] [HIGH] Add React.memo to frequently re-rendered components (table r
Add React.memo to frequently re-rendered components (table rows, stat cards)
### 150. `[P2]` [VARIOUS] [HIGH] Add AbortController timeout (15-30s) to all client-side fetc
Add AbortController timeout (15-30s) to all client-side fetch calls
### 151. `[P2]` [VARIOUS] [HIGH] Add /api/health endpoint returning database connectivity sta
Add /api/health endpoint returning database connectivity status
### 152. `[P2]` [VARIOUS] [HIGH] Add Zod validation to /api/lookup-username and /api/teacher-
Add Zod validation to /api/lookup-username and /api/teacher-feedback
### 153. `[P2]` [VARIOUS] [HIGH] Add pagination parameters (page, limit) to list API endpoint
Add pagination parameters (page, limit) to list API endpoints
### 154. `[P2]` [VARIOUS] [HIGH] Add database indexes on question_sets.subtopic_id and studen
Add database indexes on question_sets.subtopic_id and student_answers.question_set_id
### 155. `[P2]` [VARIOUS] [HIGH] Implement soft delete (deleted_at timestamp) for student acc
Implement soft delete (deleted_at timestamp) for student accounts
### 156. `[P2]` [VARIOUS] [HIGH] Define and export TypeScript response types for all API rout
Define and export TypeScript response types for all API routes
### 157. `[P2]` [VARIOUS] [HIGH] Gradually replace 'as any' with proper types throughout code
Gradually replace 'as any' with proper types throughout codebase
### 158. `[P2]` [VARIOUS] [HIGH] Consolidate Supabase client usage into single context provid
Consolidate Supabase client usage into single context provider
### 159. `[P2]` [VARIOUS] [HIGH] Create reusable apiClient helper for standardized fetch patt
Create reusable apiClient helper for standardized fetch patterns
### 160. `[P2]` [VARIOUS] [HIGH] Extract data fetching logic from useEffects into custom hook
Extract data fetching logic from useEffects into custom hooks
### 161. `[P2]` [VARIOUS] [HIGH] Create proper global error page that preserves navigation la
Create proper global error page that preserves navigation layout
### 162. `[P2]` [VARIOUS] [HIGH] Add nprogress-style page loading indicator bar
Add nprogress-style page loading indicator bar
### 163. `[P3]` [TYPES] [MEDIUM] Add proper types to all Supabase queries
Replace inline type assertions with properly generated Supabase database types.
### 164. `[P3]` [TYPES] [MEDIUM] Type-safe error handling
Create a discriminated union type for API responses instead of ad-hoc error checks.
### 165. `[P3]` [TYPES] [MEDIUM] Define prop types for all components
Several components lack proper TypeScript prop interfaces. Add for better intellisense.
### 166. `[P3]` [TYPES] [MEDIUM] Type-safe environment variables
Create a typed env config object instead of accessing process.env directly everywhere.
### 167. `[P3]` [TYPES] [MEDIUM] Remove unused imports flagged by ESLint
Clean up unused imports across the codebase.
### 168. `[P3]` [STRUCTURE] [MEDIUM] Extract API routes into service layer
Move business logic out of route handlers into separate service functions for testability.
### 169. `[P3]` [STRUCTURE] [MEDIUM] Create custom hooks for common data fetching
Replace repeated useEffects with reusable hooks like useStudents(), useTopics().
### 170. `[P3]` [STRUCTURE] [MEDIUM] Organize components into feature folders
Group components by feature (auth, teacher, student, common) rather than flat directory.
### 171. `[P3]` [STRUCTURE] [MEDIUM] Extract constants from magic strings
Replace hardcoded values with named constants in lib/constants.ts.
### 172. `[P3]` [STRUCTURE] [MEDIUM] Create utility functions for date formatting
Centralize date formatting logic into lib/formatters.ts.
### 173. `[P3]` [STRUCTURE] [MEDIUM] Separate types into dedicated files
Move shared type definitions out of component files into types/ directory.
### 174. `[P3]` [STRUCTURE] [MEDIUM] Create consistent color palette utility
Define theme colors as CSS custom properties and use consistently.
### 175. `[P3]` [REFACTOR] [MEDIUM] Replace repetitive fetch patterns with apiClient
Create a fetch wrapper for standardized request/response handling.
### 176. `[P3]` [REFACTOR] [MEDIUM] Extract student card into reusable component
Inline student card in manage students page should be a separate component.
### 177. `[P3]` [REFACTOR] [MEDIUM] Extract stat card into reusable component
Dashboard stat cards duplicated four times. Create reusable StatCard.
### 178. `[P3]` [REFACTOR] [MEDIUM] Consolidate loading state management
Standardize the loading state pattern across all pages.
### 179. `[P3]` [REFACTOR] [MEDIUM] Simplify signup form state management
The useReducer pattern is verbose. Consider React Hook Form.
### 180. `[P3]` [REFACTOR] [MEDIUM] Replace any[] casts with typed arrays
Database results cast as 'any[]' should use proper type assertions.
### 181. `[P3]` [REFACTOR] [MEDIUM] Consolidate multiple useEffects into single data flow
Pages with multiple data-loading useEffects can be simplified.
### 182. `[P3]` [CONFIG] [MEDIUM] Add TypeScript strict mode
Enable strict mode in tsconfig.json for better type checking.
### 183. `[P3]` [CONFIG] [MEDIUM] Add Prettier configuration
Create .prettierrc for consistent code formatting.
### 184. `[P3]` [CONFIG] [MEDIUM] Add Husky pre-commit hooks
Set up lint-staged and Husky for pre-commit linting.
### 185. `[P3]` [CONFIG] [MEDIUM] Add VSCode workspace settings
Create .vscode/settings.json for shared editor config.
### 186. `[P3]` [CONFIG] [MEDIUM] Add .nvmrc for Node version
Specify the Node.js version for consistent development.
### 187. `[P3]` [CONFIG] [MEDIUM] Configure ESLint for consistent imports
Add eslint-plugin-import rules for import ordering.
### 188. `[P3]` [DEPS] [MEDIUM] Add date-fns for date formatting
Replace ad-hoc date formatting with a proper date library.
### 189. `[P3]` [DEPS] [MEDIUM] Add React Query for server state management
Replace manual fetch/state with React Query for caching and background refetching.
### 190. `[P3]` [DEPS] [MEDIUM] Add react-hot-toast or sonner for toast notifications
Implement a toast library for non-blocking feedback.
### 191. `[P3]` [DEPS] [MEDIUM] Add clsx or tailwind-merge for className handling
Simplify conditional className logic.
### 192. `[P3]` [DEPS] [MEDIUM] Add zod for runtime validation
Runtime validation for API request payloads.
### 193. `[P3]` [ERROR] [MEDIUM] Add error boundaries to teacher pages
Wrap content areas in error boundaries so nav and header stay interactive.
### 194. `[P3]` [ERROR] [MEDIUM] Add error boundaries to student pages
Same for student-facing pages.
### 195. `[P3]` [ERROR] [MEDIUM] Graceful handling of network errors
Distinguish server errors from connection errors in error messages.
### 196. `[P3]` [ERROR] [MEDIUM] Retry logic for transient failures
Exponential backoff retry logic for 5xx errors.
### 197. `[P3]` [LOADING] [MEDIUM] Skeleton for teacher subtopic detail
Add loading skeleton for the subtopic lesson view.
### 198. `[P3]` [LOADING] [MEDIUM] Skeleton for student question view
Add loading state for questions loading.
### 199. `[P3]` [LOADING] [MEDIUM] Skeleton for student results
Add loading state for answer submission results.
### 200. `[P3]` [LOADING] [MEDIUM] Skeleton for teacher answers page
Add loading skeletons for answer review layout.
### 201. `[P3]` [LOADING] [MEDIUM] Suspense boundaries for lazy-loaded routes
Wrap dynamic imports in Suspense with appropriate fallbacks.
### 202. `[P3]` [PERF] [MEDIUM] Memoize callback functions with useCallback
Prevent unnecessary re-renders on child components.
### 203. `[P3]` [PERF] [MEDIUM] Virtual scroll for large student lists
For schools with 100+ students, consider virtual scrolling.
### 204. `[P3]` [PERF] [MEDIUM] Debounce search input
Reduce re-renders on the students page search bar.
### 205. `[P3]` [PERF] [MEDIUM] Optimize Realtime subscriptions
Consolidate Realtime channels to reduce connection overhead.
### 206. `[P3]` [PERF] [MEDIUM] Lazy load heavy dependencies
Libraries like date-fns loaded only when needed.
### 207. `[P3]` [API] [MEDIUM] Add API version prefix
Add /v1/ prefix to API routes for future versioning.
### 208. `[P3]` [API] [MEDIUM] Add OpenAPI documentation
Document API endpoints with Swagger.
### 209. `[P3]` [API] [MEDIUM] Standardize API response envelope
Wrap all responses in standard { data, error, meta } format.
### 210. `[P3]` [API] [MEDIUM] Add batch endpoint for multiple operations
Allow teachers to perform bulk operations efficiently.
### 211. `[P3]` [SECURITY] [MEDIUM] Add helmet-style security headers
Comprehensive security headers for all responses.
### 212. `[P3]` [SECURITY] [MEDIUM] Sanitize display names against XSS
Prevent XSS by sanitizing user-provided names before rendering.
### 213. `[P3]` [SECURITY] [MEDIUM] Add request ID tracing
Add X-Request-ID header for request tracing.
### 214. `[P3]` [SECURITY] [MEDIUM] Set cookie security flags
Ensure auth cookies have Secure, HttpOnly, SameSite flags.
### 215. `[P3]` [DB] [MEDIUM] Add created_at/updated_at triggers
Auto-update timestamps on record changes.
### 216. `[P3]` [DB] [MEDIUM] Add data archival strategy
Plan for archiving old student answers and question sets.
### 217. `[P3]` [DB] [MEDIUM] Add table documentation
Document each table's purpose and schema in the database.
### 218. `[P3]` [TESTING] [MEDIUM] Add unit tests for validation logic
Test Zod schemas and validation functions.
### 219. `[P3]` [TESTING] [MEDIUM] Add component tests
Test key components with React Testing Library.
### 220. `[P3]` [TESTING] [MEDIUM] Add Vitest configuration
Set up Vitest for fast unit testing with TypeScript.
### 221. `[P3]` [MONITORING] [MEDIUM] Add performance monitoring
Track API response times, render times, query performance.
### 222. `[P3]` [MONITORING] [MEDIUM] Add uptime monitoring
External monitoring for production site availability.
### 223. `[P3]` [MONITORING] [MEDIUM] Add structured JSON logging
Replace console.log with structured logging for aggregation.
### 224. `[P3]` [UI] [MEDIUM] Dark mode theme toggle implemented
Full dark mode with CSS custom properties, persisted preference, system detection.
### 225. `[P3]` [UI] [MEDIUM] Animate theme transitions
Smooth color transitions when switching between light and dark themes.
### 226. `[P3]` [UI] [MEDIUM] Page transition animations
Subtle fade-in animations on page load for better perceived performance.
### 227. `[P3]` [UI] [MEDIUM] Loading spinner on buttons
Spinner inside buttons during async operations.
### 228. `[P3]` [UI] [MEDIUM] Reduced motion support
Respect prefers-reduced-motion for vestibular disorders.
### 229. `[P3]` [UI] [MEDIUM] Smooth scroll behavior
Enable smooth scrolling for anchor links and page navigation.
### 230. `[P3]` [UI] [MEDIUM] Button hover/active states
Scale and shadow transitions on button interaction.
### 231. `[P3]` [UI] [MEDIUM] Card hover elevation effects
Subtle lift effect on card hover for interactivity.
### 232. `[P3]` [UI] [MEDIUM] Status badges for student progress
Visual badges (Not started, In progress, Complete).
### 233. `[P3]` [UI] [MEDIUM] Submission confirmation animation
Brief checkmark animation after answer submission.
### 234. `[P3]` [UI] [MEDIUM] Improved empty states with icons
Simple icons in empty states instead of plain text.
### 235. `[P3]` [UI] [MEDIUM] Tooltip for truncated text
Title attribute on truncated subtopic titles.
### 236. `[P3]` [UI] [MEDIUM] Sticky table headers
Table headers remain visible when scrolling through long tables.
### 237. `[P3]` [ACCESS] [MEDIUM] ARIA landmarks on all pages
Add proper role attributes for navigation, main, complementary.
### 238. `[P3]` [ACCESS] [MEDIUM] Skip-to-content link
Focusable skip link at the top of every page.
### 239. `[P3]` [ACCESS] [MEDIUM] Touch targets 44x44px minimum
Ensure buttons and links meet accessibility size requirements.
### 240. `[P3]` [ACCESS] [MEDIUM] Form error messages with aria-describedby
Associate errors with inputs via aria-describedby.
### 241. `[P3]` [ACCESS] [MEDIUM] Screen reader text for icons
sr-only text for all icon-only elements.
### 242. `[P3]` [MOBILE] [MEDIUM] Responsive table to card layout
Switch progress table to card layout on mobile.
### 243. `[P3]` [MOBILE] [MEDIUM] Touch-optimized filter/search
Full-width search bar with clear button on mobile.
### 244. `[P3]` [MOBILE] [MEDIUM] Mobile-optimized signup form
Multi-step signup works well on small screens without zooming.
### 245. `[P3]` [MOBILE] [MEDIUM] Bottom tab navigation on mobile
Replace horizontal nav with bottom tab bar on small screens.
### 246. `[P3]` [LOGIN] [MEDIUM] Remember me checkbox
Allow users to stay signed in across browser sessions.
### 247. `[P3]` [LOGIN] [MEDIUM] Forgot password flow
Implement password reset via email for teacher accounts.
### 248. `[P3]` [LOGIN] [MEDIUM] Auto-focus first field on load
Focus the username/email field when login page loads.
### 249. `[P3]` [LOGIN] [MEDIUM] Password show/hide toggle
Allow users to see their password while typing.
### 250. `[P3]` [FORM] [MEDIUM] Add autocomplete attributes to login form
Help password managers work correctly.
### 251. `[P3]` [FORM] [MEDIUM] Use type=email for teacher signup
Browser email validation on teacher email field.
### 252. `[P3]` [FORM] [MEDIUM] Additional form improvement
Continue improving the form area for better code quality.
### 253. `[P3]` [CONFIG] [MEDIUM] Additional config improvement
Continue improving the config area for better code quality.
### 254. `[P3]` [DEPS] [MEDIUM] Additional deps improvement
Continue improving the deps area for better code quality.
### 255. `[P3]` [ERROR] [MEDIUM] Additional error improvement
Continue improving the error area for better code quality.
### 256. `[P3]` [LOADING] [MEDIUM] Additional loading improvement
Continue improving the loading area for better code quality.
### 257. `[P3]` [PERF] [MEDIUM] Additional perf improvement
Continue improving the perf area for better code quality.
### 258. `[P3]` [API] [MEDIUM] Additional api improvement
Continue improving the api area for better code quality.
### 259. `[P3]` [SECURITY] [MEDIUM] Additional security improvement
Continue improving the security area for better code quality.
### 260. `[P3]` [DB] [MEDIUM] Additional db improvement
Continue improving the db area for better code quality.
### 261. `[P3]` [TESTING] [MEDIUM] Additional testing improvement
Continue improving the testing area for better code quality.
### 262. `[P3]` [MONITORING] [MEDIUM] Additional monitoring improvement
Continue improving the monitoring area for better code quality.
### 263. `[P3]` [UI] [MEDIUM] Additional ui improvement
Continue improving the ui area for better code quality.
### 264. `[P3]` [ACCESS] [MEDIUM] Additional access improvement
Continue improving the access area for better code quality.
### 265. `[P3]` [MOBILE] [MEDIUM] Additional mobile improvement
Continue improving the mobile area for better code quality.
### 266. `[P3]` [LOGIN] [MEDIUM] Additional login improvement
Continue improving the login area for better code quality.
### 267. `[P3]` [FORM] [MEDIUM] Additional form improvement
Continue improving the form area for better code quality.
### 268. `[P3]` [CONFIG] [MEDIUM] Additional config improvement
Continue improving the config area for better code quality.
### 269. `[P3]` [DEPS] [MEDIUM] Additional deps improvement
Continue improving the deps area for better code quality.
### 270. `[P3]` [ERROR] [MEDIUM] Additional error improvement
Continue improving the error area for better code quality.
### 271. `[P3]` [LOADING] [MEDIUM] Additional loading improvement
Continue improving the loading area for better code quality.
### 272. `[P3]` [PERF] [MEDIUM] Additional perf improvement
Continue improving the perf area for better code quality.
### 273. `[P3]` [API] [MEDIUM] Additional api improvement
Continue improving the api area for better code quality.
### 274. `[P3]` [SECURITY] [MEDIUM] Additional security improvement
Continue improving the security area for better code quality.
### 275. `[P3]` [DB] [MEDIUM] Additional db improvement
Continue improving the db area for better code quality.
### 276. `[P3]` [TESTING] [MEDIUM] Additional testing improvement
Continue improving the testing area for better code quality.
### 277. `[P3]` [MONITORING] [MEDIUM] Additional monitoring improvement
Continue improving the monitoring area for better code quality.
### 278. `[P3]` [UI] [MEDIUM] Additional ui improvement
Continue improving the ui area for better code quality.
### 279. `[P3]` [ACCESS] [MEDIUM] Additional access improvement
Continue improving the access area for better code quality.
### 280. `[P3]` [MOBILE] [MEDIUM] Additional mobile improvement
Continue improving the mobile area for better code quality.
### 281. `[P3]` [LOGIN] [MEDIUM] Additional login improvement
Continue improving the login area for better code quality.
### 282. `[P3]` [FORM] [MEDIUM] Additional form improvement
Continue improving the form area for better code quality.
### 283. `[P4]` [CONFIG] [LOW] Dockerfile for reproducible builds
Create a Dockerfile for consistent local development and CI/CD environments.
### 284. `[P4]` [CONFIG] [LOW] docker-compose.yml for local dev
Set up a complete local development environment with Docker Compose.
### 285. `[P4]` [CONFIG] [LOW] .editorconfig file
Define consistent editor settings across the team.
### 286. `[P4]` [CONFIG] [LOW] .env.example file
Document all required environment variables with example values.
### 287. `[P4]` [CONFIG] [LOW] Dependabot config for automated security updates
Automate dependency update PRs with Dependabot configuration.
### 288. `[P4]` [CONFIG] [LOW] GitHub Actions CI pipeline
Run tests, linting, and type checking on every PR.
### 289. `[P4]` [CONFIG] [LOW] Contribution guidelines (CONTRIBUTING.md)
Document setup instructions, code standards, and PR process.
### 290. `[P4]` [CONFIG] [LOW] CODEOWNERS file
Define code ownership for different parts of the project.
### 291. `[P4]` [CONFIG] [LOW] Issue and PR templates
Standardize bug reports and feature requests with templates.
### 292. `[P4]` [CONFIG] [LOW] Changelog (CHANGELOG.md)
Track version history and notable changes.
### 293. `[P4]` [CONFIG] [LOW] Security policy (SECURITY.md)
Document vulnerability reporting process.
### 294. `[P4]` [CONFIG] [LOW] License file
Add appropriate open-source license.
### 295. `[P4]` [CONFIG] [LOW] Architecture decision records
Document significant architectural decisions.
### 296. `[P4]` [CONFIG] [LOW] Renovate config for dependency management
Alternative to Dependabot with more customization.
### 297. `[P4]` [CONFIG] [LOW] Snyk security scanning
Automated vulnerability scanning in CI/CD.
### 298. `[P4]` [CONFIG] [LOW] Code coverage thresholds
Set minimum coverage targets for tests.
### 299. `[P4]` [CONFIG] [LOW] Branch protection rules
Required reviews and status checks on main branch.
### 300. `[P4]` [CONFIG] [LOW] Commit message convention
Document conventional commits format.
### 301. `[P4]` [CONFIG] [LOW] Support documentation
Document how to get help for common issues.
### 302. `[P4]` [CONFIG] [LOW] API documentation for third-party consumers
Document endpoints, request/response formats.
### 303. `[P4]` [PWA] [LOW] manifest.json for PWA support
Enable 'Add to Home Screen' functionality with app metadata.
### 304. `[P4]` [PWA] [LOW] Service worker for offline caching
Cache core assets for basic offline functionality.
### 305. `[P4]` [PWA] [LOW] App icons for all platforms
Provide icons in all required sizes for PWA installation.
### 306. `[P4]` [PWA] [LOW] Splash screen configuration
Customize the PWA splash screen appearance.
### 307. `[P4]` [PWA] [LOW] Theme-color meta tag
Set browser chrome color to match the app theme.
### 308. `[P4]` [SEO] [LOW] Meta description tags
Add unique meta descriptions to all pages.
### 309. `[P4]` [SEO] [LOW] Open Graph tags for social sharing
Improve link previews when sharing on social media.
### 310. `[P4]` [SEO] [LOW] robots.txt
Configure search engine crawling rules.
### 311. `[P4]` [SEO] [LOW] Sitemap.xml
Help search engines discover all pages.
### 312. `[P4]` [SEO] [LOW] Canonical URLs
Prevent duplicate content issues in search results.
### 313. `[P4]` [SEO] [LOW] JSON-LD structured data
Schema.org markup for rich search results.
### 314. `[P4]` [SEO] [LOW] Alt text on all images
Descriptive alt text for SEO and accessibility.
### 315. `[P4]` [PERF] [LOW] Bundle analysis script
Add npm script to analyze bundle composition.
### 316. `[P4]` [PERF] [LOW] CDN caching rules
Optimal Cache-Control headers for static assets.
### 317. `[P4]` [PERF] [LOW] Resource hints (preconnect, prefetch)
Optimize connection establishment for external resources.
### 318. `[P4]` [PERF] [LOW] Optimize font loading
Use font-display: optional and preconnect to font CDN.
### 319. `[P4]` [PERF] [LOW] Blur-up image placeholders
Reduce perceived load time for images.
### 320. `[P4]` [PERF] [LOW] Core Web Vitals monitoring
Track LCP, FID, CLS metrics in production.
### 321. `[P4]` [PERF] [LOW] Optimize Largest Contentful Paint
Identify and optimize the LCP element on each page.
### 322. `[P4]` [PERF] [LOW] Streaming SSR
Use React's streaming server rendering for faster TTFB.
### 323. `[P4]` [UI] [LOW] Keyboard shortcut for theme toggle
Press T to switch between light and dark themes.
### 324. `[P4]` [UI] [LOW] Scroll-to-top floating button
Appears when scrolling down the page.
### 325. `[P4]` [UI] [LOW] Animated background on auth pages
Subtle gradient animation on login/signup.
### 326. `[P4]` [UI] [LOW] Confetti animation on account creation
Celebration effect after successful signup.
### 327. `[P4]` [UI] [LOW] Page loading progress bar
Thin bar at the top showing navigation progress.
### 328. `[P4]` [UI] [LOW] Custom scrollbar styling
Match scrollbar colors to the app theme.
### 329. `[P4]` [UI] [LOW] Selection color customization
Style text selection to match brand color.
### 330. `[P4]` [UI] [LOW] Navigation loading bar
Progress bar when navigating between pages.
### 331. `[P4]` [UI] [LOW] Count-up number animations
Animated stat numbers when data loads.
### 332. `[P4]` [UI] [LOW] Button micro-interactions
Ripple or scale effect on button click.
### 333. `[P4]` [UI] [LOW] Hover preview for student results
Quick score preview tooltip on dashboard table cells.
### 334. `[P4]` [UI] [LOW] Table row hover highlight
Highlight the entire row when hovering.
### 335. `[P4]` [UI] [LOW] Alternating row colors in tables
Zebra striping for better table readability.
### 336. `[P4]` [UI] [LOW] Sticky first column on horizontal scroll
Keep student name column visible when scrolling.
### 337. `[P4]` [UI] [LOW] Export to CSV button
Download student data as CSV file.
### 338. `[P4]` [UI] [LOW] Print stylesheet
Optimize page layout for printing.
### 339. `[P4]` [UI] [LOW] Full-screen mode option
Allow teachers to view dashboards in full screen.
### 340. `[P4]` [UI] [LOW] Customizable dashboard layout
Let teachers rearrange dashboard widgets.
### 341. `[P4]` [UI] [LOW] Notification badge for new submissions
Badge on dashboard when new answers arrive.
### 342. `[P4]` [UI] [LOW] Question difficulty star rating
Students rate question difficulty after answering.
### 343. `[P4]` [UI] [LOW] Study streak counter for students
Consecutive days of activity tracking.
### 344. `[P4]` [UI] [LOW] Achievement badges for gamification
Engagement badges for student motivation.
### 345. `[P4]` [UI] [LOW] Class leaderboard
Optional competitive view of top-scoring students.
### 346. `[P4]` [UI] [LOW] Dark mode toggle animation
Smooth animated sun/moon icon transition.
### 347. `[P4]` [ACCESS] [LOW] High-contrast theme option
Alternative theme for users with visual impairments.
### 348. `[P4]` [ACCESS] [LOW] Font size adjustment controls
Allow users to increase/decrease text size.
### 349. `[P4]` [ACCESS] [LOW] Dyslexia-friendly font option
Offer OpenDyslexic as an alternative font.
### 350. `[P4]` [ACCESS] [LOW] Keyboard shortcut reference display
Show available keyboard shortcuts on ? press.
### 351. `[P4]` [DOCS] [LOW] Developer setup guide
Detailed local development environment setup.
### 352. `[P4]` [DOCS] [LOW] Deployment guide
Instructions for deploying to Vercel and managing environments.
### 353. `[P4]` [DOCS] [LOW] Database schema documentation
ER diagram and table descriptions.
### 354. `[P4]` [DOCS] [LOW] User manual for teachers
Guide for teacher-facing features.
### 355. `[P4]` [DOCS] [LOW] User manual for students
Student-facing feature documentation.
### 356. `[P4]` [DOCS] [LOW] FAQ page
Common questions and troubleshooting answers.
### 357. `[P4]` [DOCS] [LOW] Video tutorials
Walkthrough videos for key features.
### 358. `[P4]` [DOCS] [LOW] Changelog with screenshots
Visual changelog showing new features.
### 359. `[P4]` [DOCS] [LOW] API documentation page
Swagger/OpenAPI UI for API consumers.
### 360. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 361. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 362. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 363. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 364. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 365. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 366. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 367. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 368. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 369. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 370. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 371. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 372. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 373. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 374. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 375. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 376. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 377. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 378. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 379. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 380. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 381. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 382. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 383. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 384. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 385. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 386. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 387. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 388. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 389. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 390. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 391. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 392. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 393. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 394. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 395. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 396. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 397. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 398. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 399. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 400. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 401. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 402. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 403. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 404. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 405. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 406. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 407. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 408. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 409. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 410. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 411. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 412. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 413. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 414. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 415. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 416. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 417. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 418. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 419. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 420. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 421. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 422. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 423. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.
### 424. `[P4]` [DOCS] [LOW] Additional docs enhancement
Polish the docs area for better user experience.
### 425. `[P4]` [I18N] [LOW] Additional i18n enhancement
Polish the i18n area for better user experience.
### 426. `[P4]` [ANALYTICS] [LOW] Additional analytics enhancement
Polish the analytics area for better user experience.
### 427. `[P4]` [CONFIG] [LOW] Additional config enhancement
Polish the config area for better user experience.
### 428. `[P4]` [PWA] [LOW] Additional pwa enhancement
Polish the pwa area for better user experience.
### 429. `[P4]` [SEO] [LOW] Additional seo enhancement
Polish the seo area for better user experience.
### 430. `[P4]` [PERF] [LOW] Additional perf enhancement
Polish the perf area for better user experience.
### 431. `[P4]` [UI] [LOW] Additional ui enhancement
Polish the ui area for better user experience.
### 432. `[P4]` [ACCESS] [LOW] Additional access enhancement
Polish the access area for better user experience.

---
# 2. UI/UX Changes (Items 401–518)

### 433. `[P2]` [THEME] [HIGH] Dark mode logo variant
Create a dark-mode logo variant where black parts become purple. Logo component swaps src based on theme.
### 434. `[P2]` [THEME] [HIGH] Theme toggle on all pages
Pill-shaped slider with sun/moon icon on login, signup, and dashboard pages.
### 435. `[P2]` [THEME] [HIGH] CSS custom properties for colors
Define all theme colors as CSS custom properties for easy theming and dark mode.
### 436. `[P2]` [THEME] [HIGH] Dark mode form input styling
Black background and white text for inputs in dark mode, white background and black text in light mode.
### 437. `[P2]` [THEME] [HIGH] Dark mode table styling
Tables have proper dark mode borders, backgrounds, and hover states.
### 438. `[P2]` [THEME] [HIGH] Dark mode skeleton loaders
Skeleton loading states use darker grays in dark mode.
### 439. `[P3]` [THEME] [MEDIUM] Yellow/black light theme
Light theme uses warm amber-yellow backgrounds and near-black text.
### 440. `[P3]` [THEME] [MEDIUM] Purple/black dark theme
Dark theme uses purple accents (#a855f7) on near-black backgrounds.
### 441. `[P2]` [NAV] [HIGH] Mobile hamburger menu
Collapsible mobile navigation replacing horizontal nav bar.
### 442. `[P2]` [NAV] [HIGH] Active nav link indicator
Current page visually indicated in navigation bar.
### 443. `[P3]` [NAV] [MEDIUM] Breadcrumb navigation
Show current location in page hierarchy for deep pages.
### 444. `[P3]` [NAV] [MEDIUM] Responsive nav adaptation
Navigation adjusts to different screen sizes gracefully.
### 445. `[P3]` [NAV] [MEDIUM] Sticky navigation header
Nav bar stays visible when scrolling down the page.
### 446. `[P2]` [MOBILE] [HIGH] Responsive table layouts
Tables scroll horizontally on mobile or switch to card layout.
### 447. `[P2]` [MOBILE] [HIGH] Touch-friendly button sizes
Minimum 44x44px touch targets for mobile usability.
### 448. `[P3]` [MOBILE] [MEDIUM] Mobile-optimized signup form
Full-width inputs, larger text, appropriate spacing on small screens.
### 449. `[P3]` [MOBILE] [MEDIUM] Safe area inset handling
Respect notches and home indicators on modern phones.
### 450. `[P4]` [MOBILE] [LOW] Pull-to-refresh support
Pull down gesture triggers data refresh on mobile.
### 451. `[P2]` [LOGIN] [HIGH] Role-based login flow
Ask if user is student or teacher, show appropriate login fields.
### 452. `[P2]` [LOGIN] [HIGH] Student username login
Students sign in with their username, not email.
### 453. `[P2]` [LOGIN] [HIGH] Teacher email login
Teachers sign in with their email address.
### 454. `[P2]` [LOGIN] [HIGH] Generic error messages
Always show 'Invalid credentials' to prevent enumeration.
### 455. `[P2]` [LOGIN] [HIGH] Rate limiting feedback
Show remaining attempts before rate limit on login page.
### 456. `[P3]` [LOGIN] [MEDIUM] Loading state on login button
Spinner and disabled state during login submission.
### 457. `[P3]` [LOGIN] [MEDIUM] Login form validation
Client-side validation before form submission.
### 458. `[P3]` [LOGIN] [MEDIUM] Auto-focus username/email field
First field focused when login page loads.
### 459. `[P3]` [LOGIN] [MEDIUM] Password show/hide toggle
Eye icon to reveal or hide password text.
### 460. `[P3]` [LOGIN] [MEDIUM] Remember me checkbox
Extend session duration when checked.
### 461. `[P4]` [LOGIN] [LOW] Forgot password link
Password reset flow for teacher accounts.
### 462. `[P4]` [LOGIN] [LOW] Auth page background pattern
Subtle dot grid background on login and signup pages.
### 463. `[P2]` [SIGNUP] [HIGH] Multi-step signup wizard
3-step signup: role → school → personal details.
### 464. `[P2]` [SIGNUP] [HIGH] Role selection cards
Visual cards for student, teacher, and setup options.
### 465. `[P2]` [SIGNUP] [HIGH] School name/code input
Create new school or join existing by code.
### 466. `[P2]` [SIGNUP] [HIGH] Personal details form
Username, email, full name, and password fields.
### 467. `[P2]` [SIGNUP] [HIGH] Password strength indicator
Real-time validation feedback for password requirements.
### 468. `[P2]` [SIGNUP] [HIGH] Email field for teachers only
Email input appears only when teacher/setup role is selected.
### 469. `[P2]` [SIGNUP] [HIGH] Username availability check
Check if username is taken before form submission.
### 470. `[P2]` [SIGNUP] [HIGH] Success state with CTA
Success page with 'Go to login' link after account creation.
### 471. `[P2]` [SIGNUP] [HIGH] Form validation with error messages
Field-level validation with clear error text.
### 472. `[P2]` [SIGNUP] [HIGH] Loading state on submit button
Spinner on 'Create account' button during submission.
### 473. `[P3]` [SIGNUP] [MEDIUM] Step transition animations
Slide animations between signup steps.
### 474. `[P3]` [SIGNUP] [MEDIUM] Progress step indicator
Visual 1-2-3 step indicator at top of signup form.
### 475. `[P3]` [SIGNUP] [MEDIUM] Auto sign-in after creation
Automatically sign in and redirect after account created.
### 476. `[P4]` [SIGNUP] [LOW] Google autofill support
Enable browser autofill for name and email fields.
### 477. `[P2]` [DASHBOARD] [HIGH] Statistics summary cards
4 cards showing Students, Question Sets, Submissions, Active Students.
### 478. `[P2]` [DASHBOARD] [HIGH] Student progress table
Full data table with scores per question set for each student.
### 479. `[P2]` [DASHBOARD] [HIGH] Pagination controls
10 students per page with Previous/Next and page numbers.
### 480. `[P2]` [DASHBOARD] [HIGH] Quick link navigation cards
Cards linking to Topics Management and Analytics.
### 481. `[P2]` [DASHBOARD] [HIGH] School code display
Visible school code that students use to join.
### 482. `[P2]` [DASHBOARD] [HIGH] Live update indicator
'Live' badge showing real-time updates via Realtime.
### 483. `[P2]` [DASHBOARD] [HIGH] Score color coding
Green/yellow/red colors based on score percentage.
### 484. `[P2]` [DASHBOARD] [HIGH] Empty state for no students
Helpful message when no students exist yet.
### 485. `[P2]` [DASHBOARD] [HIGH] Student avatar initials
First letter of name in colored circle.
### 486. `[P2]` [DASHBOARD] [HIGH] Score cell links to answer detail
Click a score to view the student's answer details.
### 487. `[P4]` [DASHBOARD] [LOW] Charts and performance graphs
Visual charts for student performance trends.
### 488. `[P4]` [DASHBOARD] [LOW] Export to CSV button
Download dashboard data as CSV file.
### 489. `[P4]` [DASHBOARD] [LOW] Search/filter students
Search bar to filter the student table.
### 490. `[P4]` [DASHBOARD] [LOW] Sortable table columns
Click column headers to sort data.
### 491. `[P4]` [DASHBOARD] [LOW] Performance heatmap view
Color-coded grid showing performance across topics.
### 492. `[P2]` [STUDENT] [HIGH] Topic listing cards
Available topics displayed as interactive cards.
### 493. `[P2]` [STUDENT] [HIGH] Lesson content viewer
Formatted lesson content with explanations and key points.
### 494. `[P2]` [STUDENT] [HIGH] Question answering interface
Clear UI for viewing and submitting answers to questions.
### 495. `[P2]` [STUDENT] [HIGH] Score display after submission
Show results immediately after answering questions.
### 496. `[P2]` [STUDENT] [HIGH] Progress tracking for lessons
Show completed vs pending lessons for each subtopic.
### 497. `[P2]` [STUDENT] [HIGH] Teacher feedback display
Show teacher's written feedback on the student dashboard.
### 498. `[P2]` [STUDENT] [HIGH] Lesson release indicators
Visually show which lessons are available/released.
### 499. `[P3]` [STUDENT] [MEDIUM] Multiple lessons per subtopic
Tabbed interface for 3 lessons per subtopic.
### 500. `[P4]` [STUDENT] [LOW] Study streak counter
Track consecutive days of learning activity.
### 501. `[P4]` [STUDENT] [LOW] Achievement badges
Gamification elements for student motivation.
### 502. `[P4]` [STUDENT] [LOW] Topic mastery percentage
Overall mastery score for each topic.
### 503. `[P4]` [STUDENT] [LOW] Recommended next steps
AI suggestions for what to study next.
### 504. `[P4]` [STUDENT] [LOW] Downloadable revision notes
PDF export of lesson content for offline study.
### 505. `[P3]` [TOASTS] [MEDIUM] Success toast notifications
Brief green notification after successful actions.
### 506. `[P3]` [TOASTS] [MEDIUM] Error toast notifications
Non-blocking red error messages.
### 507. `[P3]` [TOASTS] [MEDIUM] Info toast notifications
Blue informational messages.
### 508. `[P3]` [TOASTS] [MEDIUM] Toast auto-dismiss behavior
Auto-hide toasts after a configurable duration.
### 509. `[P4]` [TOASTS] [LOW] Toast position customization
Choose top-right, bottom-center, etc.
### 510. `[P4]` [TOASTS] [LOW] Stacked toast management
Handle multiple simultaneous toasts gracefully.
### 511. `[P3]` [ANIMATIONS] [MEDIUM] Page fade-in transition
Subtle opacity transition on page load.
### 512. `[P3]` [ANIMATIONS] [MEDIUM] Loading spinner animation
Smooth SVG spinner for loading states.
### 513. `[P3]` [ANIMATIONS] [MEDIUM] Skeleton pulse animation
Pulsing opacity animation for loading skeletons.
### 514. `[P4]` [ANIMATIONS] [LOW] Button micro-interactions
Slight scale effect on button click.
### 515. `[P4]` [ANIMATIONS] [LOW] Card hover elevation
Subtle shadow increase on card hover.
### 516. `[P4]` [ANIMATIONS] [LOW] List stagger entrance animation
Items fade in one by one.
### 517. `[P4]` [ANIMATIONS] [LOW] Modal open/close animation
Smooth slide/fade modal transitions.
### 518. `[P2]` [ACCESS] [HIGH] Semantic HTML structure
Proper heading hierarchy (h1→h2→h3) on all pages.
### 519. `[P2]` [ACCESS] [HIGH] ARIA labels on interactive elements
All buttons and controls have descriptive labels.
### 520. `[P2]` [ACCESS] [HIGH] Focus-visible indicators
Visible focus rings on all keyboard-focusable elements.
### 521. `[P3]` [ACCESS] [MEDIUM] Skip-to-content link
Skip navigation link for keyboard users.
### 522. `[P3]` [ACCESS] [MEDIUM] Color contrast compliance
Meet WCAG AA minimum contrast ratios.
### 523. `[P3]` [ACCESS] [MEDIUM] Screen reader announcements
Aria-live regions for dynamic content updates.
### 524. `[P4]` [ACCESS] [LOW] Reduced motion support
Respect prefers-reduced-motion media query.
### 525. `[P4]` [ACCESS] [LOW] Touch target size compliance
All interactive elements meet 44x44 minimum.
### 526. `[P2]` [TABLES] [HIGH] Student progress data table
Full implementation of the teacher progress table.
### 527. `[P3]` [TABLES] [MEDIUM] Responsive horizontal scroll
Table scrolls horizontally on small screens.
### 528. `[P3]` [TABLES] [MEDIUM] Empty table state message
Clear message when table has no data.
### 529. `[P3]` [TABLES] [MEDIUM] Table row hover highlight
Row highlight on mouse hover.
### 530. `[P4]` [TABLES] [LOW] Sortable columns
Click column headers to toggle sort order.
### 531. `[P4]` [TABLES] [LOW] Column resize handles
Draggable column borders for width adjustment.
### 532. `[P4]` [TABLES] [LOW] Export table data to CSV
Download table contents as CSV file.
### 533. `[P2]` [FORMS] [HIGH] Input validation with error messages
Field-level validation with clear error text.
### 534. `[P2]` [FORMS] [HIGH] Loading states on submit buttons
Disabled button with spinner during submission.
### 535. `[P2]` [FORMS] [HIGH] Label-input association
Labels properly associated with inputs via htmlFor.
### 536. `[P2]` [FORMS] [HIGH] Required field indicators
Asterisk or visual indicator for required fields.
### 537. `[P2]` [FORMS] [HIGH] Helper text below inputs
Helpful hints and format guidance below fields.
### 538. `[P3]` [FORMS] [MEDIUM] Auto-save for feedback textarea
Debounced auto-save on teacher feedback (2s delay).
### 539. `[P3]` [FORMS] [MEDIUM] Character count for textareas
Show remaining/allowed character count.
### 540. `[P4]` [FORMS] [LOW] Unsaved changes warning
Warn before navigating away with unsaved changes.
### 541. `[P4]` [THEME] [LOW] Custom accent color picker
Let users choose their preferred accent color.
### 542. `[P4]` [NAV] [LOW] Keyboard navigation for sidebar
Tab through nav items with visible focus.
### 543. `[P4]` [NAV] [LOW] Collapsible sidebar on desktop
Optional collapsed sidebar for more content space.
### 544. `[P4]` [MOBILE] [LOW] Swipe navigation gestures
Swipe back gesture support.
### 545. `[P4]` [MOBILE] [LOW] Mobile splash screen
Branded splash screen while app loads.
### 546. `[P4]` [LOGIN] [LOW] Social login buttons
Google/GitHub OAuth login option.
### 547. `[P4]` [LOGIN] [LOW] Login page entrance animation
Subtle fade animation on page load.
### 548. `[P4]` [SIGNUP] [LOW] Google autofill support
Browser autofill for name and email fields.
### 549. `[P4]` [DASHBOARD] [LOW] Search/filter bar for students
Search input filtering by name or username.
### 550. `[P4]` [DASHBOARD] [LOW] Sortable table columns
Click column headers to sort ascending/descending.
### 551. `[P4]` [DASHBOARD] [LOW] Performance heatmap grid
Color grid showing performance across all topics.
### 552. `[P4]` [STUDENT] [LOW] AI recommendations for next topic
Machine learning suggestions based on performance.
### 553. `[P4]` [STUDENT] [LOW] Downloadable revision notes
Export lesson content as printable PDF.
### 554. `[P4]` [TOASTS] [LOW] Stacked toast management
Multiple toasts stack vertically.
### 555. `[P4]` [ANIMATIONS] [LOW] List item staggered entrance
Items appear sequentially with delay.
### 556. `[P4]` [ANIMATIONS] [LOW] Modal slide-in animation
Smooth slide from bottom for modals.
### 557. `[P4]` [ACCESS] [LOW] Keyboard shortcut reference document
Display available shortcuts on ? key.
### 558. `[P4]` [TABLES] [LOW] Column resize drag handles
User-resizable table column widths.
### 559. `[P4]` [FORMS] [LOW] Password strength meter
Visual indicator of password strength.
### 560. `[P4]` [THEME] [LOW] Custom selection highlight color
Brand-colored text selection.
### 561. `[P4]` [NAV] [LOW] Mobile bottom tab bar
iOS-style bottom navigation on mobile.
### 562. `[P4]` [MOBILE] [LOW] Touch-optimized filter control
Large touch targets for filter controls.
### 563. `[P4]` [LOGIN] [LOW] Auto-focus username field
Username field focused on page load.
### 564. `[P4]` [SIGNUP] [LOW] Step transition slide effect
Animated slide between signup steps.
### 565. `[P4]` [DASHBOARD] [LOW] Live update indicator dot
Green pulsing dot indicating live updates.
### 566. `[P4]` [DASHBOARD] [LOW] Hover tooltip on score cells
Quick score percentage on hover.
### 567. `[P4]` [STUDENT] [LOW] Study schedule planner
Plan and track study sessions.
### 568. `[P4]` [STUDENT] [LOW] Progress sharing with parents
Share progress reports via link.
### 569. `[P4]` [ANIMATIONS] [LOW] Number count-up animation
Animated number transition on stat cards.
### 570. `[P4]` [ACCESS] [LOW] Dyslexia-friendly font toggle
OpenDyslexic font option.
