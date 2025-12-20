# Music Exam Builder - Complete Setup Guide

This guide will walk you through setting up the entire Music Exam Builder application from scratch.

## 📋 Prerequisites

Before you begin, ensure you have:
- Node.js 18 or higher installed
- npm or yarn package manager
- A Supabase account (free tier works great)
- A code editor (VS Code recommended)

## 🚀 Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in the details:
   - **Name**: music-exam-builder
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select the closest to your users
4. Wait for the project to be created (takes ~2 minutes)

### 1.2 Run the Database Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click **Run** (bottom right)
6. Verify success - you should see "Success. No rows returned"

### 1.3 Create Storage Buckets

1. In Supabase Dashboard, go to **Storage**
2. Create these four buckets:

#### Bucket 1: `audio-files` (Public)
- Click "New bucket"
- Name: `audio-files`
- Public bucket: **ON**
- Click "Create bucket"

#### Bucket 2: `notation-files` (Public)
- Click "New bucket"
- Name: `notation-files`
- Public bucket: **ON**
- Click "Create bucket"

#### Bucket 3: `student-submissions` (Private)
- Click "New bucket"
- Name: `student-submissions`
- Public bucket: **OFF**
- Click "Create bucket"

#### Bucket 4: `institution-assets` (Public)
- Click "New bucket"
- Name: `institution-assets`
- Public bucket: **ON**
- Click "Create bucket"

### 1.4 Get Your API Keys

1. Go to **Settings** → **API**
2. Copy these values (you'll need them soon):
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys") - ⚠️ **Keep this secret!**

## 🔧 Step 2: Set Up the Backend

### 2.1 Install Dependencies

```bash
cd backend
npm install
```

### 2.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
PORT=5000
NODE_ENV=development

# Supabase Configuration (paste your values here)
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 2.3 Start the Backend Server

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════╗
║   Music Exam Builder API Server      ║
║   Environment: development            ║
║   Port: 5000                          ║
╚═══════════════════════════════════════╝

Server is running at http://localhost:5000
```

Test it by visiting: http://localhost:5000/health

You should see:
```json
{
  "success": true,
  "message": "Music Exam Builder API is running",
  "timestamp": "2024-..."
}
```

✅ **Backend is ready!** Keep this terminal running.

## 🎨 Step 3: Set Up the Frontend

Open a **new terminal window** (keep the backend running).

### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

### 3.2 Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:5000
```

⚠️ **Important**: Use the **same** Project URL and anon key as in the backend.

### 3.3 Start the Frontend Server

```bash
npm run dev
```

You should see:
```
▲ Next.js 14.0.4
- Local:        http://localhost:3000
```

Visit: http://localhost:3000

✅ **Frontend is ready!** You should see the Music Exam Builder landing page.

## 👤 Step 4: Create Your First User

### 4.1 Register an Account

1. On the homepage, click **"Get Started"** or **"Sign up"**
2. Fill in your details:
   - First Name: Your first name
   - Last Name: Your last name
   - Email: your-email@example.com
   - Password: (at least 6 characters)
3. Click **"Create Account"**

You'll be automatically logged in and redirected to the Student Dashboard.

### 4.2 Make Yourself a Teacher (Optional)

By default, new users are students. To create exams, you need to be a teacher.

**Option A: Using Supabase Dashboard**
1. Go to Supabase Dashboard → **Table Editor** → **profiles**
2. Find your user (by email)
3. Click on the row
4. Change `role` from `STUDENT` to `TEACHER`
5. Click **Save**
6. Logout and login again

**Option B: Using SQL**
1. Go to Supabase **SQL Editor**
2. Run this query (replace with your email):
   ```sql
   UPDATE profiles 
   SET role = 'TEACHER' 
   WHERE email = 'your-email@example.com';
   ```

After changing your role, logout and login again. You'll be redirected to the Teacher Dashboard.

## ✅ Step 5: Verify Everything Works

### Test Student Flow

1. Register a new account (or use existing student account)
2. You should see the Student Dashboard
3. Currently empty (no exams assigned)

### Test Teacher Flow

1. Login with a teacher account
2. You should see the Teacher Dashboard
3. Click **"Create Exam"**
4. You should be able to start creating an exam

## 🎵 Next Steps

Now that your app is running, you can:

1. **Create your first exam** (as a teacher)
2. **Add different question types**:
   - True/False
   - Multiple Choice
   - Listening (upload audio)
   - Transposition (upload notation)
   - Orchestration (upload piano scores)
3. **Assign exams to students**
4. **Take exams as a student**
5. **Grade submissions**

## 📁 Project Structure

```
music-exam-builder/
├── backend/              # Express API server
│   ├── src/
│   │   ├── config/      # Supabase configuration
│   │   ├── controllers/ # Route controllers
│   │   ├── middleware/  # Auth, upload, etc.
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── index.js     # Server entry
│   └── package.json
│
├── frontend/            # Next.js application
│   ├── src/
│   │   ├── app/        # Pages (app router)
│   │   ├── components/ # React components
│   │   └── lib/        # Utilities, API client
│   └── package.json
│
├── shared/              # Shared TypeScript types
│   └── types/
│
└── supabase/           # Database schema
    └── schema.sql
```

## 🐛 Troubleshooting

### Backend won't start
- **Error**: "Missing Supabase configuration"
  - **Solution**: Check your `.env` file has all variables set
  - Make sure there are no extra spaces or quotes

### Frontend can't connect to backend
- **Error**: "Network Error" or 401 errors
  - **Solution**: 
    1. Verify backend is running on port 5000
    2. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
    3. Make sure both use the same Supabase project

### Can't login
- **Error**: "Invalid credentials"
  - **Solution**: 
    1. Verify you created an account first
    2. Check Supabase Dashboard → Authentication → Users
    3. Ensure the user exists

### Profile not found after signup
- **Error**: "User profile not found"
  - **Solution**: 
    1. Check if the database trigger is working
    2. Go to Supabase → Table Editor → profiles
    3. Verify a profile was created with your user ID

### File uploads fail
- **Error**: "Failed to upload"
  - **Solution**:
    1. Verify storage buckets exist in Supabase
    2. Check bucket permissions (public vs private)
    3. Ensure file is under size limit (50MB for audio)

## 📚 Additional Resources

- **Backend API Documentation**: See `backend/README.md`
- **Frontend Documentation**: See `frontend/README.md`
- **Database Schema**: See `supabase/README.md`
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

## 🤝 Need Help?

If you encounter issues:
1. Check the console logs (both backend and frontend terminals)
2. Check browser console (F12) for errors
3. Verify all environment variables are correct
4. Make sure Supabase schema was run successfully

## 🎉 You're All Set!

Your Music Exam Builder application is now running. You can:
- ✅ Create and manage exams as a teacher
- ✅ Take exams as a student
- ✅ Upload audio and notation files
- ✅ Grade subjective questions
- ✅ View results and analytics

Happy exam building! 🎵

