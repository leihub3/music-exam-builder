import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function POST(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { examId } = params
    const sectionData = await request.json()

    // Convert camelCase to snake_case
    const dbData = {
      exam_id: examId,
      title: sectionData.title,
      description: sectionData.description || null,
      section_type: sectionData.sectionType,
      order_index: sectionData.orderIndex
    }

    const section = await examService.createSection(dbData)

    return NextResponse.json(
      {
        success: true,
        data: section
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
    console.error('Error creating section:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create section'
      },
      { status: 500 }
    )
  }
}

