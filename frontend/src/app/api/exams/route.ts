import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const examData = await request.json()
    const exam = await examService.createExam(examData, profile.id)

    return NextResponse.json(
      {
        success: true,
        data: exam
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
    console.error('Error creating exam:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create exam'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const exams = await examService.getTeacherExams(profile.id)

    return NextResponse.json({
      success: true,
      data: exams
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
    console.error('Error getting teacher exams:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get exams'
      },
      { status: 500 }
    )
  }
}



