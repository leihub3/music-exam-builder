import { NextRequest } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface AuthenticatedUser {
  user: any
  profile: any
  supabase: SupabaseClient<any>
}

/**
 * Authenticate user from JWT token in Authorization header
 */
export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid Authorization header:', authHeader ? 'Header exists but does not start with Bearer' : 'No header')
    throw new Error('No authentication token provided')
  }

  const token = authHeader.replace('Bearer ', '')
  
  if (!token || token.length === 0) {
    console.error('Token is empty after removing Bearer prefix')
    throw new Error('No authentication token provided')
  }

  // Create a Supabase client with the user's token for auth verification
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase config - URL:', !!supabaseUrl, 'Anon Key:', !!supabaseAnonKey)
    throw new Error('Missing Supabase configuration. Check your environment variables.')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Verify the token and get user
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error) {
    console.error('Token verification error:', error.message)
    throw new Error(`Invalid or expired token: ${error.message}`)
  }
  
  if (!user) {
    console.error('No user returned from token verification')
    throw new Error('Invalid or expired token: No user found')
  }

  // Get user profile with role using admin client (bypasses RLS)
  let { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle() // Use maybeSingle() instead of single() to avoid error on 0 rows

  // If profile doesn't exist, try to create it (in case trigger didn't fire)
  if (profileError || !profile) {
    console.warn('Profile not found for user, attempting to create:', {
      userId: user.id,
      email: user.email,
      error: profileError?.message
    })
    
    // Try to create the profile with default STUDENT role
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: 'STUDENT' // Default role
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Failed to create profile:', createError.message)
      // If creation fails, still throw original error
      if (profileError) {
        throw new Error(`User profile not found and could not be created: ${profileError.message}`)
      }
      throw new Error(`User profile not found and could not be created: ${createError.message}`)
    }
    
    profile = newProfile
  }
  
  if (!profile) {
    console.error('Profile is null for user:', user.id, user.email)
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

