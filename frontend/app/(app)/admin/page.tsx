'use client';

import { useEffect, useState } from 'react';
import { Users, Stethoscope, CalendarCheck, BookOpen, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);

  async function load() {
    try {
      const [s, p] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/doctors/pending'),
      ]);
      setStats(s.data);
      setPending(p.data.doctors || []);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  useEffect(() => { load(); }, []);

  async function decide(id: string, decision: 'verified' | 'rejected') {
    try {
      await api.post(`/admin/doctors/${id}/verify`, { decision });
      toast.success(`Doctor ${decision}`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader title="Admin" subtitle="Verify doctors and manage the platform." />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Patients" value={stats?.users} icon={Users} />
        <Stat label="Doctors" value={stats?.doctors} icon={Stethoscope} />
        <Stat label="Pending" value={stats?.pendingDoctors} icon={ShieldCheck} />
        <Stat label="Appointments" value={stats?.appointments} icon={CalendarCheck} />
        <Stat label="Diseases" value={stats?.diseases} icon={BookOpen} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Pending doctor verification</h2>
        <div className="card divide-y divide-slate-100">
          {pending.length === 0 && (
            <div className="p-6 text-slate-500 text-sm">Nothing to review.</div>
          )}
          {pending.map((d) => (
            <div key={d._id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Dr. {d.user?.name}</div>
                <div className="text-sm text-slate-500">
                  {d.specialization} · {d.degree} · {d.yearsOfExperience}y · License {d.licenseNumber}
                </div>
                <div className="text-xs text-slate-400">{d.user?.email}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide(d._id, 'verified')}
                  className="btn-outline text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(d._id, 'rejected')}
                  className="btn-outline text-rose-700 border-rose-200 hover:bg-rose-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value ?? '—'}</div>
    </div>
  );
}
