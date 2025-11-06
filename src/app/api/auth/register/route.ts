import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const existingName = await prisma.user.findUnique({
      where: { name }
    })

    if (existingName) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const maxUid = await prisma.user.findFirst({
      orderBy: { uid: 'desc' },
      select: { uid: true }
    })

    const newUid = (maxUid?.uid || 0) + 1

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        uid: newUid
      }
    })

    await prisma.profile.create({
      data: {
        userId: user.id
      }
    })

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

