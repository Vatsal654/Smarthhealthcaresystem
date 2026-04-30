'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Logo from '@/components/Logo';
import { api, apiError } from '@/lib/api';
import { saveSession } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      saveSession(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`);
      router.push(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand-600 via-brand-500 to-teal-500 text-white">
        <Logo subtle />
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Health guidance,<br />in plain language.
          </h2>
          <p className="text-white/80 mt-3 max-w-sm">
            Log in to talk to our AI symptom engine and book verified doctors.
          </p>
        </div>
        <div className="text-sm text-white/70">© SHS — Smart Healthcare System</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden mb-2"><Logo /></div>
          <div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to continue.</p>
          </div>
          <div className="space-y-1.5">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-sm text-slate-500 text-center">
            New here?{' '}
            <Link href="/signup" className="text-brand-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
