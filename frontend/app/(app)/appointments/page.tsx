'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, MessagesSquare, Calendar, CheckCircle2, XCircle, Clock, FileSignature, FileText, UserSquare2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PrescriptionForm from '@/components/PrescriptionForm';
import PrescriptionView from '@/components/PrescriptionView';
import PatientProfileModal from '@/components/PatientProfileModal';

interface Appointment {
  _id: string;
  date: string;
  time: string;
  reason?: string;
  mode: 'video' | 'chat' | 'in-person';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  doctor: { _id: string; specialization: string; user: { _id: string; name: string } };
  patient: { _id: string; name: string; email: string };
  videoRoom?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rxFor, setRxFor] = useState<Appointment | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [viewingPatient, setViewingPatient] = useState<{ id: string; name: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        api.get('/appointments'),
        api.get('/prescriptions/mine').catch(() => ({ data: { prescriptions: [] } })),
      ]);
      setItems(a.data.appointments);
      setPrescriptions(p.data.prescriptions || []);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      toast.success(`Marked ${status}`);
      load();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  function prescriptionFor(apptId: string) {
    return prescriptions.find((p) => String(p.appointment) === String(apptId));
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <PageHeader
        title="Appointments"
        subtitle={user?.role === 'doctor' ? 'Patients booked with you.' : 'Your upcoming and past consultations.'}
      />

      <div className="space-y-3">
        {loading && <div className="text-slate-500">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="text-slate-500 text-center py-12 card">No appointments yet.</div>
        )}
        {items.map((a) => {
          const isDoctor = user?.role === 'doctor';
          const peer = isDoctor ? a.patient?.name : `Dr. ${a.doctor?.user?.name}`;
          return (
            <div key={a._id} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">{peer}</div>
                  <div className="text-sm text-slate-500">
                    {a.date} · {a.time} · <span className="capitalize">{a.mode}</span>
                  </div>
                  {a.reason && (
                    <div className="text-xs text-slate-500 mt-1 max-w-md">{a.reason}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[a.status]}`}>
                  {a.status}
                </span>
                {a.status === 'confirmed' && a.mode === 'video' && (
                  <Link href={`/video/${a._id}`} className="btn-primary text-sm py-2">
                    <Video className="w-4 h-4" /> Join
                  </Link>
                )}
                {a.status === 'confirmed' && (
                  <Link
                    href={`/chat?with=${isDoctor ? a.patient?._id : a.doctor?.user?._id}`}
                    className="btn-outline text-sm py-2"
                  >
                    <MessagesSquare className="w-4 h-4" /> Chat
                  </Link>
                )}
                {isDoctor && a.status === 'pending' && (
                  <>
                    <button onClick={() => setStatus(a._id, 'confirmed')} className="btn-outline text-sm py-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                      <CheckCircle2 className="w-4 h-4" /> Accept
                    </button>
                    <button onClick={() => setStatus(a._id, 'cancelled')} className="btn-outline text-sm py-2 text-rose-700 border-rose-200 hover:bg-rose-50">
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </>
                )}
                {!isDoctor && a.status === 'pending' && (
                  <button onClick={() => setStatus(a._id, 'cancelled')} className="btn-ghost text-sm py-2 text-slate-600">
                    <Clock className="w-4 h-4" /> Cancel
                  </button>
                )}
                {isDoctor && a.status === 'confirmed' && (
                  <button onClick={() => setStatus(a._id, 'completed')} className="btn-ghost text-sm py-2">
                    Mark complete
                  </button>
                )}
                {isDoctor && (a.status === 'confirmed' || a.status === 'completed') && (
                  <button
                    onClick={() => setRxFor(a)}
                    className="btn-outline text-sm py-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <FileSignature className="w-4 h-4" /> Write Rx
                  </button>
                )}
                {isDoctor && (
                  <button
                    onClick={() => setViewingPatient({ id: a.patient?._id, name: a.patient?.name })}
                    className="btn-outline text-sm py-2"
                    title="View patient medical profile"
                  >
                    <UserSquare2 className="w-4 h-4" /> Profile
                  </button>
                )}
                {!isDoctor && prescriptionFor(a._id) && (
                  <button
                    onClick={() => setViewing(prescriptionFor(a._id))}
                    className="btn-outline text-sm py-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                  >
                    <FileText className="w-4 h-4" /> View Rx
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rxFor && (
        <PrescriptionForm
          appointmentId={rxFor._id}
          patientName={rxFor.patient?.name}
          onClose={() => setRxFor(null)}
          onCreated={() => load()}
        />
      )}
      {viewing && <PrescriptionView prescription={viewing} onClose={() => setViewing(null)} />}
      {viewingPatient && (
        <PatientProfileModal
          patientId={viewingPatient.id}
          patientName={viewingPatient.name}
          onClose={() => setViewingPatient(null)}
        />
      )}
    </div>
  );
}
