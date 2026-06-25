-- 004_fixes.sql: P1 critical security and database fixes
-- 1. ON DELETE CASCADE for FKs
-- 2. UNIQUE constraint on student_answers
-- 3. CHECK constraints
-- 4. Database indexes
-- 5. Fixed RLS policies (organization-scoped, profiles.role-based)

-- ============================================================
-- PART 1: ON DELETE CASCADE
-- ============================================================

-- Fix released_subtopics.teacher_id FK — add ON DELETE CASCADE
ALTER TABLE IF EXISTS released_subtopics
  DROP CONSTRAINT IF EXISTS released_subtopics_teacher_id_fkey,
  ADD CONSTRAINT released_subtopics_teacher_id_fkey
    FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix question_sets.subtopic_id FK — add ON DELETE CASCADE
ALTER TABLE IF EXISTS question_sets
  DROP CONSTRAINT IF EXISTS question_sets_subtopic_id_fkey,
  ADD CONSTRAINT question_sets_subtopic_id_fkey
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE;

-- ============================================================
-- PART 2: UNIQUE CONSTRAINT on student_answers
-- ============================================================

-- Add UNIQUE(student_id, question_set_id) to prevent duplicate submissions
-- First clean up any duplicates, keeping only the latest submission
DELETE FROM student_answers sa
WHERE EXISTS (
  SELECT 1 FROM student_answers sa2
  WHERE sa2.student_id = sa.student_id
    AND sa2.question_set_id = sa.question_set_id
    AND sa2.submitted_at > sa.submitted_at
);

ALTER TABLE IF EXISTS student_answers
  DROP CONSTRAINT IF EXISTS student_answers_student_id_question_set_id_key,
  ADD CONSTRAINT student_answers_student_id_question_set_id_key
    UNIQUE (student_id, question_set_id);

-- ============================================================
-- PART 3: CHECK CONSTRAINTS
-- ============================================================

-- Clean existing bad data before adding constraints
UPDATE profiles SET role = 'student' WHERE role NOT IN ('student', 'teacher');
UPDATE question_sets SET status = 'draft' WHERE status NOT IN ('draft', 'published', 'archived');
UPDATE topics SET component = '01' WHERE component NOT IN ('01', '02');

ALTER TABLE IF EXISTS profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'teacher'));

ALTER TABLE IF EXISTS question_sets
  DROP CONSTRAINT IF EXISTS question_sets_status_check,
  ADD CONSTRAINT question_sets_status_check
    CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE IF EXISTS topics
  DROP CONSTRAINT IF EXISTS topics_component_check,
  ADD CONSTRAINT topics_component_check
    CHECK (component IN ('01', '02'));

-- ============================================================
-- PART 4: DATABASE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_released_subtopics_teacher_id
  ON public.released_subtopics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_released_subtopics_subtopic_id
  ON public.released_subtopics(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_submitted_at
  ON public.student_answers(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_question_sets_created_at
  ON public.question_sets(created_at DESC);

-- ============================================================
-- PART 5: FIXED RLS POLICIES
-- ============================================================
-- Key changes:
-- 1. Teacher queries scoped by organization_id instead of global role
-- 2. Uses profiles.role via subquery instead of auth.jwt()->>'role'
--    (avoids JWT metadata becoming stale vs DB profile truth)

-- Remove all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Teachers manage released subtopics" ON released_subtopics;
DROP POLICY IF EXISTS "Students view released subtopics" ON released_subtopics;
DROP POLICY IF EXISTS "Teachers manage question sets" ON question_sets;
DROP POLICY IF EXISTS "Students view question sets" ON question_sets;
DROP POLICY IF EXISTS "Students manage own answers" ON student_answers;
DROP POLICY IF EXISTS "Teachers view student answers" ON student_answers;
DROP POLICY IF EXISTS "Teachers manage released lessons" ON released_lessons;
DROP POLICY IF EXISTS "Students view released lessons" ON released_lessons;
DROP POLICY IF EXISTS "Teachers manage lessons" ON lessons;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE released_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE released_lessons ENABLE ROW LEVEL SECURITY;

-- Helper function: check if the current user has a 'teacher' role in profiles
-- Uses SECURITY DEFINER to avoid RLS recursion
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

-- Helper function: get the current user's organization_id
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Teachers can read all profiles within their organization (not globally)
CREATE POLICY "Teachers read org profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR (
      public.is_teacher()
      AND organization_id = public.current_user_org_id()
    )
  );

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert own profile (signup trigger fallback)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ORGANIZATIONS
DROP POLICY IF EXISTS "Anyone can read organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations;
CREATE POLICY "Anyone can read organizations" ON organizations
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert organizations" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- TOPICS / SUBTOPICS (publicly readable, seed inserts allowed)
DROP POLICY IF EXISTS "Topics publicly readable" ON topics;
CREATE POLICY "Topics publicly readable" ON topics
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Subtopics publicly readable" ON subtopics;
CREATE POLICY "Subtopics publicly readable" ON subtopics
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow seed inserts on topics" ON topics;
CREATE POLICY "Allow seed inserts on topics" ON topics
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow seed inserts on subtopics" ON subtopics;
CREATE POLICY "Allow seed inserts on subtopics" ON subtopics
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow seed updates on subtopics" ON subtopics;
CREATE POLICY "Allow seed updates on subtopics" ON subtopics
  FOR UPDATE USING (true) WITH CHECK (true);

-- RELEASED SUBTOPICS
-- Teachers manage releases for their organization
CREATE POLICY "Teachers org manage released subtopics" ON released_subtopics
  FOR ALL USING (
    public.is_teacher()
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );

-- Students view releases from teachers in their organization
CREATE POLICY "Students view org released subtopics" ON released_subtopics
  FOR SELECT USING (
    public.current_user_org_id() IS NOT NULL
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );

-- QUESTION SETS
-- Teachers manage question sets for their organization
CREATE POLICY "Teachers org manage question sets" ON question_sets
  FOR ALL USING (
    public.is_teacher()
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );

-- Students view question sets from teachers in their organization
CREATE POLICY "Students view org question sets" ON question_sets
  FOR SELECT USING (
    public.current_user_org_id() IS NOT NULL
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );

-- STUDENT ANSWERS
-- Students manage own answers
CREATE POLICY "Students manage own answers" ON student_answers
  FOR ALL USING (student_id = auth.uid());

-- Teachers view answers from students in their organization
CREATE POLICY "Teachers org view student answers" ON student_answers
  FOR SELECT USING (
    public.is_teacher()
    AND student_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
    )
  );

-- LESSONS
CREATE POLICY "Lessons readable" ON lessons FOR SELECT USING (true);
CREATE POLICY "Teachers org manage lessons" ON lessons FOR ALL USING (
  public.is_teacher()
);

-- RELEASED LESSONS
CREATE POLICY "Teachers org manage released lessons" ON released_lessons
  FOR ALL USING (
    public.is_teacher()
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );

CREATE POLICY "Students view released lessons" ON released_lessons
  FOR SELECT USING (
    public.current_user_org_id() IS NOT NULL
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = public.current_user_org_id()
        AND role = 'teacher'
    )
  );
