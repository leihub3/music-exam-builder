# Quick Start Guide - Music Exam Builder

Get up and running in 5 minutes!

## 🚀 Prerequisites

- Node.js 18+
- Supabase account

## 📝 Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. In SQL Editor, run the contents of `supabase/schema.sql`
3. In Storage, create 4 buckets:
   - `audio-files` (public)
   - `notation-files` (public)
   - `student-submissions` (private)
   - `institution-assets` (public)
4. Copy your Project URL and API keys from Settings → API

### 2. Configure Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Configure Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

Frontend runs on: http://localhost:3000

### 4. Create Account

1. Visit http://localhost:3000
2. Click "Get Started" → Register
3. Login with your new account

### 5. Make Yourself a Teacher

In Supabase Dashboard → Table Editor → profiles:
- Find your user
- Change `role` to `TEACHER`
- Logout and login again

## ✅ Done!

You can now:
- Create exams (Teacher Dashboard)
- Add questions of all types
- Assign to students
- Take and grade exams

## 📚 Full Setup Guide

For detailed instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 🐛 Issues?

- Backend won't start? Check `.env` file
- Can't login? Verify Supabase credentials match
- Upload fails? Check storage buckets exist

## 🎯 Environment Variables

**Backend `.env`:**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:5000
```

