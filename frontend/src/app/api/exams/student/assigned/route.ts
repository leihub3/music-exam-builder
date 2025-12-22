import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)

    const assignments = await examService.getStudentAssignedExams(profile.id)

    return NextResponse.json({
      success: true,
      data: assignments
    })
  } catch (error: any) {
    console.error('Error getting student exams:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get student exams'
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    )
  }
}



