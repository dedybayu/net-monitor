'use client';
import { signOut, useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

export default function InfoPage() {
  const { data: session, status } = useSession();
  //   const router = useRouter();

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <h1 className="text-2xl font-bold text-primary">DASHBOARD</h1>
  );
}