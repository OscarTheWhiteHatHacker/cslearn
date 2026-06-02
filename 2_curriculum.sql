-- 2/3: Curriculum
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), component TEXT NOT NULL, title TEXT NOT NULL, order_number INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), topic_id UUID NOT NULL REFERENCES topics(id), title TEXT NOT NULL, content_json JSONB DEFAULT '{}', order_number INTEGER NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS released_subtopics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subtopic_id UUID NOT NULL REFERENCES subtopics(id), teacher_id UUID NOT NULL REFERENCES profiles(id), created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(subtopic_id, teacher_id)
);
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subtopic_id UUID NOT NULL REFERENCES subtopics(id), teacher_id UUID NOT NULL REFERENCES profiles(id), questions_json JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), question_set_id UUID NOT NULL REFERENCES question_sets(id), student_id UUID NOT NULL REFERENCES profiles(id), answers_json JSONB DEFAULT '[]', scores_json JSONB DEFAULT '[]', feedback_json JSONB DEFAULT '[]', total_score INTEGER DEFAULT 0, submitted_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE topics ENABLE ROW LEVEL SECURITY; ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE released_subtopics ENABLE ROW LEVEL SECURITY; ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY; ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Topics publicly readable" ON topics; CREATE POLICY "Topics publicly readable" ON topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Subtopics publicly readable" ON subtopics; CREATE POLICY "Subtopics publicly readable" ON subtopics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow seed inserts on topics" ON topics; CREATE POLICY "Allow seed inserts on topics" ON topics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow seed inserts on subtopics" ON subtopics; CREATE POLICY "Allow seed inserts on subtopics" ON subtopics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow seed updates on subtopics" ON subtopics; CREATE POLICY "Allow seed updates on subtopics" ON subtopics FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Teachers manage released subtopics" ON released_subtopics; CREATE POLICY "Teachers manage released subtopics" ON released_subtopics FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher');
DROP POLICY IF EXISTS "Students view released subtopics" ON released_subtopics; CREATE POLICY "Students view released subtopics" ON released_subtopics FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'student');
DROP POLICY IF EXISTS "Teachers manage question sets" ON question_sets; CREATE POLICY "Teachers manage question sets" ON question_sets FOR ALL USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher');
DROP POLICY IF EXISTS "Students view question sets" ON question_sets; CREATE POLICY "Students view question sets" ON question_sets FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'student');
DROP POLICY IF EXISTS "Students manage own answers" ON student_answers; CREATE POLICY "Students manage own answers" ON student_answers FOR ALL USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Teachers view student answers" ON student_answers; CREATE POLICY "Teachers view student answers" ON student_answers FOR SELECT USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher');
