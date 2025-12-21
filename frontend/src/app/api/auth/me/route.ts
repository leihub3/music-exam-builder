import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await authenticateUser(request)

    return NextResponse.json({
      success: true,
      data: {
        user,
        profile
      }
    })
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed'
      },
      { status: 401 }
    )
  }
}

