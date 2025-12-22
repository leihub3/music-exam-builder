import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { questionService } from '@/lib/services/questionService'

export async function POST(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { sectionId } = params
    const { questionIds } = await request.json()

    await questionService.reorderQuestions(sectionId, questionIds)

    return NextResponse.json({
      success: true,
      message: 'Questions reordered successfully'
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
    console.error('Error reordering questions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reorder questions'
      },
      { status: 500 }
    )
  }
}



