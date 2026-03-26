// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Registrasi Berhasil! Silahkan Login.');
        router.push('/login');
      } else {
        setError(data.message || 'Gagal registrasi');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tighter">DAFTAR AKUN</h1>
          <p className="text-gray-400 text-sm mt-2">Mulai pantau jaringan Anda sekarang.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-xs mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nama Lengkap</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-white"
              placeholder="Dedy Bayu"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-white"
              placeholder="name@example.com"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 mt-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-white"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 mt-4"
          >
            {loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8">
          Sudah punya akun? <Link href="/login" className="text-emerald-500 font-bold hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}