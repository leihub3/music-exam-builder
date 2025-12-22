import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireAdmin } from '@/lib/api/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { profile } = await authenticateUser(request)
    requireAdmin(profile)

    const { userId } = params
    const { role } = await request.json()

    const validRoles = ['ADMIN', 'INSTITUTION_ADMIN', 'TEACHER', 'STUDENT']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid role'
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
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
    console.error('Error changing role:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to change role'
      },
      { status: 500 }
    )
  }
}



