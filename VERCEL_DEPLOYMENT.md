# Vercel Deployment Guide

This project is configured for deployment to Vercel.

## Frontend Deployment

The frontend (Next.js app) is ready to deploy to Vercel.

### Steps to Deploy:

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository

2. **Configure Build Settings (CRITICAL)**
   - Go to **Project Settings** → **General** → **Build & Development Settings**
   - Set the **Root Directory** to `frontend` (this tells Vercel to build from the frontend folder)
   - **IMPORTANT**: Enable **"Include files outside of the Root Directory in the Build Step"** checkbox
     - This is required because your `frontend` depends on the `shared` package which is outside the frontend folder
   - Verify Build Command is set to `npm run build` (or leave as auto-detected)
   - Verify Output Directory is `.next` (or leave as auto-detected)
   - Save the changes

3. **Configure Environment Variables**
   In the Vercel dashboard, add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations in API routes)

4. **Deploy**
   - Trigger a new deployment (or push to your main branch)
   - Vercel will automatically build and deploy on every push
   - Check the build logs to ensure it's building from the `frontend` directory

## Backend Deployment

✅ **The backend has been migrated to Next.js API routes!**

All Express routes have been converted to Next.js API routes located in `frontend/src/app/api/`. This means:
- ✅ No separate backend deployment needed
- ✅ All API routes are deployed together with the frontend on Vercel
- ✅ API calls use relative paths (`/api/...`) - no `NEXT_PUBLIC_API_URL` needed
- ✅ All routes are serverless functions on Vercel

The backend folder (`backend/`) is kept for reference but is no longer needed for deployment.

## Monorepo Structure

This is a monorepo with:
- `frontend/` - Next.js application (deployed to Vercel)
- `backend/` - Express API server (deploy separately or convert to API routes)
- `shared/` - Shared TypeScript types (automatically included)

**Important**: 
- Configure the **Root Directory** as `frontend` in Vercel Project Settings (Project Settings → General → Build & Development Settings)
- The `vercel.json` file at the root specifies the output directory as `.next` (Next.js default)
- When Root Directory is set to `frontend`, all paths in `vercel.json` are relative to the `frontend` directory

## Build Process

Vercel will:
1. Install dependencies (including the local `shared` package)
2. Build the Next.js application
3. Deploy the optimized production build

## Troubleshooting

- **404 Error / NOT_FOUND**: 
  - Verify **Root Directory** is set to `frontend` in Project Settings → Build & Development Settings
  - Ensure **"Include files outside of the Root Directory"** is enabled
  - Check deployment logs to see if the build is running from the correct directory

- **Build fails with shared package**: 
  - Ensure the `shared` directory is committed to Git
  - Enable **"Include files outside of the Root Directory in the Build Step"** in Project Settings
  - Check build logs for module resolution errors

- **Environment variables not working**: 
  - Make sure all `NEXT_PUBLIC_*` variables are set in Vercel dashboard (Settings → Environment Variables)
  - Restart the deployment after adding new environment variables

- **API calls failing**: 
  - API routes are now part of the Next.js app, so they should work automatically
  - Check browser console for authentication or network errors
  - Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly for admin operations

