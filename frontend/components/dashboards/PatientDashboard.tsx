'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Bot,
  Stethoscope,
  CalendarCheck,
  MapPin,
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  FileText,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    api.get('/appointments').then(({ data }) => setAppts(data.appointments || [])).catch(() => {});
    api.get('/ai/reports').then(({ data }) => setReports(data.reports || [])).catch(() => {});
    api.get('/doctors/mine').then(({ data }) => setDoctors(data.doctors || [])).catch(() => {});
  }, []);

  const upcoming = appts.find((a) => ['pending', 'confirmed'].includes(a.status));
  const lastReport = reports[0];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader
        title={`Hi ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Quick health check-in and your active care."
      />

      <Link
        href="/ai-checker"
        className="card relative overflow-hidden p-8 flex items-center justify-between gap-6 hover:shadow-md transition group"
      >
        <div>
          <span className="chip bg-brand-50 text-brand-700">AI Health Assistant</span>
          <h2 className="text-2xl md:text-3xl font-bold mt-3">
            Tell me how you feel — I'll guide you.
          </h2>
          <p className="text-slate-600 mt-1.5 max-w-md">
            Describe your symptoms and answer a few quick questions for a personalized health report.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-brand-600 font-medium group-hover:gap-3 transition-all">
            Start AI Check <ArrowRight className="w-4 h-4" />
          </div>
        </div>
        <div className="hidden md:grid place-items-center w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white">
          <Bot className="w-12 h-12" />
        </div>
      </Link>

      <div className="grid md:grid-cols-3 gap-5 mt-6">
        <Widget title="Upcoming appointment" icon={CalendarCheck}>
          {upcoming ? (
            <div>
              <div className="font-semibold">
                Dr. {upcoming.doctor?.user?.name || 'your doctor'}
              </div>
              <div className="text-sm text-slate-500">
                {upcoming.date} · {upcoming.time}
              </div>
              <Link href="/appointments" className="text-brand-600 text-sm font-medium mt-2 inline-block">
                View details →
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-500">No upcoming bookings.</p>
              <Link href="/doctors" className="text-brand-600 text-sm font-medium mt-2 inline-block">
                Find a doctor →
              </Link>
            </div>
          )}
        </Widget>

        <Widget title="Last AI report" icon={FileText}>
          {lastReport ? (
            <div>
              <div className="font-semibold capitalize">
                {lastReport.topMatch?.name || 'Symptom check'}
              </div>
              <div className="text-sm text-slate-500">
                {new Date(lastReport.createdAt).toLocaleDateString()} ·{' '}
                <span className={riskClass(lastReport.overallRisk)}>{lastReport.overallRisk}</span>
              </div>
              <Link href="/ai-checker" className="text-brand-600 text-sm font-medium mt-2 inline-block">
                Run a new check →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">You haven't run an AI check yet.</p>
          )}
        </Widget>

        <Widget title="Nearby care" icon={MapPin}>
          <p className="text-sm text-slate-500">Hospitals, clinics and pharmacies around you.</p>
          <Link href="/nearby" className="text-brand-600 text-sm font-medium mt-2 inline-block">
            Open map →
          </Link>
        </Widget>
      </div>

      {/* My doctors */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My doctors</h2>
          <Link href="/doctors" className="text-sm text-brand-600">Browse all →</Link>
        </div>
        {doctors.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">
            You haven't consulted any doctor yet. Book your first consultation from the Doctors tab.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((d) => (
              <div key={d.doctor._id} className="card p-4 flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
                  {d.doctor.user?.name?.[0] || 'D'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">Dr. {d.doctor.user?.name}</div>
                  <div className="text-xs text-slate-500">{d.doctor.specialization}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {d.appointmentsCount} consultation{d.appointmentsCount > 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href={`/chat?with=${d.doctor.user?._id}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 card p-5 flex items-center justify-between gap-4 border-rose-200 bg-rose-50/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 grid place-items-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-rose-700">Emergency?</div>
            <div className="text-sm text-rose-700/80">
              For chest pain, severe bleeding, fainting or trouble breathing — seek emergency care immediately.
            </div>
          </div>
        </div>
        <Link href="/nearby?type=hospital" className="btn-outline text-rose-700 border-rose-200 hover:bg-rose-100">
          <HeartPulse className="w-4 h-4" /> Find ER
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mt-6">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-brand-600" />
            <span className="font-semibold">Health tip of the day</span>
          </div>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Hydration affects almost every system in your body. Aim for ~30 ml of water per kg
            of body weight per day, and more if you're active or in a hot climate.
          </p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            7–9 hours of consistent sleep is one of the strongest predictors of immune resilience —
            small chronic deficits add up fast.
          </p>
        </div>
        <div className="card p-6">
          <div className="font-semibold mb-2">Quick actions</div>
          <div className="space-y-2 text-sm">
            <Link href="/ai-checker" className="block text-brand-600 hover:underline">→ Run AI health check</Link>
            <Link href="/doctors" className="block text-brand-600 hover:underline">→ Browse doctors</Link>
            <Link href="/appointments" className="block text-brand-600 hover:underline">→ My appointments</Link>
            <Link href="/chat" className="block text-brand-600 hover:underline">→ Open chat</Link>
            <Link href="/nearby" className="block text-brand-600 hover:underline">→ Nearby care</Link>
            <Link href="/profile" className="block text-brand-600 hover:underline">→ Update medical profile</Link>
          </div>
        </div>
      </div>

      {/* Recent AI reports preview */}
      {reports.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Recent AI checks</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.slice(0, 3).map((r: any) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{r.topMatch?.name || 'Check-in'}</div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${riskBadge(r.overallRisk)}`}>
                    {r.overallRisk}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(r.extractedSymptoms || []).slice(0, 4).join(', ') || '—'}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function riskBadge(r?: string) {
  if (r === 'red') return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (r === 'yellow') return 'bg-amber-50 text-amber-700 border border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
}

function Widget({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Icon className="w-4 h-4" /> {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function riskClass(r?: string) {
  if (r === 'red') return 'text-rose-600 font-medium';
  if (r === 'yellow') return 'text-amber-600 font-medium';
  return 'text-emerald-600 font-medium';
}
