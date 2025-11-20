# Storage Mitigations Testing Guide

This guide helps you test all the storage mitigations that have been implemented.

---

## Quick Start

### 1. Test Storage Health Check

```bash
npm run test:storage:health
```

Or manually:
```bash
curl http://localhost:3000/api/health/storage
```

**Expected Result:**
```json
{
  "healthy": true,
  "bucketExists": true,
  "quota": {
    "isHealthy": true,
    "usagePercent": 45.2,
    "estimatedSizeMB": 462.5,
    "quotaMB": 1024,
    "totalFiles": 925
  }
}
```

---

### 2. Test Storage Quota Monitoring

First, get your JWT token from the browser (after logging in):
1. Open browser DevTools (F12)
2. Go to Application/Storage → Local Storage
3. Find `supabase.auth.token` and copy the `access_token` value

Add to `.env`:
```env
TEST_TOKEN=your_jwt_token_here
```

Then run:
```bash
npm run test:storage:quota
```

Or manually:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/storage/usage
```

**Expected Result:**
```json
{
  "success": true,
  "usage": {
    "totalFiles": 925,
    "estimatedSizeMB": 462.5
  },
  "quota": {
    "isHealthy": true,
    "usagePercent": 45.2,
    "estimatedSizeMB": 462.5,
    "quotaMB": 1024,
    "totalFiles": 925
  }
}
```

---

### 3. Test All Storage Mitigations

```bash
npm run test:storage
```

This runs all tests:
- ✅ General health endpoint
- ✅ Storage health check
- ✅ Quota monitoring
- ✅ Cleanup endpoints

---

## Manual Testing Scenarios

### Test 1: Storage Health Check Endpoint

**Test:** Verify health check endpoint works

```bash
# Test health endpoint
curl http://localhost:3000/api/health/storage

# Should return 200 with health status
```

**What to verify:**
- ✅ Endpoint returns 200 status
- ✅ `healthy` field is boolean
- ✅ `bucketExists` is true
- ✅ Quota information is included if healthy

---

### Test 2: Bucket Validation on Startup

**Test:** Verify bucket validation runs on server startup

1. **Delete the bucket in Supabase:**
   - Go to Supabase Dashboard → Storage
   - Delete the `lessons` bucket

2. **Restart the server:**
   ```bash
   npm start
   ```

3. **Check server logs:**
   ```
   ❌ Storage initialization failed:
      Bucket 'lessons' not found...
   ```

4. **Recreate the bucket** and restart - should see:
   ```
   ✓ Storage bucket 'lessons' validated
   ```

---

### Test 3: User Notifications for Storage Failures

**Test:** Verify storage errors are returned to frontend

1. **Temporarily break storage:**
   - Change `SUPABASE_URL` in `.env` to an invalid URL
   - Or delete the `lessons` bucket

2. **Generate a lesson:**
   - Go to http://localhost:3000
   - Fill out the form and submit

3. **Check the response:**
   - Open browser DevTools → Network tab
   - Find the `/api/generate-slides` request
   - Check response JSON for `storageWarnings` array

4. **Verify UI:**
   - Should see a yellow warning banner with storage errors
   - Warning should list specific error messages

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "1234567890",
  "pptxFilename": "lesson.pptx",
  "storageWarnings": [
    "PowerPoint upload failed: Bucket not found"
  ]
}
```

---

### Test 4: Retry Mechanism

**Test:** Verify retry logic works for transient errors

1. **Simulate network issue:**
   - Temporarily block network (turn off WiFi for 2 seconds)
   - Or use a proxy to inject delays

2. **Generate a lesson:**
   - Submit the form

3. **Check server logs:**
   ```
   Retrying storage operation (attempt 1/3) after 1000ms...
   Retrying storage operation (attempt 2/3) after 2000ms...
   ```

4. **Verify:**
   - Upload should succeed after retry (if network recovers)
   - Permanent errors (auth, validation) should not retry

---

### Test 5: Storage Quota Monitoring

**Test:** Verify quota warnings appear in dashboard

1. **Set a low quota in `.env`:**
   ```env
   SUPABASE_STORAGE_QUOTA_GB=0.1  # 100MB
   ```

2. **Generate several lessons** to fill storage

3. **Check dashboard:**
   - Go to http://localhost:3000/dashboard.html
   - Should see storage warning banner at top
   - Warning should show usage percentage and progress bar

