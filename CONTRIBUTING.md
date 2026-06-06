# Contributing to CSLearn

Thank you for your interest in contributing to CSLearn, the GCSE Computer Science AI Tutor platform.

## Getting Started

### Prerequisites

- **Node.js 18+** (see `.nvmrc` for exact version)
- **npm** (comes with Node.js)
- A **Supabase** project (free tier works)
- An **OpenRouter API key** (free models available)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repo-url>
   cd cslearn
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example env file and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

   Required variables:

   | Variable | Description |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
   | `NEXT_PUBLIC_SITE_URL` | Your site URL (e.g., `http://localhost:3000`) |
   | `OPENROUTER_API_KEY` | Your OpenRouter API key for AI features |

4. **Run database migrations**

   Apply the Supabase schema and Row Level Security policies from the SQL files in the project root.

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint checks |
| `npm run lint:fix` | Auto-fix lint warnings |

## Code Style Guide

### TypeScript & React

- Use **TypeScript** for all files. Avoid `any` — use explicit types or proper generics.
- Prefer **functional components** with hooks over class components.
- Use `'use client'` directive only when the component needs browser APIs (events, state, effects).
- Server components are the default — keep logic there when possible.

### Naming Conventions

- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Components**: PascalCase (`<UserProfile />`)
- **Functions**: camelCase (`fetchUserData`)
- **Variables**: camelCase (`isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **CSS classes**: Tailwind utility classes (no custom CSS unless necessary)

### Imports Order

1. React / Next.js
2. Third-party libraries
3. Internal modules (`@/lib/*`, `@/components/*`)
4. Relative imports (`./component`)

### File Structure

```
components/
├── ui/            # Base UI primitives (Button, Input, Card, etc.)
├── *.tsx          # Feature-specific components
app/
├── (route)/
│   ├── page.tsx   # Main page component
│   ├── layout.tsx # Layout wrapper
│   ├── loading.tsx# Loading state
│   └── error.tsx  # Error boundary
lib/
├── supabase/      # Supabase client configuration
├── constants.ts   # App-wide constants
└── utils.ts       # Utility functions
```

### Component Guidelines

- **UI primitives** go in `components/ui/`. They are generic, reusable, and accept className for styling.
- **Feature components** go in `components/` and import UI primitives.
- Keep components focused — one responsibility per file.
- Use the `cn()` utility from `@/lib/utils` for conditional class merging.

### Styling

- Use **Tailwind CSS** utility classes exclusively.
- Define custom theme values in `tailwind.config.ts`.
- Dark mode uses the `class` strategy — apply `.dark` overrides where needed.
- Prefer `@apply` only in global CSS for base layer styles (focus rings, etc.).
- All colors should come from the Tailwind palette or CSS custom properties.

### Accessibility

- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<button>`, etc.).
- Include `aria-label` on icon-only buttons and interactive elements.
- Support `prefers-reduced-motion` (already configured in `globals.css`).
- Ensure keyboard navigation works via `focus-visible` styles.
- Use `aria-live` regions for dynamic content updates.

### Forms & Validation

- Use the `<Input>` component from `@/components/ui/Input` for form fields.
- Use the `<Button>` component from `@/components/ui/Button` for form submissions.
- Validate inputs on both client and server side.
- Use `zod` schemas for API-level validation.

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name:
   - `fix/description` for bug fixes
   - `feature/description` for new features
   - `chore/description` for maintenance tasks

2. **Make your changes** following the code style guide above.

3. **Run lint checks** before submitting:

   ```bash
   npm run lint
   ```

4. **Update documentation** if your change affects setup, configuration, or public APIs.

5. **Create a pull request** against `main` with:
   - Clear description of what changed and why
   - Screenshots for UI changes
   - Any migration steps or environment variable additions

6. **Code review** — at least one maintainer must approve before merging.

7. **Merge** using squash merge to keep history clean.

## Reporting Issues

- Use the GitHub issue tracker.
- Include steps to reproduce, expected behavior, and actual behavior.
- Mention browser/OS if the issue is UI-related.

## Questions?

Open a discussion on the repository or contact the maintainers.
