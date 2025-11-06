"use client";

import Link from "next/link";
import React from "react";

export default function NotSignedIn() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-center px-6 relative">
      <div className="bg-neutral-900/70 border border-neutral-700/60 rounded-2xl p-10 backdrop-blur-sm shadow-2xl max-w-lg w-full depth-section">
        <h1 className="text-5xl font-bold text-white mb-4">
          Welcome to <span className="text-brand-400">Reminiscent</span>
        </h1>
        <p className="text-lg text-neutral-400 mb-8">
          Sign in to discover music, upload your tracks, create playlists, and connect with artists.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 text-lg font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-3 text-lg font-semibold text-white bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-all duration-200"
          >
            Create Account
          </Link>
        </div>
      </div>

      <div className="absolute w-[600px] h-[600px] bg-brand-500/10 blur-[200px] rounded-full -z-10"></div>
    </main>
  );
}

