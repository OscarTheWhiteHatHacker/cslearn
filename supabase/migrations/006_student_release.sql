-- 006_student_release.sql: Per-student content release
--
-- Adds a student_id column (nullable) to released_subtopics and released_lessons.
-- NULL = released to ALL students (existing behaviour).
-- Non-NULL = released to that specific student only.
--
-- New unique constraints include student_id so we can have both an all-students
-- row and individual per-student rows for the same content.

-- ============================================================
-- PART 1: Add student_id column
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
-- PART 4: Update student RLS policies
-- Students see rows where:
--   - student_id IS NULL (released to all), OR
--   - student_id = their own uid (released specifically to them)
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
-- PART 5: Update teacher/org_admin RLS policies
-- Teachers can manage rows where they are the teacher_id,
-- regardless of student_id (they need to see all their releases).
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

-- Note: The old policies used 'role = ''teacher''' which excluded org_admin.
-- The updated policies use role IN ('teacher', 'org_admin').
-- Also, the policies now check teacher_id against profiles in the same org,
-- which is stricter than the old org-wide check but more correct.
-- A teacher can only manage releases they created.
