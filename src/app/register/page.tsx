'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      alert("Registrasi Berhasil! Silakan Login.");
      router.push('/login');
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <form onSubmit={handleSubmit} className="card-body">
          <h2 className="card-title text-2xl font-bold justify-center mb-4">Daftar Akun</h2>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Nama Lengkap</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered" 
              required 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text text-sm">Email</span>
            </label>
            <input 
              type="email" 
              className="input input-bordered" 
              required 
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text text-sm">Password</span>
            </label>
            <input 
              type="password" 
              className="input input-bordered" 
              required 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="form-control mt-6">
            <button className={`btn btn-primary ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Memproses...' : 'Register'}
            </button>
          </div>
          
          <p className="text-center text-xs mt-4">
            Sudah punya akun? <a href="/login" className="link link-primary">Login di sini</a>
          </p>
        </form>
      </div>
    </div>
  );
}