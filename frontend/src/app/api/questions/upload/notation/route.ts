import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { validateNotationFile, fileToBuffer } from '@/lib/api/upload'
import { storageService } from '@/lib/services/storageService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const formData = await request.formData()
    const file = formData.get('notationFile') as File
    const questionId = formData.get('questionId') as string

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No notation file provided'
        },
        { status: 400 }
      )
    }

    validateNotationFile(file)
    const fileUpload = await fileToBuffer(file)
    const result = await storageService.uploadNotationFile(fileUpload, questionId || 'temp')

    return NextResponse.json({
      success: true,
      data: result
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
    if (error.message.includes('Invalid file') || error.message.includes('too large')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      )
    }
    console.error('Error uploading notation:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to upload notation'
      },
      { status: 500 }
    )
  }
}

