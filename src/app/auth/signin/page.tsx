"use client"

import { Suspense, useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from 'next-auth/react'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace("/")
    }
  }, [status, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  const handleDiscordLogin = () => {
    signIn("discord", { callbackUrl: "/" })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 px-6 relative">
      <div className="bg-neutral-900/70 border border-neutral-700/60 rounded-2xl p-10 backdrop-blur-sm shadow-2xl max-w-lg w-full depth-section">
        <h1 className="text-5xl font-bold text-white mb-4 text-center">
          Welcome Back to <span className="text-brand-400">Reminiscent</span>
        </h1>
        <p className="text-lg text-neutral-400 mb-8 text-center">
          Sign in to discover music, upload your tracks, and connect with artists.
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg bg-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-900 text-neutral-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleDiscordLogin}
          className="w-full py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition"
        >
          Sign in with Discord
        </button>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}

        <div className="mt-6 text-center">
          <a href="/auth/register" className="text-brand-400 hover:text-brand-300 underline">
            Don't have an account? Create one
          </a>
        </div>
      </div>

      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}

