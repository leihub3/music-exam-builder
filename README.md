# Music Exam Builder

A comprehensive web application for music teachers to create and administer exams with support for various question types including listening, transposition, and orchestration questions.

## 🎵 Features

- **Multiple Question Types:**
  - True/False
  - Multiple Choice
  - Listening (audio-based questions)
  - Transposition (instrument transposition exercises)
  - Orchestration (score arrangement tasks)

- **User Roles:**
  - Admin (Platform management)
  - Institution Admin (Manage institution and users)
  - Teacher (Create exams, grade students)
  - Student (Take exams, view results)

- **Built with:**
  - Frontend: Next.js 14+ (React, TypeScript)
  - Backend: Node.js + Express
  - Database: Supabase (PostgreSQL)
  - Storage: Supabase Storage
  - Authentication: Supabase Auth

## 📁 Project Structure

```
music-exam-builder/
├── frontend/          # Next.js application
├── backend/           # Express API server
├── shared/            # Shared TypeScript types
└── supabase/         # Database schema and migrations
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (https://supabase.com)

### Installation

1. **Clone the repository**
   ```bash
   cd music-exam-builder
   ```

2. **Set up Supabase**
   - Create a new project at https://supabase.com
   - Copy your project URL and keys
   - Run the schema.sql file in the Supabase SQL Editor (see supabase/schema.sql)
   - Create storage buckets: audio-files, notation-files, student-submissions, institution-assets

3. **Configure Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Supabase credentials
   npm run dev
   ```

4. **Configure Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📚 Documentation

- [Frontend Documentation](./frontend/README.md)
- [Backend API Documentation](./backend/README.md)
- [Database Schema](./supabase/README.md)

## 🔐 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=development
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

