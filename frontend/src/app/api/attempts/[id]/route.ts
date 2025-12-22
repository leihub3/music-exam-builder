import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { attemptService } from '@/lib/services/attemptService'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await authenticateUser(request) // Requires auth but any role can view

    const { id } = params
    const attempt = await attemptService.getAttemptById(id)

    return NextResponse.json({
      success: true,
      data: attempt
    })
  } catch (error: any) {
    console.error('Error getting attempt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Attempt not found'
      },
      { status: error.message?.includes('Authentication') ? 401 : 404 }
    )
  }
}



