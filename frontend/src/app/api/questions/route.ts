import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { questionService } from '@/lib/services/questionService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const questionData = await request.json()
    const question = await questionService.createQuestion(questionData)

    return NextResponse.json(
      {
        success: true,
        data: question
      },
      { status: 201 }
    )
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
    console.error('Error creating question:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create question'
      },
      { status: 500 }
    )
  }
}



