'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Logo from '@/components/Logo';
import { api, apiError } from '@/lib/api';
import { saveSession } from '@/lib/auth';

type Role = 'patient' | 'doctor';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    degree: '',
    licenseNumber: '',
    yearsOfExperience: '',
    hospital: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role,
      };
      if (role === 'doctor') {
        payload.doctor = {
          specialization: form.specialization,
          degree: form.degree,
          licenseNumber: form.licenseNumber,
          yearsOfExperience: Number(form.yearsOfExperience || 0),
          hospital: form.hospital || undefined,
          city: form.city || undefined,
        };
      }
      const { data } = await api.post('/auth/signup', payload);
      saveSession(data.token, data.user);
      toast.success('Account created');
      router.push('/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-teal-500 via-brand-500 to-brand-700 text-white">
        <Logo subtle />
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Care in your pocket,<br />a community at your back.
          </h2>
          <p className="text-white/80 mt-3 max-w-sm">
            Join thousands using SHS for everyday health questions and real consultations.
          </p>
        </div>
        <div className="text-sm text-white/70">© SHS</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-4">
          <div className="lg:hidden mb-2"><Logo /></div>
          <div>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-slate-500 text-sm mt-1">It only takes a minute.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['patient', 'doctor'] as Role[]).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition ${
                  role === r
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                I am a {r}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </div>
          </div>

          {role === 'doctor' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="label">Specialization</label>
                <input className="input" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} required placeholder="Cardiologist" />
              </div>
              <div className="space-y-1.5">
                <label className="label">Degree</label>
                <input className="input" value={form.degree} onChange={(e) => set('degree', e.target.value)} required placeholder="MBBS, MD" />
              </div>
              <div className="space-y-1.5">
                <label className="label">License #</label>
                <input className="input" value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="label">Years experience</label>
                <input type="number" className="input" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="label">Hospital</label>
                <input className="input" value={form.hospital} onChange={(e) => set('hospital', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
            </div>
          )}

          <button disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creating…' : 'Create account'}
          </button>
          <p className="text-sm text-slate-500 text-center">
            Have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
