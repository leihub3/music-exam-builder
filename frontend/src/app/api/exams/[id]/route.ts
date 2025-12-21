import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateUser(request) // Requires auth but any role can view

    const { id } = params
    const exam = await examService.getExamById(id)

    return NextResponse.json({
      success: true,
      data: exam
    })
  } catch (error: any) {
    console.error('Error getting exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Exam not found'
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
    const exam = await examService.updateExam(id, updates)

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
    console.error('Error updating exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update exam'
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
    await examService.deleteExam(id)

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully'
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
    console.error('Error deleting exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete exam'
      },
      { status: 500 }
    )
  }
}

