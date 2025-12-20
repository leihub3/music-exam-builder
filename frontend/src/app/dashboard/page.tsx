'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Music } from 'lucide-react'

export default function DashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    redirectToDashboard()
  }, [])

  const redirectToDashboard = async () => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Get user profile to determine role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        console.error('Error fetching profile:', error)
        router.push('/login')
        return
      }

      // Redirect based on role
      switch (profile.role) {
        case 'TEACHER':
        case 'INSTITUTION_ADMIN':
          router.push('/dashboard/teacher')
          break
        case 'STUDENT':
          router.push('/dashboard/student')
          break
        case 'ADMIN':
          router.push('/dashboard/admin')
          break
        default:
          router.push('/dashboard/student')
      }
    } catch (error) {
      console.error('Error redirecting:', error)
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <Music className="h-12 w-12 animate-pulse text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  )
}

