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
    const { studentIds, dueDate } = await request.json()

    const assignments = await examService.assignExamToStudents(
      id,
      studentIds,
      profile.id,
      dueDate
    )

    return NextResponse.json(
      {
        success: true,
        data: assignments
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
    console.error('Error assigning exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to assign exam'
      },
      { status: 500 }
    )
  }
}

