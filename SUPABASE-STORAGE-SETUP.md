# Supabase Storage Setup Guide

This guide will help you set up Supabase Storage to persist lesson files (PowerPoint and Word documents) so they're available for download from the dashboard even after the temporary local files are cleaned up.

---

## Why Supabase Storage?

Currently, generated lesson files are stored locally in the `uploads/` folder and deleted after 5 minutes. This means:
- ❌ Users can't download lessons from the dashboard after 5 minutes
- ❌ Files are lost if the server restarts
- ❌ No backup or persistence

With Supabase Storage:
- ✅ Files persist permanently (or until you delete them)
- ✅ Users can download their lessons anytime from the dashboard
- ✅ Files are backed up automatically
- ✅ Secure access via signed URLs

---

## Step 1: Create Storage Bucket

1. Go to your **Supabase Dashboard**
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Fill in the details:
   - **Name:** `lessons` (must match exactly - this is hardcoded in the app)
   - **Public bucket:** ❌ **OFF** (keep it private for security)
   - **File size limit:** 50 MB (default is fine)
   - **Allowed MIME types:** Leave empty (allows all types)
5. Click **Create bucket**

---

## Step 2: Set Up Storage Policies

Storage policies control who can access files. We need to set up Row Level Security (RLS) so users can only access their own files.

### Policy 1: Allow Users to Upload Their Own Files

1. In the Storage section, click on the **`lessons`** bucket
2. Click the **Policies** tab
3. Click **New Policy**
4. Select **For full customization**, click **Use this template**
5. Name: `Users can upload their own files`
6. Policy definition:
   ```sql
   (bucket_id = 'lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
   ```
7. Allowed operation: ✅ **INSERT**
8. Click **Review** then **Save policy**

### Policy 2: Allow Users to Read Their Own Files

1. Click **New Policy** again
2. Name: `Users can read their own files`
3. Policy definition:
   ```sql
   (bucket_id = 'lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
   ```
4. Allowed operation: ✅ **SELECT**
5. Click **Review** then **Save policy**

### Policy 3: Allow Users to Delete Their Own Files

1. Click **New Policy** again
2. Name: `Users can delete their own files`
3. Policy definition:
   ```sql
   (bucket_id = 'lessons'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])
   ```
4. Allowed operation: ✅ **DELETE**
5. Click **Review** then **Save policy**

**What these policies do:**
- Files are stored in paths like: `{user_id}/{filename}`
- The policy checks that `auth.uid()` (logged-in user) matches the folder name (user_id)
- This ensures users can only access files in their own folder

---

## Step 3: Verify Setup

1. **Test file upload:**
   - Generate a new lesson in your app
   - Check the server logs - you should see: `☁️ Uploading files to Supabase Storage...`
   - If successful: `✓ Uploaded to: {user_id}/{filename}`

2. **Check Supabase Storage:**
   - Go to Storage → `lessons` bucket
   - You should see folders named with user IDs (UUIDs)
   - Inside each folder, you'll see `.pptx` and `.docx` files

3. **Test dashboard download:**
   - Go to Dashboard
   - Click the download button (⬇️) on any lesson
   - File should download successfully

---

## Step 4: File Organization

Files are organized in Supabase Storage like this:

```
lessons/
  ├── {user-id-1}/
  │   ├── lesson-1234567890.pptx
  │   └── lesson-resources-1234567890.docx
  ├── {user-id-2}/
  │   ├── lesson-1234567891.pptx
  │   └── lesson-resources-1234567891.docx
  └── ...
```

**Benefits:**
- Easy to find files by user
- Policies automatically restrict access
- Can implement per-user storage quotas later

---

## Troubleshooting

### "Bucket not found" error

**Problem:** Server logs show `Failed to upload file: Bucket not found`

**Solution:**
1. Check that bucket name is exactly `lessons` (case-sensitive)
2. Make sure bucket was created successfully in Supabase dashboard
3. Restart your server after creating the bucket

---

### "new row violates row-level security policy" error

**Problem:** Upload fails with RLS policy violation

**Solution:**
1. Check that all 3 policies are created (INSERT, SELECT, DELETE)
2. Verify policy SQL matches exactly (see Step 2)
3. Make sure user is authenticated (has valid JWT token)
4. Check that file path format is `{user_id}/{filename}`

---

### Files upload but can't download

**Problem:** Files appear in Storage but download fails

**Solution:**
1. Check that SELECT policy is enabled
2. Verify signed URL generation is working (check server logs)
3. Make sure user is authenticated when requesting download
4. Check browser console for CORS errors

---

### "Failed to generate download URL" error

**Problem:** Dashboard shows error when clicking download

**Solution:**
1. Check that file path in database matches storage path
2. Verify SELECT policy allows the user to access the file
3. Check that signed URL expiration is set correctly (default 1 hour)
4. Try regenerating the lesson to create a new file

---

## Storage Costs

**Supabase Free Tier:**
- 1 GB storage
- 2 GB bandwidth/month
- Perfect for testing and small deployments

**Supabase Pro Tier ($25/month):**
- 100 GB storage
- 200 GB bandwidth/month
- Recommended for production

**Estimate:**
- Average PowerPoint: ~500 KB
- Average Word doc: ~200 KB
- 1,000 lessons ≈ 700 MB
- Free tier can handle ~1,400 lessons

---

## Cleanup & Maintenance

### Delete Old Files

If you want to clean up old files:

1. **Via Supabase Dashboard:**
   - Go to Storage → `lessons` bucket
   - Navigate to user folder
   - Select files and click Delete

2. **Via API (future feature):**
   - We can add a cleanup endpoint that deletes files older than X days
   - Or delete files when a lesson is deleted from the dashboard

### Monitor Storage Usage

1. Go to Supabase Dashboard → Settings → Usage
2. Check **Storage** section
3. Monitor your usage vs. plan limits

---

## Next Steps

Once Storage is working:

1. ✅ **Test thoroughly:** Generate lessons, download from dashboard
2. ✅ **Monitor costs:** Check Supabase usage dashboard
3. ✅ **Set up alerts:** Configure Supabase to email when approaching limits
4. ✅ **Plan cleanup:** Decide on file retention policy (30 days? 90 days? Forever?)

---

## Need Help?

- **Supabase Storage Docs:** https://supabase.com/docs/guides/storage
- **Storage Policies:** https://supabase.com/docs/guides/storage/security/access-control
- **Check server logs** for detailed error messages
- **Check browser console** for frontend errors

---

**Last Updated:** January 2025  
**Status:** ✅ Ready for setup

