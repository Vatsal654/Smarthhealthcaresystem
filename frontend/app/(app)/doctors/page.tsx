'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Star, MapPin, BadgeCheck, Zap, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

interface Doctor {
  _id: string;
  specialization: string;
  hospital?: string;
  city?: string;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  availableNow?: boolean;
  user: { name: string; avatarUrl?: string };
}

export default function DoctorsPageWrap() {
  return (
    <Suspense fallback={null}>
      <DoctorsPage />
    </Suspense>
  );
}

function DoctorsPage() {
  const search = useSearchParams();
  const initialTab = search.get('tab') === 'emergency' ? 'emergency' : 'schedule';
  const [tab, setTab] = useState<'emergency' | 'schedule'>(initialTab);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [emergency, setEmergency] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Doctor | null>(null);

  async function load() {
    setLoading(true);
    try {
      if (tab === 'schedule') {
        const { data } = await api.get('/doctors', { params: { q, specialization: specialty } });
        setDoctors(data.doctors);
      } else {
        const { data } = await api.get('/doctors/emergency');
        setEmergency(data.doctors);
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get('/doctors/specialties').then(({ data }) => setSpecialties(data.specialties || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [q, specialty, tab]);

  const list = tab === 'emergency' ? emergency : doctors;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader title="Doctors" subtitle="Browse verified clinicians and book a consultation." />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('emergency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
            tab === 'emergency' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" /> Available now
          <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'emergency' ? 'bg-white/20' : 'bg-rose-100 text-rose-600'}`}>
            {emergency.length}
          </span>
        </button>
        <button
          onClick={() => setTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition ${
            tab === 'schedule' ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <CalendarClock className="w-4 h-4" /> Schedule
        </button>
      </div>

      {tab === 'schedule' && (
        <div className="card p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, hospital, city…"
              className="input pl-9"
            />
          </div>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="input md:w-64">
            <option value="">All specialties</option>
            {specialties.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {tab === 'emergency' && (
        <div className="card p-4 mb-4 bg-rose-50/40 border-rose-200">
          <div className="text-sm text-rose-800">
            <strong>Emergency consultations</strong> — these doctors are online right now and can see you immediately. Tap Book to start.
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        {loading && <div className="text-slate-500">Loading…</div>}
        {!loading && list.length === 0 && (
          <div className="text-slate-500 col-span-2 text-center py-12 card">
            {tab === 'emergency'
              ? 'No doctors are available right now. Try the Schedule tab.'
              : 'No verified doctors match. Try a broader search.'}
          </div>
        )}
        {list.map((d) => (
          <div key={d._id} className="card p-5 flex gap-4 hover:shadow-md transition">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
                {d.user?.name?.[0] || 'D'}
              </div>
              {d.availableNow && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Available now" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold truncate">Dr. {d.user?.name}</div>
                <BadgeCheck className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-sm text-slate-500">{d.specialization}</div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                {d.hospital && <span>{d.hospital}</span>}
                {d.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.city}</span>}
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {d.rating || 'New'}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">{d.yearsOfExperience}y exp · ₹{d.consultationFee || 0}</span>
                <button onClick={() => setBooking(d)} className={`text-sm py-2 px-4 rounded-xl font-medium ${tab === 'emergency' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                  {tab === 'emergency' ? 'Connect now' : 'Book'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {booking && (
        <BookingModal doctor={booking} mode={tab} onClose={() => setBooking(null)} />
      )}
    </div>
  );
}

function BookingModal({
  doctor, mode, onClose,
}: { doctor: Doctor; mode: 'emergency' | 'schedule'; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(mode === 'emergency' ? nowTime : '10:00');
  const [reason, setReason] = useState('');
  const [vmode, setVmode] = useState<'video' | 'chat'>('video');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/appointments', {
        doctorId: doctor._id,
        date,
        time,
        reason,
        mode: vmode,
      });
      toast.success(mode === 'emergency' ? 'Connecting — the doctor will accept shortly' : 'Appointment requested');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-md space-y-4 text-slate-900">
        <div>
          <h3 className="text-lg font-bold">
            {mode === 'emergency' ? 'Connect now to' : 'Book'} Dr. {doctor.user?.name}
          </h3>
          <p className="text-sm text-slate-500">{doctor.specialization}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="label">Date</label>
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" required />
          </div>
          <div className="space-y-1.5">
            <label className="label">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="label">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input min-h-[80px]" placeholder="Briefly describe your symptoms" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['video', 'chat'] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setVmode(m)}
              className={`px-3 py-2 rounded-xl text-sm border ${vmode === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200'}`}
            >
              {m === 'video' ? 'Video call' : 'Chat'}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={loading} className="btn-primary">{loading ? 'Sending…' : 'Confirm'}</button>
        </div>
      </form>
    </div>
  );
}
