import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/api/middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PUT(request: NextRequest) {
  try {
    const { profile } = await authenticateUser(request)
    const { firstName, lastName, avatarUrl } = await request.json()

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl
      })
      .eq('id', profile.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update profile'
      },
      { status: 500 }
    )
  }
}



