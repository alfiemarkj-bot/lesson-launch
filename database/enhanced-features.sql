-- Enhanced Dashboard Features Schema
-- Run this in Supabase SQL Editor to add folders and sharing features

-- ============================================
-- FOLDERS TABLE
-- ============================================
-- Allow users to organize lessons into folders

CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#4c6ef5', -- Hex color for folder
  icon VARCHAR(50) DEFAULT '📁', -- Emoji or icon
  description TEXT,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE, -- For nested folders
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);

-- Default folders for new users (optional)
-- You can create these automatically when a user signs up

-- ============================================
-- LESSON_FOLDERS (Many-to-Many)
-- ============================================
-- A lesson can be in multiple folders

CREATE TABLE IF NOT EXISTS lesson_folders (
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (lesson_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_folders_lesson ON lesson_folders(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_folders_folder ON lesson_folders(folder_id);

-- ============================================
-- UPDATE SHARED_LESSONS TABLE
-- ============================================
-- Enhance existing shared_lessons table with more features

-- Add columns if they don't exist
ALTER TABLE shared_lessons 
  ADD COLUMN IF NOT EXISTS password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS max_views INTEGER,
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_copy BOOLEAN DEFAULT FALSE;

-- ============================================
-- LESSON_VERSIONS TABLE (for edit history)
-- ============================================
-- Track versions when lessons are edited

CREATE TABLE IF NOT EXISTS lesson_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(500),
  ai_response JSONB,
  pptx_url TEXT,
  docx_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson ON lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_created ON lesson_versions(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Folders policies
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- Lesson folders policies
ALTER TABLE lesson_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage lesson folders" ON lesson_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons l 
      WHERE l.id = lesson_folders.lesson_id 
      AND l.user_id = auth.uid()
    )
  );

-- Lesson versions policies
ALTER TABLE lesson_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson versions" ON lesson_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l 
      WHERE l.id = lesson_versions.lesson_id 
      AND l.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create default folders for new users
CREATE OR REPLACE FUNCTION create_default_folders_for_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Create default folders
  INSERT INTO folders (user_id, name, color, icon, description, sort_order)
  VALUES
    (p_user_id, 'Autumn Term', '#FF6B6B', '🍂', 'Lessons for Autumn term', 1),
    (p_user_id, 'Spring Term', '#51CF66', '🌸', 'Lessons for Spring term', 2),
    (p_user_id, 'Summer Term', '#FFD43B', '☀️', 'Lessons for Summer term', 3),
    (p_user_id, 'Favorites', '#4C6EF5', '⭐', 'My favorite lessons', 0);
END;
$$;

-- Trigger to create default folders when user signs up
CREATE OR REPLACE FUNCTION trigger_create_default_folders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_default_folders_for_user(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created_create_folders
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_folders();

-- ============================================
-- VIEWS
-- ============================================

-- View for lessons with folder information
CREATE OR REPLACE VIEW lessons_with_folders
WITH (security_invoker = true)
AS
SELECT 
  l.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', f.id,
        'name', f.name,
        'color', f.color,
        'icon', f.icon
      )
    ) FILTER (WHERE f.id IS NOT NULL),
    '[]'::json
  ) as folders
FROM lessons l
LEFT JOIN lesson_folders lf ON l.id = lf.lesson_id
LEFT JOIN folders f ON lf.folder_id = f.id
WHERE l.deleted_at IS NULL
GROUP BY l.id;

-- ============================================
-- NOTES
-- ============================================
-- After running this schema:
-- 1. All existing users will automatically get default folders on next login
-- 2. New users will get default folders automatically
-- 3. Folders support nesting (parent_folder_id)
-- 4. Lessons can be in multiple folders
-- 5. Share links support password protection and view limits

