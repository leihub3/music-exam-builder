# Supabase Setup Guide

## Initial Setup

### 1. Create a Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in project details:
   - Name: music-exam-builder
   - Database Password: (save this securely)
   - Region: (choose closest to your users)

### 2. Run Database Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Copy the contents of `schema.sql`
3. Paste and click **Run**
4. Verify all tables are created in the **Table Editor**

### 3. Create Storage Buckets

1. Go to **Storage** in the Supabase Dashboard
2. Create the following buckets:

#### `audio-files` (Public)
- For listening question audio files
- Make it public: Settings → Public bucket: ON

#### `notation-files` (Public)
- For music notation PDFs and MusicXML files
- Make it public: Settings → Public bucket: ON

#### `student-submissions` (Private)
- For student uploaded files (orchestration/transposition submissions)
- Keep private (default)

#### `institution-assets` (Public)
- For institution logos and assets
- Make it public: Settings → Public bucket: ON

### 4. Configure Storage Policies

For each bucket, add these policies in **Storage Policies**:

#### audio-files & notation-files (Public Read, Teacher Write)
```sql
-- Read Policy (Anyone authenticated)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio-files');

-- Upload Policy (Teachers only)
CREATE POLICY "Teachers can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('TEACHER', 'INSTITUTION_ADMIN', 'ADMIN')
  )
);
```

#### student-submissions (Private - Owner only)
```sql
-- Students can read their own submissions
CREATE POLICY "Students can read own submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can upload to their own folder
CREATE POLICY "Students can upload own submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-submissions' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 5. Get API Keys

1. Go to **Settings** → **API**
2. Copy the following values:
   - Project URL
   - `anon` `public` key (for frontend)
   - `service_role` key (for backend - keep secret!)

### 6. Configure Environment Variables

Update your `.env` files with these values:

**Backend (.env):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema Overview

### Core Tables

- **profiles** - User information (extends auth.users)
- **institutions** - Educational institutions
- **institution_members** - Maps users to institutions
- **exams** - Exam definitions
- **exam_sections** - Sections within exams
- **questions** - Question definitions
- **true_false_questions** - True/False specific data
- **multiple_choice_questions** - Multiple choice specific data
- **listening_questions** - Listening specific data
- **transposition_questions** - Transposition specific data
- **orchestration_questions** - Orchestration specific data
- **exam_assignments** - Assigns exams to students
- **exam_attempts** - Student exam attempts
- **student_answers** - Individual answers

### Key Features

✅ Row Level Security (RLS) enabled on all tables
✅ Automatic profile creation on user signup
✅ Updated_at triggers for modified records
✅ Indexes for query performance
✅ Foreign key constraints for data integrity

## Testing the Setup

### Test Authentication
```javascript
// In your frontend console
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
})
console.log(data, error)
```

### Test Database Query
```javascript
// Query profiles table
const { data, error } = await supabase
  .from('profiles')
  .select('*')
console.log(data, error)
```

### Test Storage Upload
```javascript
// Upload a test file
const { data, error } = await supabase.storage
  .from('audio-files')
  .upload('test/hello.mp3', file)
console.log(data, error)
```

## Useful Supabase CLI Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate TypeScript types
supabase gen types typescript --project-id your-project-ref > types/supabase.ts

# Create migration
supabase migration new migration_name
```

## Troubleshooting

### Issue: RLS Policy Errors
- Check that you're authenticated when making requests
- Verify the policy matches your use case
- Use `auth.uid()` to check current user

### Issue: Storage Upload Fails
- Verify bucket exists and is configured correctly
- Check storage policies allow the operation
- Ensure file size is within limits (50MB default)

### Issue: Foreign Key Violations
- Ensure related records exist before creating references
- Check cascade delete settings if deleting parent records

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