4. **Test API endpoint:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/storage/usage
   ```

**Expected Warning:**
- Yellow banner if usage > 80%
- Red banner if usage > 100%
- Progress bar showing usage
- Specific warning message

---

### Test 6: Cleanup Job

**Test:** Verify cleanup endpoints work

1. **Test user cleanup:**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"daysOld": 90}' \
     http://localhost:3000/api/storage/cleanup
   ```

2. **Check response:**
   ```json
   {
     "success": true,
     "deleted": 5,
     "errors": 0,
     "message": "Cleaned up 5 files, 0 errors"
   }
   ```

3. **Test scheduled cleanup:**
   - Wait for scheduled cleanup (runs 1 hour after startup, then every 24 hours)
   - Or manually trigger by calling the endpoint
   - Check server logs for cleanup results

---

## Frontend Testing

### Test Storage Warning Display

1. **Generate a lesson with storage failure:**
   - Break storage (delete bucket or invalid URL)
   - Submit lesson generation form

2. **Verify warning appears:**
   - Should see yellow warning banner after form submission
   - Warning should list specific errors
   - Should mention 5-minute local availability

3. **Check dashboard quota warning:**
   - Go to dashboard
   - If quota > 80%, should see warning banner
   - Banner should show usage percentage and progress bar

---

## Integration Testing

### Full Flow Test

1. **Start server:**
   ```bash
   npm start
   ```

2. **Verify startup:**
   - Check logs for: `✓ Storage bucket 'lessons' validated`
   - Check logs for: `✓ Storage cleanup scheduled`

3. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/health/storage
   ```

4. **Generate a lesson:**
   - Submit form on homepage
   - Verify no storage warnings (if storage is healthy)
   - Check dashboard for quota status

5. **Test quota monitoring:**
   - Check dashboard for storage warning (if quota high)
   - Or call `/api/storage/usage` endpoint

6. **Test cleanup:**
   - Call cleanup endpoint
   - Verify old files are deleted

---

## Troubleshooting

### Health Check Fails

**Problem:** `/api/health/storage` returns 503

**Solutions:**
1. Check bucket exists in Supabase Dashboard
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
3. Check network connectivity to Supabase

### Quota Test Fails

**Problem:** `/api/storage/usage` returns 401

**Solutions:**
1. Get valid JWT token from browser
2. Add `TEST_TOKEN` to `.env`
3. Token may have expired - get a fresh one

### Cleanup Returns 0 Files

**Problem:** Cleanup endpoint works but deletes 0 files

**This is normal if:**
- No files are older than the specified days
- No files are soft-deleted
- User has no files to clean up

### Storage Warnings Not Showing

**Problem:** Storage fails but no warning in UI

**Solutions:**
1. Check browser console for errors
2. Verify `storageWarnings` in API response
3. Check that warning div is being inserted into DOM

---

## Test Script Usage

The test script supports multiple test modes:

```bash
# Run all tests
npm run test:storage

# Run specific test
node scripts/test-storage-mitigations.js health
node scripts/test-storage-mitigations.js quota
node scripts/test-storage-mitigations.js cleanup
node scripts/test-storage-mitigations.js general
```

**Environment Variables:**
```env
TEST_BASE_URL=http://localhost:3000  # Default
TEST_TOKEN=your_jwt_token_here        # Required for quota/cleanup tests
```

---

## Expected Test Results

### All Tests Passing

```
🚀 Running All Storage Mitigation Tests
============================================================

🏥 Testing General Health Endpoint...
✅ General health endpoint accessible
✅ Storage health: Healthy

📊 Testing Storage Health Check...
✅ Health check endpoint accessible
✅ Storage is healthy
   Bucket exists: true
   Storage usage: 45.2%

📈 Testing Storage Quota Monitoring...
✅ Quota monitoring endpoint accessible
   Total files: 925
   Estimated size: 462.50 MB
   Usage: 45.2%
   Healthy: Yes

🧹 Testing Cleanup Endpoint...
✅ Cleanup endpoint accessible
   Deleted: 0 files
   Errors: 0

============================================================

📋 Test Results Summary:
   ✅ health: PASSED
   ✅ storageHealth: PASSED
   ✅ quota: PASSED
   ✅ cleanup: PASSED

   Total: 4/4 tests passed

🎉 All tests passed!
```

---

## Next Steps

After testing:

1. ✅ Verify all tests pass
2. ✅ Check dashboard shows quota warnings when appropriate
3. ✅ Verify storage warnings appear in UI when uploads fail
4. ✅ Monitor server logs for cleanup jobs
5. ✅ Set up alerts for quota warnings (80% threshold)

---

**Last Updated:** January 2025

