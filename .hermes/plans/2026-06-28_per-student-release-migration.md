# Per-Student Content Release — Migration Instructions

## Overview

Adds the ability for teachers and org admins to release content to **specific students** instead of always releasing to everyone in the org.

- `released_subtopics` and `released_lessons` get a nullable `student_id` column
- `NULL` = released to ALL students (existing behaviour, backwards-compatible)
- Non-`NULL` = released to that specific student only
- RLS policies updated to filter by org AND by student targeting

## Prerequisites

Run this query first to check what helper functions exist:

```sql
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname IN ('current_user_org_id', 'is_teacher', 'get_org_teacher_ids');
```

- If all 3 return rows → skip to **Step 2** (just run the migration SQL below)
- If `current_user_org_id` is missing → run **Step 1** first, then **Step 2**

---

## Step 1: Create Helper Functions (if missing)

Run this only if `current_user_org_id()` doesn't exist:

```sql
-- Helper: check if current user is a teacher or org_admin
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'org_admin')
  );
$$;

-- Helper: get current user's org
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: get all teacher IDs in the current user's org
CREATE OR REPLACE FUNCTION public.get_org_teacher_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles
  WHERE organization_id = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
  AND role IN ('teacher', 'org_admin');
$$;
```

---

## Step 2: Run the Migration

```sql
-- ============================================================
-- PART 1: Add student_id column (nullable)
-- ============================================================

ALTER TABLE released_subtopics
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE released_lessons
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- PART 2: Update unique constraints
-- ============================================================

ALTER TABLE released_subtopics
  DROP CONSTRAINT IF EXISTS released_subtopics_subtopic_id_teacher_id_key,
  DROP CONSTRAINT IF EXISTS released_subtopics_subtopic_id_teacher_id_student_id_key,
  ADD CONSTRAINT released_subtopics_subtopic_id_teacher_id_student_id_key
    UNIQUE NULLS NOT DISTINCT (subtopic_id, teacher_id, student_id);

ALTER TABLE released_lessons
  DROP CONSTRAINT IF EXISTS released_lessons_lesson_id_teacher_id_key,
  DROP CONSTRAINT IF EXISTS released_lessons_lesson_id_teacher_id_student_id_key,
  ADD CONSTRAINT released_lessons_lesson_id_teacher_id_student_id_key
    UNIQUE NULLS NOT DISTINCT (lesson_id, teacher_id, student_id);

-- ============================================================
-- PART 3: Indexes for student_id lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_released_subtopics_student_id
  ON public.released_subtopics(student_id);
CREATE INDEX IF NOT EXISTS idx_released_lessons_student_id
  ON public.released_lessons(student_id);

-- ============================================================
-- PART 4: Student RLS — org-scoped + per-student filter
-- ============================================================

DROP POLICY IF EXISTS "Students view org released subtopics" ON released_subtopics;
CREATE POLICY "Students view org released subtopics" ON released_subtopics
  FOR SELECT USING (
    public.current_user_org_id() IS NOT NULL
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role IN ('teacher', 'org_admin')
    )
    AND (student_id IS NULL OR student_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students view released lessons" ON released_lessons;
CREATE POLICY "Students view released lessons" ON released_lessons
  FOR SELECT USING (
    public.current_user_org_id() IS NOT NULL
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role IN ('teacher', 'org_admin')
    )
    AND (student_id IS NULL OR student_id = auth.uid())
  );

-- ============================================================
-- PART 5: Teacher RLS — org-scoped
-- ============================================================

DROP POLICY IF EXISTS "Teachers org manage released subtopics" ON released_subtopics;
CREATE POLICY "Teachers org manage released subtopics" ON released_subtopics
  FOR ALL USING (
    public.is_teacher()
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role IN ('teacher', 'org_admin')
    )
  );

DROP POLICY IF EXISTS "Teachers org manage released lessons" ON released_lessons;
CREATE POLICY "Teachers org manage released lessons" ON released_lessons
  FOR ALL USING (
    public.is_teacher()
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role IN ('teacher', 'org_admin')
    )
  );
```

---

## What Changed (Code Side)

### Files modified (9):
| File | Change |
|---|---|
| `supabase/migrations/006_student_release.sql` | New migration (this file) |
| `app/api/release-subtopic/route.ts` | Accepts `releaseAll` + `studentIds` params, cascade-releases lessons |
| `app/api/release-lesson/route.ts` | Same per-student support + GET status endpoint |
| `components/student-release-modal.tsx` | **New** — searchable multi-select modal for picking students |
| `components/lesson-release-toggle.tsx` | Shows "All students" / "X students" badge, opens modal |
| `components/release-toggle.tsx` | Same pattern for subtopics |
| `app/teacher/topics/[topicId]/page.tsx` | Passes `orgId` to client |
| `app/teacher/topics/[topicId]/topic-client.tsx` | Passes `orgId` to toggle |
| `app/teacher/topics/[topicId]/[subtopicId]/page.tsx` | Passes `orgId` to client |
| `app/teacher/topics/[topicId]/[subtopicId]/subtopic-client.tsx` | Passes `orgId` to toggle |
| `lib/supabase/database.types.ts` | Added `student_id` to type defs |

### No changes needed on student side:
The student queries use RLS directly — the updated policies automatically filter by `student_id IS NULL OR student_id = auth.uid()`, so students only see content released to them or to everyone.

### Org separation:
Every SQL policy and every API query filters by `organization_id`. Org A's data is invisible to Org B.
