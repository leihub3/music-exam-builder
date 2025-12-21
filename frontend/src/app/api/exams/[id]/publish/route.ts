import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { id } = params
    const { isPublished } = await request.json()
    const exam = await examService.publishExam(id, isPublished)

    return NextResponse.json({
      success: true,
      data: exam
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
    console.error('Error publishing exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to publish exam'
      },
      { status: 500 }
    )
  }
}

