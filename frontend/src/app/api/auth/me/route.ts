import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    // Log request headers for debugging
    const authHeader = request.headers.get('authorization')
    console.log('GET /api/auth/me - Auth header present:', !!authHeader)
    console.log('GET /api/auth/me - Auth header starts with Bearer:', authHeader?.startsWith('Bearer '))
    
    const { user, profile } = await authenticateUser(request)

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile
      }
    })
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error.message)
    console.error('Error stack:', error.stack)
    
    // Check if it's an auth error or a different error
    const status = error.message.includes('token') || error.message.includes('Authentication') ? 401 : 500
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed'
      },
      { status }
    )
  }
}


