-- LessonLaunch Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Extends Supabase auth.users with additional fields

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  school_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'teacher', -- teacher, admin, school_admin
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, teacher, school
  
  -- Usage tracking
  tokens_used INTEGER DEFAULT 0,
  lessons_generated INTEGER DEFAULT 0,
  
  -- Subscription
  stripe_customer_id VARCHAR(255),
  subscription_expires_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  
  -- Account status
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);

-- ============================================
-- USER PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Default lesson settings
  default_key_stage VARCHAR(10), -- ks1, ks2
  favorite_subjects TEXT[],
  default_duration INTEGER DEFAULT 60,
  auto_generate_images BOOLEAN DEFAULT FALSE,
  auto_generate_resources BOOLEAN DEFAULT TRUE,
  auto_generate_scaffolding BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================
-- LESSONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Lesson details
  title VARCHAR(500) NOT NULL,
  topic VARCHAR(500) NOT NULL,
  key_stage VARCHAR(10),
  subject VARCHAR(100),
  duration INTEGER,
  
  -- Generated files
  pptx_url TEXT,
  docx_url TEXT,
  
  -- Original inputs
  notes_text TEXT,
  uploaded_files_count INTEGER DEFAULT 0,
  
  -- Settings used
  additional_resources BOOLEAN DEFAULT FALSE,
  interactive_lesson BOOLEAN DEFAULT FALSE,
  send_scaffolding BOOLEAN DEFAULT FALSE,
  generate_images BOOLEAN DEFAULT FALSE,
  
  -- AI metadata
  slides_count INTEGER,
  questions_count INTEGER,
  images_count INTEGER,
  
  -- Raw AI response (for debugging/editing)
  ai_response JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- processing, completed, failed
  error_message TEXT,
  
  -- Usage tracking
  download_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON lessons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject);
CREATE INDEX IF NOT EXISTS idx_lessons_key_stage ON lessons(key_stage);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_deleted_at ON lessons(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- USAGE LOGS TABLE
-- ============================================
-- Track API costs and usage per lesson

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  
  -- API usage
  openai_tokens_input INTEGER DEFAULT 0,
  openai_tokens_output INTEGER DEFAULT 0,
  dalle_images_generated INTEGER DEFAULT 0,
  
  -- Calculated costs (in cents)
  text_generation_cost DECIMAL(10, 4) DEFAULT 0,
  image_generation_cost DECIMAL(10, 4) DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  
  -- Processing metrics
  processing_time_seconds INTEGER,
  
  -- Metadata
  model_used VARCHAR(50),
  error_occurred BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_lesson_id ON usage_logs(lesson_id);

-- ============================================
-- FAVORITES TABLE (Optional)
-- ============================================
-- For future feature: save favorite lessons

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- ============================================
-- SHARED LESSONS TABLE (Optional)
-- ============================================
-- For future feature: share lessons with colleagues

CREATE TABLE IF NOT EXISTS shared_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Sharing settings
  share_token VARCHAR(255) UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  -- Expiration
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_lessons_token ON shared_lessons(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_lessons_lesson_id ON shared_lessons(lesson_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS for all tables

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_lessons ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Lessons policies
CREATE POLICY "Users can view own lessons" ON lessons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lessons" ON lessons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lessons" ON lessons
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lessons" ON lessons
  FOR DELETE USING (auth.uid() = user_id);

-- Usage logs policies (read-only for users)
CREATE POLICY "Users can view own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Shared lessons policies (can view if public or shared with them)
CREATE POLICY "Anyone can view public shared lessons" ON shared_lessons
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view lessons they shared" ON shared_lessons
  FOR SELECT USING (auth.uid() = shared_by_user_id);

-- ============================================
-- INITIAL DATA / SEED
-- ============================================

-- You can add default data here if needed

-- ============================================
-- VIEWS (Optional - for analytics)
-- ============================================

-- View for monthly usage per user
CREATE OR REPLACE VIEW monthly_user_usage AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as lessons_generated,
  SUM(slides_count) as total_slides,
  SUM(questions_count) as total_questions,
  SUM(images_count) as total_images
FROM lessons
WHERE deleted_at IS NULL
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- View for user stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  u.id,
  u.email,
  u.subscription_tier,
  COUNT(l.id) as total_lessons,
  COUNT(l.id) FILTER (WHERE l.created_at >= DATE_TRUNC('month', NOW())) as lessons_this_month,
  MAX(l.created_at) as last_lesson_generated,
  SUM(ul.total_cost) as total_cost_cents
FROM users u
LEFT JOIN lessons l ON l.user_id = u.id AND l.deleted_at IS NULL
LEFT JOIN usage_logs ul ON ul.user_id = u.id
GROUP BY u.id, u.email, u.subscription_tier;

-- ============================================
-- NOTES
-- ============================================
-- After running this schema:
-- 1. Go to Supabase Dashboard > Authentication > Settings
-- 2. Enable email authentication
-- 3. Configure email templates
-- 4. (Optional) Enable social providers (Google, Microsoft)
-- 5. Set up storage bucket for lesson files:
--    - Go to Storage > Create bucket: 'lessons'
--    - Set bucket to private
--    - Add policies for authenticated users

