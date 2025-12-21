import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateUser(request)

    const { id } = params
    const { timeSpentSeconds } = await request.json()

    const attempt = await attemptService.submitAttempt(id, timeSpentSeconds)

    return NextResponse.json({
      success: true,
      data: attempt
    })
  } catch (error: any) {
    console.error('Error submitting attempt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit attempt'
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    )
  }
}

