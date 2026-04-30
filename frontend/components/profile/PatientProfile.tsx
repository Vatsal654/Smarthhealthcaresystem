'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

const FIELDS = [
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'heightCm', label: 'Height (cm)', type: 'number' },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
] as const;

export default function PatientProfile() {
  const [form, setForm] = useState<any>({
    age: '',
    gender: '',
    bloodGroup: '',
    heightCm: '',
    weightKg: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    pastSurgeries: '',
    emergencyContact: { name: '', phone: '', relation: '' },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      if (!data.profile) return;
      setForm((prev: any) => ({
        ...prev,
        ...data.profile,
        allergies: (data.profile.allergies || []).join(', '),
        chronicConditions: (data.profile.chronicConditions || []).join(', '),
        currentMedications: (data.profile.currentMedications || []).join(', '),
        pastSurgeries: (data.profile.pastSurgeries || []).join(', '),
        emergencyContact: data.profile.emergencyContact || { name: '', phone: '', relation: '' },
      }));
    });
  }, []);

  function set(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        allergies: splitCsv(form.allergies),
        chronicConditions: splitCsv(form.chronicConditions),
        currentMedications: splitCsv(form.currentMedications),
        pastSurgeries: splitCsv(form.pastSurgeries),
      };
      await api.put('/profile', payload);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <PageHeader title="Medical Profile" subtitle="Information here is shared with your treating doctors." />
      <form onSubmit={save} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="label">{f.label}</label>
              <input
                type={f.type}
                className="input"
                value={form[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="label">Gender</label>
            <select className="input" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label">Blood Group</label>
            <select className="input" value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)}>
              <option value="">—</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {(['allergies', 'chronicConditions', 'currentMedications', 'pastSurgeries'] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <label className="label capitalize">{labelize(k)}</label>
            <input
              className="input"
              placeholder="Comma separated"
              value={form[k] ?? ''}
              onChange={(e) => set(k, e.target.value)}
            />
          </div>
        ))}

        <div>
          <div className="text-sm font-semibold mb-2">Emergency Contact</div>
          <div className="grid grid-cols-3 gap-3">
            {(['name', 'phone', 'relation'] as const).map((k) => (
              <input
                key={k}
                className="input"
                placeholder={k}
                value={form.emergencyContact?.[k] ?? ''}
                onChange={(e) =>
                  setForm((f: any) => ({
                    ...f,
                    emergencyContact: { ...(f.emergencyContact || {}), [k]: e.target.value },
                  }))
                }
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

function splitCsv(s?: string) {
  return (s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function labelize(s: string) {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
