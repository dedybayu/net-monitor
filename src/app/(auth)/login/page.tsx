"use client"

import { Suspense } from "react"
import LoginForm from "@/src/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center px-4 bg-gradient-to-br from-primary/20 to-success/20">
      <Suspense fallback={<div className="loading loading-spinner loading-lg"></div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}