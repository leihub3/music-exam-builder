# Music Exam Builder - Backend API

Express.js backend server with Supabase integration for the Music Exam Builder application.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

### Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Supabase credentials:
   ```
   PORT=5000
   NODE_ENV=development
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase admin client
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   ├── roleCheck.js         # Role-based access control
│   │   └── upload.js            # File upload handling
│   ├── services/
│   │   ├── storageService.js    # Supabase Storage operations
│   │   ├── examService.js       # Exam business logic
│   │   ├── questionService.js   # Question management
│   │   └── attemptService.js    # Exam attempts & grading
│   ├── controllers/
│   │   ├── examController.js    # Exam endpoints
│   │   ├── questionController.js# Question endpoints
│   │   └── attemptController.js # Attempt endpoints
│   ├── routes/
│   │   ├── auth.routes.js       # Authentication routes
│   │   ├── exams.routes.js      # Exam routes
│   │   ├── questions.routes.js  # Question routes
│   │   └── attempts.routes.js   # Attempt routes
│   └── index.js                 # Express app entry point
├── package.json
└── .env.example
```

## 🔐 API Authentication

All API endpoints (except `/health`) require authentication using Supabase JWT tokens.

**Authorization Header:**
```
Authorization: Bearer <supabase_access_token>
```

Get the token from Supabase Auth on the frontend and include it in all API requests.

## 📚 API Endpoints

### Authentication Routes (`/api/auth`)

- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/users/:userId/role` - Change user role (admin only)

### Exam Routes (`/api/exams`)

#### Student Routes
- `GET /api/exams/student/assigned` - Get assigned exams

#### Teacher Routes
- `POST /api/exams` - Create new exam
- `GET /api/exams/teacher` - Get teacher's exams
- `GET /api/exams/institution/:institutionId` - Get institution exams
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/publish` - Publish/unpublish exam
- `POST /api/exams/:id/assign` - Assign exam to students

#### Shared Routes
- `GET /api/exams/:id` - Get exam by ID

### Question Routes (`/api/questions`)

#### Teacher Routes
- `POST /api/questions` - Create question
- `POST /api/questions/upload/audio` - Upload audio file
- `POST /api/questions/upload/notation` - Upload notation file
- `GET /api/questions/section/:sectionId` - Get section questions
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/section/:sectionId/reorder` - Reorder questions

#### Shared Routes
- `GET /api/questions/:id` - Get question by ID

### Attempt Routes (`/api/attempts`)

#### Student Routes
- `POST /api/attempts/start` - Start exam attempt
- `GET /api/attempts/student` - Get student's attempts
- `POST /api/attempts/answer` - Submit answer
- `POST /api/attempts/:id/submit` - Submit exam attempt
- `GET /api/attempts/submission-url` - Get signed URL for submission

#### Teacher Routes
- `GET /api/attempts/exam/:examId` - Get exam attempts
- `POST /api/attempts/answer/:answerId/grade` - Grade answer

#### Shared Routes
- `GET /api/attempts/:id` - Get attempt by ID

## 📝 Example Requests

### Create Exam

```bash
POST /api/exams
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Music Theory Final Exam",
  "description": "Comprehensive music theory assessment",
  "institutionId": "uuid",
  "durationMinutes": 90,
  "passingScore": 70.0
}
```

### Create True/False Question

```bash
POST /api/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "sectionId": "uuid",
  "questionText": "The dominant chord is built on the 5th scale degree.",
  "points": 5,
  "orderIndex": 0,
  "type": "TRUE_FALSE",
  "typeData": {
    "correctAnswer": true
  }
}
```

### Upload Audio for Listening Question

```bash
POST /api/questions/upload/audio
Authorization: Bearer <token>
Content-Type: multipart/form-data

audioFile: <file>
questionId: <uuid>
```

### Submit Answer

```bash
POST /api/attempts/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "attemptId": "uuid",
  "questionId": "uuid",
  "answer": {
    "value": true
  },
  "maxPoints": 5
}
```

## 🔒 Role-Based Access Control

The API implements role-based access control with four roles:

- **ADMIN** - Platform administrator
- **INSTITUTION_ADMIN** - Institution administrator
- **TEACHER** - Can create and grade exams
- **STUDENT** - Can take exams

Use the `requireRole`, `requireTeacher`, `requireInstitutionAdmin`, or `requireAdmin` middleware to protect routes.

## 📦 File Uploads

The API supports file uploads for:

- Audio files (listening questions) - up to 50MB
- Notation files (transposition/orchestration) - up to 10MB
- Student submissions - up to 20MB

Files are stored in Supabase Storage buckets.

## 🧪 Testing

```bash
npm test
```

## 🐛 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## 📊 Logging

The API uses Morgan for HTTP request logging in development mode.

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| NODE_ENV | Environment | No (default: development) |
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_ANON_KEY | Supabase anon key | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key | Yes |
| FRONTEND_URL | Frontend URL for CORS | No (default: http://localhost:3000) |

