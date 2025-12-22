'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Music } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error('Login error:', error)
        
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials') || error.message.includes('email')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before logging in.')
        } else {
          setError(error.message || 'Failed to login. Please try again.')
        }
        return
      }

      if (!data.session) {
        console.error('No session after login')
        setError('Login failed: No session created. Please try again.')
        return
      }

      console.log('Login successful, session:', data.session.access_token ? 'Token present' : 'No token')
      console.log('Session expires at:', new Date(data.session.expires_at! * 1000).toISOString())
      
      // Verify session is accessible
      const { data: { session: verifySession } } = await supabase.auth.getSession()
      if (!verifySession) {
        console.error('Session not accessible after login')
        setError('Login failed: Session not stored. Please try again.')
        return
      }

      // Small delay to ensure session is fully persisted
      await new Promise(resolve => setTimeout(resolve, 100))

      console.log('Redirecting to dashboard')
      // Redirect to dashboard - it will handle role-based routing
      router.push('/dashboard')
      router.refresh() // Force a refresh to ensure session is picked up
    } catch (err: any) {
      console.error('Login error details:', err)
      setError(err.message || 'Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Music className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold">Music Exam Builder</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 hover:underline font-medium">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

