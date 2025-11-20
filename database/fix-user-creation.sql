-- FIX: Auto-create user records when auth signup happens
-- This runs with elevated permissions to bypass RLS

-- 1. Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (
    id,
    email,
    subscription_tier,
    created_at,
    updated_at,
    last_login
  )
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    NOW(),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix: Create missing user record for existing auth user
-- Replace with your actual user ID from the error message
INSERT INTO public.users (
  id,
  email,
  subscription_tier,
  created_at,
  updated_at,
  last_login
)
VALUES (
  'a45b0289-f896-4b25-8dbc-ee3bcba31ab3',
  'd.o.lamb2002@gmail.com',
  'free',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING; -- Don't error if already exists

-- 4. Verify the user was created
SELECT 
  id, 
  email, 
  subscription_tier,
  created_at
FROM public.users 
WHERE id = 'a45b0289-f896-4b25-8dbc-ee3bcba31ab3';

