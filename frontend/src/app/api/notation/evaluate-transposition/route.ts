import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { evaluateTransposition } from '@/lib/services/notationService'

export async function POST(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { questionId, studentMusicXML, referenceMusicXML, transpositionSemitones } = await request.json()

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

    const transposition = transpositionSemitones || 0

    console.log('[API] evaluate-transposition: Starting evaluation')
    console.log('[API] evaluate-transposition: Reference XML length:', referenceMusicXML.length)
    console.log('[API] evaluate-transposition: Student XML length:', studentMusicXML.length)
    console.log('[API] evaluate-transposition: Transposition semitones:', transposition)

    // Evaluate the transposition
    const result = await evaluateTransposition(
      referenceMusicXML,
      studentMusicXML,
      transposition
    )

    console.log('[API] evaluate-transposition: Evaluation result:', {
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
    console.error('Error evaluating transposition:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to evaluate transposition'
      },
      { status: 500 }
    )
  }
}



