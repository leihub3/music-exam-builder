# Vercel Deployment Guide

This project is configured for deployment to Vercel.

## Frontend Deployment

The frontend (Next.js app) is ready to deploy to Vercel.

### Steps to Deploy:

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - **Important**: In Project Settings > General, set the **Root Directory** to `frontend`
   - Vercel will auto-detect the Next.js framework

2. **Configure Environment Variables**
   In the Vercel dashboard, add these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `NEXT_PUBLIC_API_URL` - Your backend API URL (e.g., `https://your-backend.vercel.app` or wherever your backend is hosted)

3. **Deploy**
   - Vercel will automatically build and deploy on every push to your main branch
   - Make sure the Root Directory is set to `frontend` in Project Settings

## Backend Deployment

The backend Express server needs to be deployed separately. You have two options:

### Option 1: Deploy Backend as Separate Service
- Deploy to a service like Railway, Render, or Fly.io
- Update `NEXT_PUBLIC_API_URL` in Vercel to point to your backend URL

### Option 2: Convert to Next.js API Routes (Recommended for Vercel)
- Migrate Express routes to Next.js API routes in `frontend/src/app/api/`
- This allows both frontend and backend to be deployed together on Vercel
- No separate backend service needed

## Monorepo Structure

This is a monorepo with:
- `frontend/` - Next.js application (deployed to Vercel)
- `backend/` - Express API server (deploy separately or convert to API routes)
- `shared/` - Shared TypeScript types (automatically included)

**Important**: Configure the Root Directory as `frontend` in Vercel Project Settings so Vercel knows to build from the frontend folder.

## Build Process

Vercel will:
1. Install dependencies (including the local `shared` package)
2. Build the Next.js application
3. Deploy the optimized production build

## Troubleshooting

- **Build fails with shared package**: Ensure the `shared` directory is committed to Git
- **Environment variables not working**: Make sure all `NEXT_PUBLIC_*` variables are set in Vercel dashboard
- **API calls failing**: Verify `NEXT_PUBLIC_API_URL` points to your deployed backend

