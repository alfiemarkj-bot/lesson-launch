-- Verify that auto-signup trigger is working
-- Run this in Supabase SQL Editor to check

-- 1. Check if the trigger function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 2. Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name = 'on_auth_user_created';

-- 3. View the function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Check current users table
SELECT email, role, subscription_tier, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

