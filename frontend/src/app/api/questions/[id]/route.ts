import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { questionService } from '@/lib/services/questionService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateUser(request) // Requires auth but any role can view

    const { id } = params
    const question = await questionService.getQuestionById(id)

    return NextResponse.json({
      success: true,
      data: question
    })
  } catch (error: any) {
    console.error('Error getting question:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Question not found'
      },
      { status: error.message?.includes('Authentication') ? 401 : 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { id } = params
    const updates = await request.json()
    const question = await questionService.updateQuestion(id, updates)

    return NextResponse.json({
      success: true,
      data: question
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
    console.error('Error updating question:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update question'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { id } = params
    await questionService.deleteQuestion(id)

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
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
    console.error('Error deleting question:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete question'
      },
      { status: 500 }
    )
  }
}



