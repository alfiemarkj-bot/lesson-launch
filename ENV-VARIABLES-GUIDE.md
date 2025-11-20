# Environment Variables Guide

## ✅ Already Required (You Should Already Have These)

These are required for the app to work at all:

```env
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

# OpenAI API (REQUIRED)
OPENAI_API_KEY=your_openai_key_here
```

---

## 🎯 Optional: Storage Mitigations Configuration

These are **optional** - the system will work with defaults, but you can customize:

### Storage Quota Monitoring

```env
# Storage quota limit in GB (default: 1GB for free tier)
# Set this to match your Supabase plan:
# - Free tier: 1GB
# - Pro tier: 100GB
SUPABASE_STORAGE_QUOTA_GB=1
```

**When to set:**
- If you're on Pro tier (set to 100)
- If you want warnings at a different threshold
- If you want to test quota warnings (set to 0.1 for testing)

**Default:** `1` (1GB)

---

### Storage Cleanup Configuration

```env
# How many days old files should be before cleanup (default: 90 days)
STORAGE_CLEANUP_DAYS_OLD=90

# Enable/disable automatic cleanup (default: enabled)
# Set to 'false' to disable scheduled cleanup
ENABLE_STORAGE_CLEANUP=true
```

**When to set:**
- If you want different retention period (e.g., 30 days, 180 days)
- If you want to disable automatic cleanup

**Defaults:**
- `STORAGE_CLEANUP_DAYS_OLD=90` (90 days)
- `ENABLE_STORAGE_CLEANUP=true` (enabled)

---

### Admin Cleanup (Advanced)

```env
# Service role key for admin cleanup endpoint (optional)
# Only needed if you want to use /api/storage/cleanup/all endpoint
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**When to set:**
- If you want to use the admin cleanup endpoint
- If you want to clean up files for all users (not just current user)

**Default:** Not set (admin cleanup won't work, but user cleanup still works)

**How to get it:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (keep it secret!)

---

### Testing (Optional)

```env
# JWT token for running storage tests (optional)
# Only needed for testing quota/cleanup endpoints
TEST_TOKEN=your_jwt_token_here
```

**When to set:**
- If you want to run `npm run test:storage:quota`
- If you want to test cleanup endpoints

**How to get it:**
1. Log in to your app in browser
2. Open DevTools (F12)
3. Application → Local Storage
4. Find `supabase.auth.token` → copy `access_token`

**Default:** Not set (tests will skip authenticated endpoints)

---

## 📋 Complete .env Example

Here's what a complete `.env` file might look like:

```env
# ============================================
# REQUIRED - App won't work without these
# ============================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
OPENAI_API_KEY=your_openai_key_here

# ============================================
# OPTIONAL - Storage Mitigations
# ============================================
# Storage quota (default: 1GB)
SUPABASE_STORAGE_QUOTA_GB=1

# Cleanup configuration (default: 90 days, enabled)
STORAGE_CLEANUP_DAYS_OLD=90
ENABLE_STORAGE_CLEANUP=true

# Admin cleanup (optional - only if you need it)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Testing (optional - only for running tests)
# TEST_TOKEN=your_jwt_token_here

# ============================================
# OTHER OPTIONAL SETTINGS
# ============================================
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE=10485760
```

---

## 🎯 Quick Answer

**Do you need to add anything?** 

**No!** Everything works with defaults. The app will:
- ✅ Use 1GB quota limit (free tier)
- ✅ Clean up files older than 90 days
- ✅ Enable automatic cleanup
- ✅ Work without admin cleanup endpoint
- ✅ Work without test token

**You only need to add variables if:**
- You're on Pro tier (set `SUPABASE_STORAGE_QUOTA_GB=100`)
- You want different retention period
- You want to disable cleanup
- You want to use admin cleanup
- You want to run tests

---

## 🔍 How to Check What's Set

You can check what values are being used by looking at server logs on startup:

```
✓ Storage bucket 'lessons' validated
✓ Storage cleanup scheduled (every 24 hours, files older than 90 days)
```

Or check the health endpoint:
```bash
curl http://localhost:3000/api/health/storage
```

---

## ⚠️ Important Notes

1. **Never commit `.env` to git** - it contains secrets
2. **Service role key is powerful** - only use in secure environments
3. **Test token expires** - get a fresh one if tests fail
4. **Defaults are safe** - designed to work out of the box

---

**Last Updated:** January 2025

