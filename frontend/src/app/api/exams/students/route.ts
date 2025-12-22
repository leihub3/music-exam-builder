import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser, requireTeacher } from '@/lib/api/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    requireTeacher(profile)

    const { data: students, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'STUDENT')
      .order('last_name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: students || []
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
    console.error('Error getting students:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get students'
      },
      { status: 500 }
    )
  }
}



