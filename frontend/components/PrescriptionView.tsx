'use client';

import { X, Printer, Download } from 'lucide-react';

export default function PrescriptionView({
  prescription,
  onClose,
}: {
  prescription: any;
  onClose: () => void;
}) {
  function downloadPdf() {
    window.print();
  }

  const doctorName = prescription.doctor?.user?.name || 'Doctor';
  const dateStr = new Date(prescription.createdAt || Date.now()).toLocaleString();

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm grid place-items-center z-50 p-4 overflow-auto">
      <div className="card w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold">Prescription</h3>
          <div className="flex gap-1">
            <button onClick={downloadPdf} className="p-2 hover:bg-slate-100 rounded-lg" title="Print / Save PDF">
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 print:p-10">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-2xl font-bold text-brand-600">SHS</div>
              <div className="text-xs text-slate-500">Smart Healthcare System</div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Issued: {dateStr}</div>
              <div className="font-mono mt-1">#{String(prescription._id).slice(-8)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wide">Doctor</div>
              <div className="font-semibold">Dr. {doctorName}</div>
              {prescription.doctor?.specialization && (
                <div className="text-slate-500 text-xs">{prescription.doctor.specialization}</div>
              )}
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wide">Patient</div>
              <div className="font-semibold">{prescription.patient?.name || '—'}</div>
              <div className="text-slate-500 text-xs">{prescription.patient?.email || ''}</div>
            </div>
          </div>

          {prescription.diagnosis && (
            <div className="mt-5">
              <div className="text-slate-500 text-xs uppercase tracking-wide">Diagnosis</div>
              <div className="text-sm font-medium">{prescription.diagnosis}</div>
            </div>
          )}

          <div className="mt-5">
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-2">Rx — Medicines</div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left p-2.5">Name</th>
                    <th className="text-left p-2.5">Dosage</th>
                    <th className="text-left p-2.5">Frequency</th>
                    <th className="text-left p-2.5">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {(prescription.medicines || []).map((m: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100 align-top">
                      <td className="p-2.5 font-medium">{m.name}</td>
                      <td className="p-2.5">{m.dosage || '—'}</td>
                      <td className="p-2.5">{m.frequency || '—'}</td>
                      <td className="p-2.5">{m.duration || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(prescription.medicines || []).some((m: any) => m.notes) && (
              <ul className="mt-3 text-xs text-slate-600 list-disc pl-5 space-y-0.5">
                {prescription.medicines.filter((m: any) => m.notes).map((m: any, i: number) => (
                  <li key={i}><strong>{m.name}:</strong> {m.notes}</li>
                ))}
              </ul>
            )}
          </div>

          {prescription.instructions && (
            <div className="mt-5">
              <div className="text-slate-500 text-xs uppercase tracking-wide">Instructions</div>
              <p className="text-sm leading-relaxed">{prescription.instructions}</p>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-slate-200 flex items-end justify-between">
            <div className="text-[11px] text-slate-400 max-w-xs">
              This prescription was generated through SHS and digitally signed. Verify by hash #{String(prescription._id).slice(-8)}.
            </div>
            {prescription.signatureDataUrl && (
              <div className="text-right">
                <img src={prescription.signatureDataUrl} alt="Signature" className="h-14 inline-block" />
                <div className="text-xs text-slate-500 border-t border-slate-300 mt-1 pt-0.5">Dr. {doctorName}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
