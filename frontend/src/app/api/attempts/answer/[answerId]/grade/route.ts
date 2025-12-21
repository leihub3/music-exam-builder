import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function POST(
  request: NextRequest,
  { params }: { params: { answerId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { answerId } = params
    const { pointsEarned, feedback } = await request.json()

    const answer = await attemptService.gradeAnswer(
      answerId,
      pointsEarned,
      feedback || null,
      profile.id
    )

    return NextResponse.json({
      success: true,
      data: answer
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
    console.error('Error grading answer:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to grade answer'
      },
      { status: 500 }
    )
  }
}

