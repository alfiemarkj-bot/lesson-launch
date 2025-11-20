-- Create admin user records for existing auth users
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/eksbbnszmjauxktwmblj/editor

-- Insert user records with admin privileges
-- These users already exist in Supabase Auth, we're just creating their database records

INSERT INTO public.users (id, email, name, role, subscription_tier, created_at)
VALUES 
  (
    '35254e64-284e-4a24-a2d4-413c443e586d',
    'alfiemarkj@gmail.com',
    'Alfie',
    'admin',
    'unlimited',
    NOW()
  ),
  (
    'a45b0289-f896-4b25-8dbc-ee3bcba31ab3',
    'd.o.lamb2002@gmail.com',
    'Daniel',
    'admin',
    'unlimited',
    NOW()
  )
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  subscription_tier = 'unlimited';

-- Verify the users were created
SELECT email, role, subscription_tier, created_at 
FROM public.users 
ORDER BY created_at DESC;

