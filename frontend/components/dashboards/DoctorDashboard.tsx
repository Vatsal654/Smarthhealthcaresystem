'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  Clock,
  Video,
  MessagesSquare,
  Star,
  Stethoscope,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Dash {
  doctor: any;
  stats: {
    todayCount: number;
    pendingCount: number;
    completedCount: number;
    uniquePatients: number;
  };
  todayAppointments: any[];
  pendingAppointments: any[];
  recentAppointments: any[];
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/doctors/me/dashboard');
      setDash(data);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-slate-500">Loading your dashboard…</div>
    );
  }

  const verified = dash?.doctor?.verificationStatus === 'verified';

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader
        title={`Welcome, Dr. ${user?.name?.split(' ')[0] || ''}`}
        subtitle={dash?.doctor?.specialization || 'Doctor portal'}
        right={
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              verified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {verified ? 'Verified' : 'Pending verification'}
          </span>
        }
      />

      {!verified && (
        <div className="card p-5 bg-amber-50/40 border-amber-200 mb-6">
          <div className="font-semibold text-amber-800">Awaiting admin verification</div>
          <p className="text-sm text-amber-800/90 mt-1">
            Your profile is under review. Patients won't be able to find you in the directory until
            an admin verifies your credentials. You can still see appointments booked directly with you.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Today" value={dash?.stats.todayCount} icon={CalendarCheck} />
        <Stat label="Pending requests" value={dash?.stats.pendingCount} icon={Clock} />
        <Stat label="Patients seen" value={dash?.stats.uniquePatients} icon={Users} />
        <Stat label="Completed" value={dash?.stats.completedCount} icon={CheckCircle2} />
      </div>

      {/* Pending requests */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Pending requests</h2>
        {dash?.pendingAppointments.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">No pending appointment requests.</div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {dash?.pendingAppointments.map((a) => (
              <div key={a._id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.patient?.name}</div>
                  <div className="text-sm text-slate-500">
                    {a.date} · {a.time} · <span className="capitalize">{a.mode}</span>
                  </div>
                  {a.reason && <div className="text-xs text-slate-400 max-w-md mt-1">{a.reason}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStatus(a._id, 'confirmed')}
                    className="btn-outline text-sm py-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => setStatus(a._id, 'cancelled')}
                    className="btn-outline text-sm py-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's schedule */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Today's schedule</h2>
        {dash?.todayAppointments.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">Nothing scheduled today.</div>
        ) : (
          <div className="space-y-2">
            {dash?.todayAppointments.map((a) => (
              <div key={a._id} className="card p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.patient?.name}</div>
                  <div className="text-sm text-slate-500">
                    {a.time} · <span className="capitalize">{a.mode}</span> ·{' '}
                    <span className="capitalize">{a.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {a.status === 'confirmed' && a.mode === 'video' && (
                    <Link href={`/video/${a._id}`} className="btn-primary text-sm py-2">
                      <Video className="w-4 h-4" /> Join
                    </Link>
                  )}
                  <Link
                    href={`/chat?with=${a.patient?._id}`}
                    className="btn-outline text-sm py-2"
                  >
                    <MessagesSquare className="w-4 h-4" /> Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent patients */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Recent patients</h2>
        {(!dash?.recentAppointments || dash.recentAppointments.length === 0) ? (
          <div className="card p-6 text-sm text-slate-500">
            You haven't seen any patients yet. New bookings will appear here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dedupePatients(dash.recentAppointments).slice(0, 6).map((a: any) => (
              <div key={a._id} className="card p-4 flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
                  {a.patient?.name?.[0] || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{a.patient?.name}</div>
                  <div className="text-xs text-slate-500 truncate">{a.patient?.email}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Last: {a.date} · {a.time}
                  </div>
                  <Link
                    href={`/chat?with=${a.patient?._id}`}
                    className="text-[11px] text-brand-600 font-medium mt-1 inline-block"
                  >
                    Chat →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-8">
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Stethoscope className="w-4 h-4 text-brand-600" /> Profile snapshot
          </div>
          <div className="text-sm text-slate-600 space-y-1">
            <div>{dash?.doctor?.degree}</div>
            <div>{dash?.doctor?.yearsOfExperience} years experience</div>
            {dash?.doctor?.hospital && <div>{dash.doctor.hospital}</div>}
            {dash?.doctor?.city && <div>{dash.doctor.city}</div>}
          </div>
          <Link href="/profile" className="text-brand-600 text-sm mt-2 inline-block">
            Edit profile →
          </Link>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <Star className="w-4 h-4 text-amber-500" /> Reviews & rating
          </div>
          <div className="text-2xl font-bold">{dash?.doctor?.rating || 'New'}</div>
          <div className="text-xs text-slate-500">
            {dash?.doctor?.reviewsCount || 0} reviews so far
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Reviews appear here after patients complete consultations and submit feedback.
          </p>
        </div>
      </div>
    </div>
  );
}

function dedupePatients(appts: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const a of appts) {
    const id = String(a.patient?._id || a.patient);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(a);
  }
  return out;
}

function Stat({ label, value, icon: Icon }: any) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value ?? 0}</div>
    </div>
  );
}
