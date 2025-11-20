-- Security Fixes for Supabase Advisor Issues
-- Run this in Supabase SQL Editor to fix all errors and warnings

-- ============================================
-- FIX 1: Remove problematic views and recreate them properly
-- ============================================

-- Drop the old views
DROP VIEW IF EXISTS monthly_user_usage;
DROP VIEW IF EXISTS user_stats;

-- Recreate views with SECURITY INVOKER (safer - uses permissions of querying user)
CREATE OR REPLACE VIEW monthly_user_usage
WITH (security_invoker = true)
AS
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

CREATE OR REPLACE VIEW user_stats
WITH (security_invoker = true)
AS
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
-- FIX 2: Fix function search path vulnerability
-- ============================================

-- Recreate the function with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- DONE! All SQL errors fixed
-- ============================================

-- Note: The "Leaked Password Protection" warning is a setting you need
-- to enable manually in the Supabase dashboard:
-- Go to: Authentication → Settings → Security → Enable "Leaked Password Protection"

