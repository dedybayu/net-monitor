"use client"

import RegisterForm from "@/src/components/auth/RegisterForm"

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center px-4 bg-gradient-to-br from-primary/20 to-secondary/20">
      <RegisterForm />
    </main>
  )
}