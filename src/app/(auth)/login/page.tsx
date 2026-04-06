"use client"

import LoginForm from "@/src/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center px-4 bg-gradient-to-br from-primary/20 to-success/20">
      <LoginForm />
    </main>
  )
}