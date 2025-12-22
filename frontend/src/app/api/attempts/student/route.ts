import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)

    const attempts = await attemptService.getStudentAttempts(profile.id)

    return NextResponse.json({
      success: true,
      data: attempts
    })
  } catch (error: any) {
    console.error('Error getting student attempts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get attempts'
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    )
  }
}



