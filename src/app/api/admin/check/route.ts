import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        roles: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const roleNames = user.roles.map(r => r.name)
    const isOwner = roleNames.includes('owner')
    const isDeveloper = roleNames.includes('developer')
    const isAdmin = roleNames.includes('admin')
    const isTrialMod = roleNames.includes('trial_mod')

    return NextResponse.json({
      isOwner,
      isDeveloper,
      isAdmin,
      isTrialMod,
      roles: roleNames,
      uid: user.uid
    })
  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

