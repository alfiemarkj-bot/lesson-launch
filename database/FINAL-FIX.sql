-- ============================================
-- FINAL FIX: Add missing INSERT policy and create user record
-- ============================================

-- Step 1: Add INSERT policy for users table
-- (The original schema was missing this!)
CREATE POLICY "Users can be created by auth" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 2: Create the trigger function (with SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into users table when someone signs up
  INSERT INTO public.users (
    id,
    email,
    subscription_tier,
    created_at,
    updated_at,
    last_login,
    is_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    NOW(),
    NOW(),
    NOW(),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING; -- Skip if already exists
  
  RETURN NEW;
END;
$$;

-- Step 3: Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Manually insert YOUR user record
-- This will be executed by the service role (bypasses RLS completely)
INSERT INTO public.users (
  id,
  email,
  subscription_tier,
  created_at,
  updated_at,
  last_login,
  is_verified,
  is_active
)
VALUES (
  'a45b0289-f896-4b25-8dbc-ee3bcba31ab3'::uuid,
  'd.o.lamb2002@gmail.com',
  'free',
  NOW(),
  NOW(),
  NOW(),
  TRUE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW(),
  last_login = NOW();

-- Step 5: Verify the user was created
SELECT 
  id, 
  email, 
  subscription_tier,
  is_active,
  created_at
FROM public.users 
WHERE id = 'a45b0289-f896-4b25-8dbc-ee3bcba31ab3'::uuid;

