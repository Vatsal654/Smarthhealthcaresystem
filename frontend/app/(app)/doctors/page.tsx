'use client';

import { useEffect, useState } from 'react';
import { Search, Star, MapPin, BadgeCheck } from 'lucide-react';
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
  user: { name: string; avatarUrl?: string };
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Doctor | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/doctors', { params: { q, specialization: specialty } });
      setDoctors(data.doctors);
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
  }, [q, specialty]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader title="Doctors" subtitle="Browse verified clinicians and book a consultation." />

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

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        {loading && <div className="text-slate-500">Loading…</div>}
        {!loading && doctors.length === 0 && (
          <div className="text-slate-500 col-span-2 text-center py-12 card">
            No verified doctors yet. Sign up as a doctor and ask the admin to verify.
          </div>
        )}
        {doctors.map((d) => (
          <div key={d._id} className="card p-5 flex gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
              {d.user?.name?.[0] || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold truncate">Dr. {d.user?.name}</div>
                <BadgeCheck className="w-4 h-4 text-brand-600" />
              </div>
              <div className="text-sm text-slate-500">{d.specialization}</div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                {d.hospital && <span>{d.hospital}</span>}
                {d.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {d.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {d.rating || 'New'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">
                  {d.yearsOfExperience}y exp · ₹{d.consultationFee || 0}
                </span>
                <button onClick={() => setBooking(d)} className="btn-primary text-sm py-2">
                  Book
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {booking && <BookingModal doctor={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

function BookingModal({ doctor, onClose }: { doctor: Doctor; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'video' | 'chat'>('video');
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
        mode,
      });
      toast.success('Appointment requested');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm grid place-items-center z-50 p-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-md space-y-4">
        <div>
          <h3 className="text-lg font-bold">Book Dr. {doctor.user?.name}</h3>
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
              onClick={() => setMode(m)}
              className={`px-3 py-2 rounded-xl text-sm border ${
                mode === m ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200'
              }`}
            >
              {m === 'video' ? 'Video call' : 'Chat'}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={loading} className="btn-primary">{loading ? 'Booking…' : 'Confirm'}</button>
        </div>
      </form>
    </div>
  );
}
