-- Phase 3: Subjects & Purchases

-- 1. Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_pence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view subjects
CREATE POLICY "Subjects readable" ON subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Add subject_id to topics
ALTER TABLE topics ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);

-- 3. Create org_purchases table
CREATE TABLE IF NOT EXISTS org_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_payment_intent_id TEXT,
  UNIQUE(org_id, subject_id)
);

ALTER TABLE org_purchases ENABLE ROW LEVEL SECURITY;

-- Org admins can manage purchases for their org
CREATE POLICY "Org admins manage purchases" ON org_purchases
  FOR ALL USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'org_admin'
    AND org_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

-- Teachers can view their org's purchases
CREATE POLICY "Teachers view org purchases" ON org_purchases
  FOR SELECT USING (
    org_id IN (
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
        AND organization_id IS NOT NULL
    )
  );

-- 4. Create subject_teacher_access table (org admin controls which teachers see each subject)
CREATE TABLE IF NOT EXISTS subject_teacher_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

ALTER TABLE subject_teacher_access ENABLE ROW LEVEL SECURITY;

-- Org admins can manage access for their org's teachers
CREATE POLICY "Org admins manage teacher access" ON subject_teacher_access
  FOR ALL USING (
    auth.jwt() -> 'user_metadata' ->> 'role' = 'org_admin'
    AND teacher_id IN (
      SELECT id FROM public.profiles
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Teachers can see their own access
CREATE POLICY "Teachers view own access" ON subject_teacher_access
  FOR SELECT USING (teacher_id = auth.uid());

-- 5. Add org_admin role to profiles CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('teacher', 'student', 'org_admin'));

-- 6. Create Computer Science subject
INSERT INTO subjects (name, slug, description, price_pence)
VALUES ('Computer Science', 'computer-science', 'GCSE Computer Science (OCR J277)', 0)
ON CONFLICT (slug) DO NOTHING;

-- 7. Set subject_id on all existing topics
UPDATE topics
SET subject_id = (SELECT id FROM subjects WHERE slug = 'computer-science')
WHERE subject_id IS NULL;

-- 8. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_org_purchases_org_id ON org_purchases(org_id);
CREATE INDEX IF NOT EXISTS idx_org_purchases_subject_id ON org_purchases(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_access_teacher_id ON subject_teacher_access(teacher_id);
CREATE INDEX IF NOT EXISTS idx_subject_teacher_access_subject_id ON subject_teacher_access(subject_id);
