'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Plus, FileSignature, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';

type MedicineRow = { name: string; dosage: string; frequency: string; duration: string; notes: string };

export default function PrescriptionForm({
  appointmentId,
  patientName,
  onClose,
  onCreated,
}: {
  appointmentId: string;
  patientName?: string;
  onClose: () => void;
  onCreated?: (prescription: any) => void;
}) {
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    { name: '', dosage: '', frequency: '', duration: '', notes: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const sigRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  function setRow(i: number, k: keyof MedicineRow, v: string) {
    setMedicines((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }

  function addRow() {
    setMedicines((rows) => [...rows, { name: '', dosage: '', frequency: '', duration: '', notes: '' }]);
  }

  function removeRow(i: number) {
    setMedicines((rows) => rows.filter((_, idx) => idx !== i));
  }

  function getCtx() {
    return sigRef.current?.getContext('2d') || null;
  }
  function pos(e: React.MouseEvent | React.TouchEvent): [number, number] {
    const c = sigRef.current!;
    const rect = c.getBoundingClientRect();
    const p = 'touches' in e ? e.touches[0] : e;
    return [((p.clientX - rect.left) / rect.width) * c.width, ((p.clientY - rect.top) / rect.height) * c.height];
  }
  function sigStart(e: React.MouseEvent | React.TouchEvent) {
    drawingRef.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function sigMove(e: React.MouseEvent | React.TouchEvent) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.stroke();
  }
  function sigEnd() {
    drawingRef.current = false;
  }
  function sigClear() {
    const c = sigRef.current;
    const ctx = getCtx();
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const filled = medicines.filter((m) => m.name.trim());
    if (filled.length === 0) {
      toast.error('Add at least one medicine');
      return;
    }
    setSaving(true);
    try {
      const signatureDataUrl = sigRef.current?.toDataURL('image/png');
      const { data } = await api.post('/prescriptions', {
        appointmentId,
        diagnosis,
        instructions,
        medicines: filled,
        signatureDataUrl,
      });
      toast.success('Prescription sent');
      onCreated?.(data.prescription);
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm grid place-items-center z-50 p-4 overflow-auto text-slate-900">
      <form onSubmit={submit} className="card w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto text-slate-900">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-brand-600" />
              New prescription
            </h3>
            {patientName && (
              <p className="text-xs text-slate-500 mt-0.5">For {patientName}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="label">Diagnosis</label>
            <input className="input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute viral pharyngitis" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Medicines</label>
              <button type="button" onClick={addRow} className="text-xs text-brand-600 inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add medicine
              </button>
            </div>
            <div className="space-y-2">
              {medicines.map((m, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="Name (e.g. Paracetamol 500mg)" value={m.name} onChange={(e) => setRow(i, 'name', e.target.value)} />
                    <input className="input" placeholder="Dosage (e.g. 1 tab)" value={m.dosage} onChange={(e) => setRow(i, 'dosage', e.target.value)} />
                    <input className="input" placeholder="Frequency (e.g. TID after food)" value={m.frequency} onChange={(e) => setRow(i, 'frequency', e.target.value)} />
                    <input className="input" placeholder="Duration (e.g. 5 days)" value={m.duration} onChange={(e) => setRow(i, 'duration', e.target.value)} />
                  </div>
                  <input className="input mt-2" placeholder="Notes (optional)" value={m.notes} onChange={(e) => setRow(i, 'notes', e.target.value)} />
                  {medicines.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="text-xs text-rose-600 mt-2 inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label">Instructions to patient</label>
            <textarea className="input min-h-[80px]" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Drink plenty of fluids, rest, gargle with warm salt water…" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Signature</label>
              <button type="button" onClick={sigClear} className="text-xs text-slate-500">Clear</button>
            </div>
            <canvas
              ref={sigRef}
              width={500}
              height={140}
              className="w-full h-[140px] border border-slate-200 rounded-xl bg-slate-50 touch-none"
              onMouseDown={sigStart}
              onMouseMove={sigMove}
              onMouseUp={sigEnd}
              onMouseLeave={sigEnd}
              onTouchStart={sigStart}
              onTouchMove={sigMove}
              onTouchEnd={sigEnd}
              style={{ cursor: 'crosshair' }}
            />
            <p className="text-[11px] text-slate-400 mt-1">Sign with your mouse or finger.</p>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button disabled={saving} className="btn-primary">
            <Send className="w-4 h-4" /> {saving ? 'Sending…' : 'Send to patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
