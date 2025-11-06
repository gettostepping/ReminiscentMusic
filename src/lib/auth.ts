import type { NextAuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import DiscordProvider from "next-auth/providers/discord"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    name: string
    email: string
    image: string
  }

  interface JWT {
    user?: User
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
      
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
      
        if (!user || !user.password) return null
      
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
      
        return {
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          image: user.image ?? "/placeholder.png",
        }
      },
    }),

    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/signin" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as any
        
        // Check for pending registration (if using invite system)
        // For now, allow all Discord registrations
        // Uncomment below if you want to implement invite system:
        /*
        let pending = await prisma.pendingRegistration.findFirst({
          where: {
            discordId: discordProfile.id,
            status: 'pending'
          }
        })
        
        if (pending) {
          return `/auth/pending-approval?discordId=${encodeURIComponent(discordProfile.id)}&email=${encodeURIComponent(discordProfile.email)}`
        }
        */
        
        const existingUser = await prisma.user.findUnique({
          where: { email: discordProfile.email }
        })
        
        if (!existingUser) {
          // Create new user from Discord
          const maxUid = await prisma.user.findFirst({
            orderBy: { uid: 'desc' },
            select: { uid: true }
          })
          const newUid = (maxUid?.uid || 0) + 1
          
          const avatarUrl = discordProfile.avatar
            ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png?size=1024`
            : '/UnknownUser1024.png'
          
          const bannerUrl = discordProfile.banner
            ? `https://cdn.discordapp.com/banners/${discordProfile.id}/${discordProfile.banner}.${discordProfile.banner.startsWith('a_') ? 'gif' : 'png'}?size=2048`
            : null
          
          const newUser = await prisma.user.create({
            data: {
              email: discordProfile.email,
              name: discordProfile.username || discordProfile.global_name || `User${newUid}`,
              image: avatarUrl,
              banner: bannerUrl,
              discordId: discordProfile.id,
              uid: newUid
            }
          })
          
          await prisma.profile.create({
            data: {
              userId: newUser.id
            }
          })
        }
      }
      
      return true
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.user = user
      } else if (token.user && typeof token.user === 'object' && 'email' in token.user && token.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: token.user.email as string }
        })
        
        if (!existingUser) {
          return {}
        }
      }
      
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as any
        const email = discordProfile.email
        
        if (email) {
          const avatarUrl = discordProfile.avatar
            ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png?size=1024`
            : '/UnknownUser1024.png'
          
          const bannerUrl = discordProfile.banner
            ? `https://cdn.discordapp.com/banners/${discordProfile.id}/${discordProfile.banner}.${discordProfile.banner.startsWith('a_') ? 'gif' : 'png'}?size=2048`
            : null
          
          let dbUser = await prisma.user.findUnique({
            where: { email }
          })
          
          if (dbUser) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                image: avatarUrl,
                banner: bannerUrl,
                discordId: discordProfile.id,
                name: discordProfile.username || discordProfile.global_name,
              }
            })
            
            token.user = {
              ...(token.user || {}),
              id: dbUser.id,
              image: dbUser.image || '',
              name: dbUser.name || ''
            }
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          ...token.user,
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

