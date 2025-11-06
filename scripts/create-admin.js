const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            name: 'admin'
          }
        }
      },
      include: {
        roles: true
      }
    })

    if (existingAdmin) {
      console.log('Admin user already exists:')
      console.log(`Email: ${existingAdmin.email}`)
      console.log(`Name: ${existingAdmin.name}`)
      console.log(`UID: ${existingAdmin.uid}`)
      return
    }

    // Create admin user
    const email = 'admin@reminiscent.com'
    const password = 'admin123'
    const name = 'Admin'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Get max UID
    const maxUid = await prisma.user.findFirst({
      orderBy: { uid: 'desc' },
      select: { uid: true }
    })
    const newUid = (maxUid?.uid || 0) + 1

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        uid: newUid
      }
    })

    // Create profile
    await prisma.profile.create({
      data: {
        userId: user.id
      }
    })

    // Create admin role
    await prisma.role.create({
      data: {
        userId: user.id,
        name: 'admin'
      }
    })

    // Also create owner role for full access
    await prisma.role.create({
      data: {
        userId: user.id,
        name: 'owner'
      }
    })

    console.log('✅ Admin user created successfully!')
    console.log('')
    console.log('Login credentials:')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log(`UID: ${user.uid}`)
    console.log('')
    console.log('⚠️  IMPORTANT: Change the password after first login!')

  } catch (error) {
    console.error('Error creating admin user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()

