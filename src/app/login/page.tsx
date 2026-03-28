'use client';
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email atau Password salah!");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <form onSubmit={handleSubmit} className="card-body">
          <h2 className="card-title text-2xl font-bold justify-center mb-4">Login Net-Monitor</h2>
          {error && <div className="alert alert-error text-sm py-2">{error}</div>}
          
          <div className="form-control">
            <label className="label"><span className="label-text">Email</span></label>
            <input type="email" className="input input-bordered" required onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="form-control mt-2">
            <label className="label"><span className="label-text">Password</span></label>
            <input type="password" className="input input-bordered" required onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="form-control mt-6">
            <button className="btn btn-primary">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
}