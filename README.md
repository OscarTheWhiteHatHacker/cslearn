# GCSE Computer Science AI Tutor (CSLearn)

An AI-powered tutoring platform for GCSE Computer Science students and teachers.
CSLearn enables teachers to create and release curriculum content, generate question sets,
and track student progress — all within a school-organized environment.

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14.2 (App Router, TypeScript) |
| **Styling** | Tailwind CSS with dark mode (class strategy) |
| **Authentication** | Supabase Auth (email/password via username lookup) |
| **Database** | Supabase PostgreSQL with Row Level Security |
| **AI / Question Generation** | OpenRouter API (free models) |
| **Validation** | Zod schemas |
| **Deployment** | Vercel |

## Features

- **Role-based access** — Student and Teacher dashboards with separate routes
- **School organization** — Teachers create or join schools; students join via school code
- **Curriculum management** — Topics, subtopics with JSON-structured lesson content
- **Question sets** — Teachers generate AI-powered question sets for any subtopic
- **Student answers** — Students answer questions and receive scores
- **Live progress tracking** — Teacher dashboard with real-time updates via Supabase Realtime
- **Dark mode** — System-aware with manual toggle and persistence

## Getting Started

### Prerequisites

- Node.js 18+ (see `.nvmrc`)
- npm
- A Supabase project (free tier)
- An OpenRouter API key (free tier available)

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `NEXT_PUBLIC_SITE_URL` | Your site URL (e.g., `http://localhost:3000`) |

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

Apply the Supabase schema by running the SQL files in the project root against your Supabase project's SQL editor:

- `supabase-rls-fix.sql` — Tables, RLS policies, and triggers

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page (role-based redirect)
│   ├── globals.css             # Global styles and dark mode overrides
│   ├── not-found.tsx           # 404 page
│   ├── error.tsx               # Global error boundary
│   ├── global-error.tsx        # Critical error boundary
│   ├── auth/
│   │   ├── login/page.tsx      # Login with username
│   │   ├── signup/page.tsx     # Multi-step signup with school selection
│   │   ├── callback/route.ts   # Auth callback handler
│   │   └── signout/route.ts    # Sign out handler
│   ├── teacher/
│   │   ├── layout.tsx          # Teacher layout with navigation
│   │   ├── page.tsx            # Teacher dashboard (live progress)
│   │   ├── topics/             # Topic and question set management
│   │   ├── students/           # Student list and detail views
│   │   └── answers/            # Individual answer reviews
│   └── student/
│       ├── layout.tsx          # Student layout with navigation
│       ├── page.tsx            # Student dashboard
│       ├── topics/             # Topic browsing and lesson content
│       └── questions/          # Question set answering
├── components/
│   ├── ui/                     # Reusable UI primitives
│   │   ├── Button.tsx          # Button component (primary, secondary, ghost, etc.)
│   │   ├── Input.tsx           # Form input with label and validation
│   │   ├── Card.tsx            # Card container
│   │   ├── Spinner.tsx         # Loading spinner
│   │   └── Badge.tsx           # Status badge
│   ├── ThemeToggle.tsx         # Dark mode toggle button
│   ├── ThemeProvider.tsx       # Theme context provider
│   ├── NavLink.tsx             # Active navigation link
│   ├── Skeleton.tsx            # Loading skeleton components
│   ├── ConfirmDialog.tsx       # Confirmation modal
│   └── supabase-provider.tsx   # Auth state provider
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   ├── middleware.ts       # Supabase middleware helper
│   │   └── database.types.ts   # TypeScript types for DB
│   ├── constants.ts            # Application-wide constants
│   ├── utils.ts                # Utility functions (cn, etc.)
│   ├── formatters.ts           # Date and score formatting
│   ├── api-helpers.ts          # API response helpers
│   └── api-auth.ts             # API authentication middleware
├── middleware.ts               # Auth & role-based routing
└── .env.local.example          # Environment variable template
```

## Database Schema

- **profiles** — User profiles with role (teacher/student), organization_id, full_name, username
- **organizations** — School entries with name, slug, and creation metadata
- **topics** — Curriculum topics (Component 01 & 02 for OCR J277)
- **subtopics** — Subtopics with JSON lesson content
- **released_subtopics** — Which teachers have released which subtopics to students
- **released_lessons** — Lesson-level release granularity
- **question_sets** — Teacher-created question sets with AI-generated questions
- **student_answers** — Student submissions with per-question scores
- **teacher_feedback** — Teacher feedback on student answers

## Authentication & Authorization

- **Sign in via username** — Users log in with a username, which resolves to their email internally
- **Role-based routing** — Middleware enforces student vs teacher route access
- **Organization scoping** — Teachers and students within the same organization see each other's data
- **Row Level Security** — All database tables have RLS policies scoped by role and organization
- **Profile auto-creation** — Database trigger creates profile on user signup

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |

## Deployment

This project is deployed on **Vercel**. Pushes to the `main` branch trigger automatic deployments.
Ensure all environment variables are configured in the Vercel project settings.
