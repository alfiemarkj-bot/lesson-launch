# Deployment Guide for LessonLaunch

This guide explains how to deploy your application to the live internet. We recommend **Render** or **Railway** as they are easy to use and support Node.js applications well.

## Prerequisites

1.  **GitHub Account**: You need a GitHub account to host your code.
2.  **Supabase Project**: You already have this configured.
3.  **OpenAI API Key**: You already have this.

## Option 1: Deploy to Render (Recommended)

Render has a generous free tier for web services (though it spins down after inactivity) and is very easy to set up.

### Step 1: Push Code to GitHub

1.  Create a **new repository** on GitHub (e.g., `lesson-launch`).
2.  Run these commands in your terminal (replace `YOUR_USERNAME` and `REPO_NAME`):

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Create Service on Render

1.  Go to [dashboard.render.com](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select the repository you just pushed.
4.  **Name**: `lesson-launch` (or whatever you prefer).
5.  **Region**: Choose the one closest to you (e.g., London, Frankfurt, Oregon).
6.  **Branch**: `main`.
7.  **Runtime**: `Node`.
8.  **Build Command**: `npm install` (default is fine).
9.  **Start Command**: `node server.js` (default is usually `npm start`, which also works).
10. **Instance Type**: Free (for hobby/testing) or Starter ($7/mo for always-on).

### Step 3: Configure Environment Variables

Scroll down to the **Environment Variables** section and add the following keys (copy values from your local `.env` file):

| Key | Value |
| --- | --- |
| `OPENAI_API_KEY` | *Your OpenAI Key* |
| `SUPABASE_URL` | *Your Supabase URL* |
| `SUPABASE_ANON_KEY` | *Your Supabase Anon Key* |
| `SUPABASE_SERVICE_ROLE_KEY` | *Your Service Role Key (for cleanup jobs)* |
| `SUPABASE_STORAGE_QUOTA_GB` | `1` |
| `STORAGE_CLEANUP_DAYS_OLD` | `90` |
| `ENABLE_STORAGE_CLEANUP` | `true` |
| `NODE_VERSION` | `20` (Recommended) |

### Step 4: Deploy

Click **Create Web Service**. Render will clone your repo, install dependencies, and start the server. Watch the logs for "🚀 LessonLaunch server running...".

Your app will be live at `https://lesson-launch.onrender.com`!

---

## Option 2: Deploy to Railway

Railway is robust and offers a trial, then pay-as-you-go.

1.  Go to [railway.app](https://railway.app/).
2.  Login with GitHub.
3.  Click **New Project** -> **Deploy from GitHub repo**.
4.  Select your repo.
5.  Railway will detect Node.js.
6.  Go to the **Variables** tab and add the same variables as above.
7.  Railway will automatically deploy.
8.  Go to **Settings** -> **Domains** to generate a public URL (e.g., `xxx.up.railway.app`).

## Important Notes

*   **Storage**: Your app uses Supabase Storage for permanent files, which is perfect for these platforms. The local `uploads/` folder is used for temporary processing and will be cleared whenever the app restarts (which happens frequently on free tiers). This is **expected behavior** and your code handles it correctly.
*   **Database**: Your database is already in the cloud (Supabase), so no extra setup is needed there.
*   **Cold Starts**: On Render's free tier, the app will "sleep" after 15 minutes of inactivity. The first request after sleep might take 30-60 seconds. Upgrade to a paid plan to avoid this.

