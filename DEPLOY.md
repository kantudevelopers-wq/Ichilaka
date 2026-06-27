# 🚀 Deploy ZamBrew to Render.com (Free)

## Step 1: Create a GitHub Account
- Go to https://github.com
- Sign up with your email

## Step 2: Upload Your Code
1. On GitHub, click the **+** button → **New repository**
2. Name it `zambrew`
3. Click **Create repository**
4. You will see instructions. Use this method:

### On your phone, download these apps:
- **GitHub Mobile** (from Play Store/App Store) — OR —
- Use **MGit** (Android) or **Working Copy** (iPhone)

### Or use the website:
1. Go to your new GitHub repo
2. Click **"uploading an existing file"**
3. Upload ALL files from the `zambrew-system` folder:
   - server.js
   - package.json
   - render.yaml
   - README.md
   - public/ folder (with index.html and admin/index.html)
   - database/ folder (empty is fine)
4. Click **Commit changes**

## Step 3: Deploy on Render.com
1. Go to https://render.com
2. Sign up (use "Sign up with GitHub")
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub account
5. Select your `zambrew` repository
6. Render will auto-detect settings from `render.yaml`
7. Click **"Create Web Service"**
8. Wait 2-3 minutes for deployment

## Step 4: Your Site is Live!
- **Customer App:** https://zambrew.onrender.com (or similar URL)
- **Admin Dashboard:** https://zambrew.onrender.com/admin
- **Login:** username / Careless

## Step 5: Save Your URL
- Copy the URL Render gives you
- Share it with customers
- Bookmark the admin URL for yourself

## Free Plan Limits
- ✅ Stays online 24/7
- ✅ 512 MB RAM
- ✅ 100 GB bandwidth/month
- ⚠️ Spins down after 15 min of inactivity (wakes up in ~30 seconds on next visit)

## Updating Your Site
When you make changes:
1. Upload new files to GitHub
2. Render automatically redeploys
