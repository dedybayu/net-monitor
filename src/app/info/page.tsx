'use client';
import { signOut, useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="avatar placeholder mb-4">
            <div className="bg-neutral text-neutral-content rounded-full w-20">
              <span className="text-3xl">{session?.user?.name?.charAt(0)}</span>
            </div>
          </div>
          
          <h2 className="card-title text-2xl font-bold text-error">Akses Terbatas</h2>
          <p className="text-base-content/70 mt-2">
            Halo, <span className="font-semibold text-base-content">{session?.user?.name}</span>.
          </p>
          <p className="text-sm">
            Akun Anda terdaftar sebagai <span className="badge badge-ghost">{(session?.user as any)?.role}</span>. 
            Anda tidak memiliki izin untuk mengakses Dashboard utama.
          </p>

          <div className="card-actions mt-8 w-full">
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="btn btn-error btn-outline w-full gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout dari Sesi
            </button>
          </div>
          
          <p className="text-[10px] text-base-content/40 mt-4 italic">
            Hubungi Administrator jika Anda memerlukan akses lebih tinggi.
          </p>
        </div>
      </div>
    </div>
  );
}