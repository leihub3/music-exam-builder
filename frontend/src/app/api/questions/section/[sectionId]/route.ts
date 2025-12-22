import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { questionService } from '@/lib/services/questionService'

export async function GET(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { sectionId } = params
    const questions = await questionService.getQuestionsBySection(sectionId)

    return NextResponse.json({
      success: true,
      data: questions
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
    console.error('Error getting section questions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get questions'
      },
      { status: 500 }
    )
  }
}



