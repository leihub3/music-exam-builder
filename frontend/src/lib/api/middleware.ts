import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AuthenticatedUser {
  user: any
  profile: any
  supabase: ReturnType<typeof createClient>
}

/**
 * Authenticate user from JWT token in Authorization header
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authentication token provided')
  }

  const token = authHeader.replace('Bearer ', '')

  // Create a Supabase client with the user's token for auth verification
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
  )

  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  // Get user profile with role using admin client (bypasses RLS)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    console.error('Profile lookup error:', profileError)
    console.error('User ID:', user.id)
    console.error('User email:', user.email)
    throw new Error('User profile not found')
  }

  return {
    user,
    profile,
    supabase
  }
}

/**
 * Check if user has required role
 */
export function requireRole(
  profile: any,
  allowedRoles: string[]
): void {
  if (!profile) {
    throw new Error('Authentication required')
  }

  const userRole = profile.role

  if (!allowedRoles.includes(userRole)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}`)
  }
}

/**
 * Check if user is a teacher or higher
 */
export function requireTeacher(profile: any): void {
  requireRole(profile, ['TEACHER', 'INSTITUTION_ADMIN', 'ADMIN'])
}

/**
 * Check if user is an institution admin or higher
 */
export function requireInstitutionAdmin(profile: any): void {
  requireRole(profile, ['INSTITUTION_ADMIN', 'ADMIN'])
}

/**
 * Check if user is a platform admin
 */
export function requireAdmin(profile: any): void {
  requireRole(profile, ['ADMIN'])
}

/**
 * Check if user is a student
 */
export function requireStudent(profile: any): void {
  requireRole(profile, ['STUDENT'])
}

