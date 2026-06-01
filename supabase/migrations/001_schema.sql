-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id and feedback columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_feedback TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feedback_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own + teachers read all
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Teachers read all profiles" ON profiles;
CREATE POLICY "Teachers read all profiles" ON profiles
  FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher');
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations: anyone can read, authenticated can insert
DROP POLICY IF EXISTS "Anyone can read organizations" ON organizations;
CREATE POLICY "Anyone can read organizations"
  ON organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations;
CREATE POLICY "Authenticated users can insert organizations"
  ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
