# Music Exam Builder - Frontend

Next.js 14 frontend application for the Music Exam Builder platform.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend/README.md)
- Supabase project configured

### Installation

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                       # Next.js app router
│   │   ├── (auth)/               # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/            # User dashboards
│   │   │   ├── student/
│   │   │   └── teacher/
│   │   ├── exam/                 # Exam pages
│   │   │   ├── create/
│   │   │   ├── edit/[id]/
│   │   │   └── take/[id]/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   ├── questions/            # Question type components
│   │   ├── exam/                 # Exam-related components
│   │   └── music/                # Music-specific components
│   ├── lib/
│   │   ├── supabase/             # Supabase client configuration
│   │   ├── api.ts                # API client
│   │   └── utils.ts              # Utility functions
│   └── types/                    # TypeScript type definitions
├── public/
├── package.json
└── tailwind.config.ts
```

## 🎨 UI Components

This project uses:
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives
- **shadcn/ui** component patterns
- **Lucide React** for icons

## 🔐 Authentication

Authentication is handled through Supabase Auth:
- Email/Password authentication
- Automatic session management
- Role-based redirects after login

## 📱 Routes

### Public Routes
- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page

### Protected Routes
- `/dashboard/student` - Student dashboard
- `/dashboard/teacher` - Teacher dashboard
- `/dashboard/admin` - Admin dashboard
- `/exam/create` - Create new exam (teachers)
- `/exam/edit/[id]` - Edit exam (teachers)
- `/exam/take/[id]` - Take exam (students)
- `/exam/results/[id]` - View exam results (teachers)

## 🎵 Music Features

### Audio Player
- Plays audio files for listening questions
- Controls: play, pause, volume
- Progress bar

### Music Notation Display
- Renders MusicXML and PDF scores
- VexFlow integration for notation rendering
- Zoom and navigation controls

### File Upload
- Audio files (MP3, WAV, OGG)
- Notation files (PDF, MusicXML)
- Student submissions

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Components

```bash
# Example: Add a new UI component
npx shadcn-ui@latest add [component-name]
```

## 📦 Key Dependencies

```json
{
  "next": "^14.0.4",
  "react": "^18.2.0",
  "@supabase/auth-helpers-nextjs": "^0.8.7",
  "@supabase/supabase-js": "^2.38.0",
  "axios": "^1.6.2",
  "vexflow": "^4.2.3",
  "howler": "^2.2.4",
  "tailwindcss": "^3.3.6"
}
```

## 🎯 Features by Role

### Student Features
- View assigned exams
- Take exams with timer
- Submit answers
- View results and feedback

### Teacher Features
- Create and edit exams
- Add multiple question types
- Upload audio and notation files
- Assign exams to students
- Grade subjective questions
- View student results

### Admin Features
- Manage institutions
- Manage users and roles
- View platform statistics

## 🌐 API Integration

The frontend communicates with the Express backend through the API client (`src/lib/api.ts`):

```typescript
import { api } from '@/lib/api'

// Example usage
const exams = await api.getTeacherExams()
const attempt = await api.startAttempt(examId)
await api.submitAnswer({ attemptId, questionId, answer, maxPoints })
```

All API calls automatically include the Supabase JWT token for authentication.

## 🎨 Styling

This project uses Tailwind CSS with a custom configuration:

- Theme colors defined in `globals.css`
- Dark mode support (class-based)
- Responsive design (mobile-first)
- Custom animations and transitions

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Yes |
| NEXT_PUBLIC_API_URL | Backend API URL | Yes |

## 📝 TypeScript

This project is fully typed with TypeScript. Shared types are imported from `@music-exam-builder/shared` or defined locally in `src/types/`.

## 🐛 Troubleshooting

### Issue: Cannot connect to API
- Verify backend is running on the correct port
- Check NEXT_PUBLIC_API_URL in .env.local

### Issue: Supabase authentication errors
- Verify Supabase URL and keys
- Check if user exists in profiles table
- Ensure RLS policies are correctly set up

### Issue: File upload fails
- Check file size limits
- Verify Supabase storage buckets exist
- Check storage policies

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/docs/primitives)

