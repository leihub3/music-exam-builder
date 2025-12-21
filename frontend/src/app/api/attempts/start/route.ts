import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)

    const { examId } = await request.json()
    const attempt = await attemptService.startAttempt(examId, profile.id)

    return NextResponse.json(
      {
        success: true,
        data: attempt
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error starting attempt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start attempt'
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    )
  }
}

