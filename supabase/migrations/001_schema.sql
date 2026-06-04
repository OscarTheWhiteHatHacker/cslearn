-- 1/3: Schema
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT DEFAULT '',
  username TEXT UNIQUE,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS teacher_feedback TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feedback_updated_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Auto-create profiles on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, username)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'role',
    NEW.raw_user_meta_data ->> 'username'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Users can read own profile" ON profiles; CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Teachers read all profiles" ON profiles; CREATE POLICY "Teachers read all profiles" ON profiles FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher');
DROP POLICY IF EXISTS "Users can update own profile" ON profiles; CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles; CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Anyone can read organizations" ON organizations; CREATE POLICY "Anyone can read organizations" ON organizations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations; CREATE POLICY "Authenticated users can insert organizations" ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
