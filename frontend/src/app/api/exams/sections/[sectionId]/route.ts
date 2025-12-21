import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { examService } from '@/lib/services/examService'

export async function GET(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { sectionId } = params
    const section = await examService.getSectionById(sectionId)

    return NextResponse.json({
      success: true,
      data: section
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
    console.error('Error getting section:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Section not found'
      },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { sectionId } = params
    const updates = await request.json()

    // Convert camelCase to snake_case
    const dbUpdates: any = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex

    const section = await examService.updateSection(sectionId, dbUpdates)

    return NextResponse.json({
      success: true,
      data: section
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
    console.error('Error updating section:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update section'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sectionId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { sectionId } = params
    await examService.deleteSection(sectionId)

    return NextResponse.json({
      success: true,
      message: 'Section deleted successfully'
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
    console.error('Error deleting section:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete section'
      },
      { status: 500 }
    )
  }
}

