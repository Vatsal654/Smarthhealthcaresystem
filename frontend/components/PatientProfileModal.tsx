'use client';

import { useEffect, useState } from 'react';
import { X, User, AlertCircle, Pill, Heart, Phone } from 'lucide-react';
import { api, apiError } from '@/lib/api';

interface MedicalProfile {
  age?: number;
  gender?: string;
  bloodGroup?: string;
  heightCm?: number;
  weightKg?: number;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  pastSurgeries?: string[];
  emergencyContact?: { name?: string; phone?: string; relation?: string };
}

export default function PatientProfileModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName?: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/profile/patient/${patientId}`)
      .then(({ data }) => setProfile(data.profile))
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm grid place-items-center z-50 p-4 overflow-auto">
      <div className="card w-full max-w-lg bg-white max-h-[90vh] overflow-y-auto text-slate-900">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-brand-600" />
              Medical Profile
            </h3>
            {patientName && <p className="text-xs text-slate-500 mt-0.5">{patientName}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading && <div className="text-slate-500 text-sm py-8 text-center">Loading…</div>}
          {error && <div className="text-rose-600 text-sm py-8 text-center">{error}</div>}
          {!loading && !error && !profile && (
            <div className="text-slate-400 text-sm py-8 text-center">
              This patient hasn't filled their medical profile yet.
            </div>
          )}
          {profile && (
            <div className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-3 gap-3">
                <InfoBox label="Age" value={profile.age ? `${profile.age} yrs` : '—'} />
                <InfoBox label="Gender" value={profile.gender || '—'} />
                <InfoBox label="Blood group" value={profile.bloodGroup || '—'} />
                <InfoBox label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : '—'} />
                <InfoBox label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : '—'} />
              </div>

              <ListSection
                icon={AlertCircle}
                title="Allergies"
                color="rose"
                items={profile.allergies}
                empty="None reported"
              />
              <ListSection
                icon={Heart}
                title="Chronic conditions"
                color="amber"
                items={profile.chronicConditions}
                empty="None reported"
              />
              <ListSection
                icon={Pill}
                title="Current medications"
                color="brand"
                items={profile.currentMedications}
                empty="None reported"
              />
              <ListSection
                icon={AlertCircle}
                title="Past surgeries"
                color="slate"
                items={profile.pastSurgeries}
                empty="None reported"
              />

              {profile.emergencyContact && (
                <div className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-2">
                    <Phone className="w-4 h-4 text-emerald-600" /> Emergency contact
                  </div>
                  <div className="text-sm text-slate-700 space-y-0.5">
                    {profile.emergencyContact.name && <div><span className="text-slate-400">Name:</span> {profile.emergencyContact.name}</div>}
                    {profile.emergencyContact.relation && <div><span className="text-slate-400">Relation:</span> {profile.emergencyContact.relation}</div>}
                    {profile.emergencyContact.phone && <div><span className="text-slate-400">Phone:</span> {profile.emergencyContact.phone}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}

function ListSection({
  icon: Icon, title, color, items, empty,
}: { icon: any; title: string; color: string; items?: string[]; empty: string }) {
  const colorMap: Record<string, string> = {
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    brand: 'text-brand-600',
    slate: 'text-slate-500',
  };
  return (
    <div>
      <div className={`flex items-center gap-1.5 font-semibold text-sm mb-2 ${colorMap[color] || 'text-slate-700'}`}>
        <Icon className="w-4 h-4" /> {title}
      </div>
      {!items || items.length === 0 ? (
        <div className="text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="chip">{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}
