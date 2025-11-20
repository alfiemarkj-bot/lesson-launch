# Supabase Setup Instructions

Follow these steps to set up authentication for LessonLaunch.

---

## Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new organization (e.g., "LessonLaunch")

---

## Step 2: Create New Project

1. Click "New Project"
2. Fill in project details:
   - **Name:** `lessonlaunch-production` (or `lessonlaunch-dev` for testing)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose closest to your users (e.g., `Europe West (London)` for UK)
   - **Pricing Plan:** Free tier is fine to start
3. Click "Create new project"
4. Wait 2-3 minutes for project to provision

---

## Step 3: Get API Credentials

1. In your Supabase dashboard, go to **Settings** (gear icon bottom left)
2. Click **API** in the left sidebar
3. You'll see two important values:
   - **Project URL** (e.g., `https://abcdefghijk.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
4. **Keep this tab open** - you'll need these values next

---

## Step 4: Update Environment Variables

1. Open your `.env` file in the project root
2. Add these two new lines (replace with YOUR values from Step 3):

```bash
# Add these to your .env file:
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_key_here
```

3. Make sure your OpenAI key is still there:
```bash
OPENAI_API_KEY=sk-proj-...your_key...
```

4. Save the `.env` file

---

## Step 5: Run Database Schema

1. In Supabase dashboard, click **SQL Editor** (in left sidebar)
2. Click **New Query**
3. Open the file `database/schema.sql` from this project
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this is good!

This creates all the necessary tables:
- `users` - stores user profiles
- `lessons` - stores generated lessons
- `usage_logs` - tracks API costs
- `user_preferences` - stores user settings
- Plus helpful indexes and security policies

---

## Step 6: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Email Auth**, make sure these are enabled:
   - ✅ **Enable email signup**
   - ✅ **Enable email confirmations** (recommended for production)
3. Under **Email Templates**, you can customize:
   - Welcome email
   - Confirmation email
   - Password reset email
4. **Site URL** should be set to:
   - Development: `http://localhost:3000`
   - Production: `https://lessonlaunch.com` (your actual domain)
5. Click **Save**

---

## Step 7: Update Frontend Config

1. Open `index.html`
2. Find these two lines (around line 507-508):
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace this
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace this
   ```
3. Replace with YOUR values from Step 3:
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_key_here';
   ```
4. Save `index.html`

---

## Step 8: Test Authentication

1. Start your server:
   ```bash
   node server.js
   ```

2. Open browser to `http://localhost:3000`

3. You should see the new login screen

4. **Test Signup:**
   - Click "Sign up"
   - Enter email (use your real email)
   - Enter password (minimum 6 characters)
   - Click "Sign Up"
   - You should see "Account created! Please check your email to verify."

5. **Check your email:**
   - You'll receive a confirmation email from Supabase
   - Click the confirmation link
   - This verifies your account

6. **Test Login:**
   - Return to `http://localhost:3000`
   - Enter your email and password
   - Click "Log In"
   - You should see the main app!

7. **Test Logout:**
   - Click "Logout" in the nav bar
   - You should return to the login screen

8. **Test Lesson Generation:**
   - Log in again
   - Fill out the lesson form
   - Click "Preview your slide deck"
   - It should work as before, but now with authentication!

---

## Step 9: Verify Database

1. Go to **Table Editor** in Supabase dashboard
2. Click on **users** table
3. You should see your user record with:
   - Your email
   - Default `free` subscription tier
   - Created timestamp

4. After generating a lesson, check **lessons** table
   - Should show your lesson record
   - Linked to your user_id

---

## Troubleshooting

### "Invalid JWT token" error
- Make sure you copied the correct `SUPABASE_ANON_KEY` from Supabase
- Check that `.env` file is in the project root
- Restart your server after changing `.env`

### "Failed to authenticate" error
- Check that you ran the database schema (Step 5)
- Verify Row Level Security is enabled on tables
- Check browser console for detailed errors

### Email not received
- Check spam folder
- In Supabase dashboard → Authentication → Settings
- Make sure "Enable email confirmations" is ON
- For development, you can disable confirmations temporarily

### "User already registered" error
- Use a different email, or
- Reset password using "Forgot password?" link

### Can't log in after signup
- If email confirmations are enabled, you MUST click the link in your email first
- Check Supabase dashboard → Authentication → Users to see account status

---

## Optional: Configure Storage for Lesson Files

For storing generated PowerPoint and Word files in Supabase (instead of local filesystem):

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name: `lessons`
4. **Public bucket:** OFF (keep private)
5. Click **Create bucket**

6. Set up Storage Policies:
   - Click on the `lessons` bucket
   - Go to **Policies** tab
   - Add policy for SELECT: `(auth.uid() = user_id)`
   - Add policy for INSERT: `(auth.uid() = user_id)`
   - Add policy for DELETE: `(auth.uid() = user_id)`

This will be used in future updates to store files in the cloud instead of locally.

---

## Next Steps

Once authentication is working:
1. ✅ Authentication is complete!
2. 📊 Next: Add usage tracking (track lessons generated per user)
3. 💳 Next: Integrate Stripe for payments
4. 🚀 Next: Deploy to production hosting

See `PRODUCTION-ROADMAP.md` for the full plan.

---

## Need Help?

- **Supabase Docs:** https://supabase.com/docs/guides/auth
- **Common Issues:** Check the Troubleshooting section above
- **Still stuck?** Check the browser console and Supabase logs for detailed error messages

