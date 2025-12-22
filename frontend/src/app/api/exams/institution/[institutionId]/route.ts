import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function GET(
  request: NextRequest,
  { params }: { params: { institutionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { institutionId } = params
    const exams = await examService.getInstitutionExams(institutionId)

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
    console.error('Error getting institution exams:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get institution exams'
      },
      { status: 500 }
    )
  }
}



