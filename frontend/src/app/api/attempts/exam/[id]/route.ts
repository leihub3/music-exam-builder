import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const examId = params.id
    const attempts = await attemptService.getExamAttempts(examId)

    return NextResponse.json({
      success: true,
      data: attempts
    })
  } catch (error: any) {
    if (error.message.includes('Access denied') || error.message.includes('Authentication')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: error.message.includes('Access denied') ? 403 : 401 }
      )
    }
    console.error('Error getting exam attempts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get attempts'
      },
      { status: 500 }
    )
  }
}

