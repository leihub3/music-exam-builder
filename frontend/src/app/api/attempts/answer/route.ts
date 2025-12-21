import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { validateSubmissionFile, fileToBuffer } from '@/lib/api/upload'
import { storageService } from '@/lib/services/storageService'
import { attemptService } from '@/lib/services/attemptService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)

    const formData = await request.formData()
    const attemptId = formData.get('attemptId') as string
    const questionId = formData.get('questionId') as string
    const answer = formData.get('answer') as string
    const maxPoints = formData.get('maxPoints') as string
    const file = (formData.get('file') || formData.get('submissionFile')) as File | null

    let submissionFilePath: string | null = null

    // Handle file upload if present
    if (file) {
      validateSubmissionFile(file)
      const fileUpload = await fileToBuffer(file)
      const result = await storageService.uploadStudentSubmission(
        fileUpload,
        attemptId,
        questionId,
        profile.id
      )
      submissionFilePath = result.path
    }

    // Parse answer JSON if it's a string
    let parsedAnswer: any = answer
    try {
      parsedAnswer = JSON.parse(answer)
    } catch {
      // If parsing fails, use as-is
    }

    const answerData = {
      attemptId,
      questionId,
      answer: parsedAnswer,
      submissionFilePath,
      maxPoints: maxPoints ? parseInt(maxPoints, 10) : undefined
    }

    const savedAnswer = await attemptService.submitAnswer(answerData)

    return NextResponse.json({
      success: true,
      data: savedAnswer
    })
  } catch (error: any) {
    if (error.message.includes('Invalid file') || error.message.includes('too large')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: 400 }
      )
    }
    console.error('Error submitting answer:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit answer'
      },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    )
  }
}

