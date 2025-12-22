import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { storageService } from '@/lib/services/storageService'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        {
          success: false,
          error: 'File path required'
        },
        { status: 400 }
      )
    }

    const url = await storageService.getSignedUrl('student-submissions', path)

    return NextResponse.json({
      success: true,
      data: { url }
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
    console.error('Error getting submission URL:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get submission URL'
      },
      { status: 500 }
    )
  }
}



