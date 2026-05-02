'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

export default function DoctorProfile() {
  const [form, setForm] = useState<any>({
    specialization: '',
    degree: '',
    yearsOfExperience: 0,
    hospital: '',
    city: '',
    bio: '',
    consultationFee: 0,
    languages: '',
  });
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/doctors/me/profile').then(({ data }) => {
      const d = data.doctor;
      if (!d) return;
      setVerificationStatus(d.verificationStatus);
      setAvailableNow(!!d.availableNow);
      setForm({
        specialization: d.specialization || '',
        degree: d.degree || '',
        yearsOfExperience: d.yearsOfExperience || 0,
        hospital: d.hospital || '',
        city: d.city || '',
        bio: d.bio || '',
        consultationFee: d.consultationFee || 0,
        languages: (d.languages || []).join(', '),
      });
    });
  }, []);

  function set(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/doctors/me/profile', {
        ...form,
        yearsOfExperience: Number(form.yearsOfExperience || 0),
        consultationFee: Number(form.consultationFee || 0),
        languages: (form.languages || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <PageHeader
        title="Doctor Profile"
        subtitle="Your public profile, visible to patients after admin verification."
        right={
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              verificationStatus === 'verified'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : verificationStatus === 'rejected'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {verificationStatus}
          </span>
        }
      />

      <div className="card p-5 mb-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Available for emergency consultations</div>
          <p className="text-sm text-slate-500 mt-0.5">
            When ON, your profile appears under "Available now" for patients seeking urgent help.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              const next = !availableNow;
              await api.post('/doctors/me/availability', { availableNow: next });
              setAvailableNow(next);
              toast.success(next ? "You're now visible as available" : 'Marked offline');
            } catch (err) {
              toast.error(apiError(err));
            }
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
            availableNow ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white transition ${
              availableNow ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <form onSubmit={save} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Specialization">
            <input className="input" value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />
          </Field>
          <Field label="Degree">
            <input className="input" value={form.degree} onChange={(e) => set('degree', e.target.value)} />
          </Field>
          <Field label="Years of experience">
            <input type="number" className="input" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} />
          </Field>
          <Field label="Consultation fee (₹)">
            <input type="number" className="input" value={form.consultationFee} onChange={(e) => set('consultationFee', e.target.value)} />
          </Field>
          <Field label="Hospital">
            <input className="input" value={form.hospital} onChange={(e) => set('hospital', e.target.value)} />
          </Field>
          <Field label="City">
            <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
        </div>
        <Field label="Languages (comma separated)">
          <input className="input" value={form.languages} onChange={(e) => set('languages', e.target.value)} placeholder="English, Hindi, Marathi" />
        </Field>
        <Field label="Bio">
          <textarea className="input min-h-[120px]" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell patients about your practice and approach…" />
        </Field>

        <div className="flex justify-end">
          <button disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
