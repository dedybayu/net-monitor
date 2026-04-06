"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RegisterForm() {
    const router = useRouter()

    const [formData, setFormData] = useState({ name: '', email: '', password: '' })
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>("")

    // Auto-close alert error setelah 5 detik
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError("")
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' },
            })

            const data = await res.json()

            if (res.ok) {
                // Berhasil, arahkan ke login dengan pesan sukses
                router.push('/login?message=Registrasi Berhasil! Silakan login.')
            } else {
                setError(data.error || "Gagal mendaftarkan akun")
            }
        } catch (err) {
            setError("Terjadi kesalahan sistem")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="card w-full max-w-lg bg-base-100 shadow-xl border border-base-300">
            <div className="card-body p-8">

                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-content font-black text-2xl mb-4 shadow-lg shadow-primary/20">
                        N
                    </div>
                    <h2 className="text-3xl font-black tracking-tight">
                        Daftar Akun
                    </h2>
                    <p className="text-base-content/60 mt-2 font-medium">
                        Buat akun baru untuk Net-Monitor 👋
                    </p>
                </div>

                {/* FORM */}
                <form className="space-y-5" onSubmit={handleSubmit}>

                    {/* Nama Lengkap */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold opacity-70">Nama Lengkap</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Masukkan nama lengkap"
                            className="input input-bordered w-full focus:input-primary transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold opacity-70">Email</span>
                        </label>
                        <input
                            type="email"
                            placeholder="email@contoh.com"
                            className="input input-bordered w-full focus:input-primary transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-bold opacity-70">Password</span>
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="input input-bordered w-full focus:input-primary transition-all"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    {/* ALERT ERROR */}
                    {error && (
                        <div className="alert border-error/30 bg-error/10 text-error text-sm font-bold shadow-sm flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                            <button onClick={() => setError("")} className="btn btn-xs btn-ghost btn-circle" type="button">✕</button>
                        </div>
                    )}

                    {/* SUBMIT BUTTON */}
                    <button
                        type="submit"
                        className="btn btn-primary w-full shadow-lg shadow-primary/20 mt-4"
                        disabled={loading}
                    >
                        {loading ? <span className="loading loading-spinner loading-sm"></span> : "Daftar Sekarang"}
                    </button>
                </form>

                {/* Divider */}
                <div className="divider text-xs opacity-40 uppercase tracking-widest font-bold">atau daftar dengan</div>

                {/* Social Login */}
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" className="btn btn-outline border-base-300 hover:bg-base-200 gap-2">
                        <svg width="18" height="18" viewBox="0 0 512 512"><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></svg>
                        Google
                    </button>
                    <button type="button" className="btn btn-neutral gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"></path></svg>
                        GitHub
                    </button>
                </div>

                {/* FOOTER */}
                <p className="text-center text-sm text-base-content/50 mt-8 font-medium">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="link link-primary no-underline hover:underline font-bold">
                        Login di sini
                    </Link>
                </p>

            </div>
        </div>
    )
}