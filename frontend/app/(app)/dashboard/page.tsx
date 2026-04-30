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

export default function DashboardPage() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    api.get('/appointments').then(({ data }) => setAppts(data.appointments || [])).catch(() => {});
    api.get('/ai/reports').then(({ data }) => setReports(data.reports || [])).catch(() => {});
  }, []);

  const upcoming = appts.find((a) => ['pending', 'confirmed'].includes(a.status));
  const lastReport = reports[0];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader
        title={`Hi ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Quick health check-in and your active care."
      />

      {/* Hero CTA */}
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
            Describe your symptoms and get a confidence-ranked report in seconds. No account required for triage.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-brand-600 font-medium group-hover:gap-3 transition-all">
            Start AI Check <ArrowRight className="w-4 h-4" />
          </div>
        </div>
        <div className="hidden md:grid place-items-center w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 text-white">
          <Bot className="w-12 h-12" />
        </div>
      </Link>

      {/* Quick widgets */}
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

      {/* Emergency strip */}
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

      {/* Tips */}
      <div className="mt-6 card p-6">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-brand-600" />
          <span className="font-semibold">Health tip of the day</span>
        </div>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
          Hydration affects almost every system in your body. Aim for ~30 ml of water per kg of body weight per day,
          and more if you're active or in a hot climate.
        </p>
      </div>
    </div>
  );
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
