import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { evaluateListenAndWrite } from '@/lib/services/listenAndWriteEvaluator'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { questionId, studentMusicXML, referenceMusicXML } = await request.json()

    if (!questionId || !studentMusicXML) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: questionId and studentMusicXML'
        },
        { status: 400 }
      )
    }

    if (!referenceMusicXML) {
      return NextResponse.json(
        {
          success: false,
          error: 'referenceMusicXML is required'
        },
        { status: 400 }
      )
    }

    console.log('[API] evaluate-listen-and-write: Starting evaluation')
    console.log('[API] evaluate-listen-and-write: Reference XML length:', referenceMusicXML.length)
    console.log('[API] evaluate-listen-and-write: Student XML length:', studentMusicXML.length)

    // Evaluate the listen and write submission
    const result = await evaluateListenAndWrite(referenceMusicXML, studentMusicXML)

    console.log('[API] evaluate-listen-and-write: Evaluation result:', {
      score: result.score,
      totalNotes: result.totalNotes,
      correctNotes: result.correctNotes,
      incorrectNotes: result.incorrectNotes,
      missingNotes: result.missingNotes,
      extraNotes: result.extraNotes,
      percentage: result.percentage
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('Authentication')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message
          },
          { status: 403 }
        )
      }

      console.error('[API] evaluate-listen-and-write: Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to evaluate submission',
          details: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}

