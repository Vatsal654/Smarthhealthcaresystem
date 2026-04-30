'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Crosshair, Hospital, Pill, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

const NearbyMap = dynamic(() => import('@/components/NearbyMap'), { ssr: false });

const TYPES = [
  { value: 'hospital', label: 'Hospitals', icon: Hospital },
  { value: 'pharmacy', label: 'Pharmacies', icon: Pill },
  { value: 'clinic', label: 'Clinics', icon: Stethoscope },
];

export default function NearbyWrapper() {
  return (
    <Suspense fallback={null}>
      <NearbyPage />
    </Suspense>
  );
}

function NearbyPage() {
  const search = useSearchParams();
  const [type, setType] = useState(search.get('type') || 'hospital');
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function locate() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error('Unable to get your location'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => { locate(); }, []);

  useEffect(() => {
    if (!origin) return;
    setLoading(true);
    api
      .get('/maps/nearby', { params: { lat: origin.lat, lng: origin.lng, type, radius: 5000 } })
      .then(({ data }) => setPlaces(data.places || []))
      .catch((err) => toast.error(apiError(err)))
      .finally(() => setLoading(false));
  }, [origin, type]);

  const sorted = useMemo(() => places.slice(0, 30), [places]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <PageHeader
        title="Nearby Care"
        subtitle="Hospitals, pharmacies and clinics around you."
        right={
          <button onClick={locate} className="btn-outline">
            <Crosshair className="w-4 h-4" /> Recenter
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border ${
                active
                  ? 'bg-brand-50 border-brand-300 text-brand-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-1.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 h-[60vh] rounded-2xl overflow-hidden border border-slate-100 bg-slate-100">
          {origin ? (
            <NearbyMap origin={origin} places={sorted} />
          ) : (
            <div className="h-full grid place-items-center text-slate-500 text-sm">
              Allow location to see the map.
            </div>
          )}
        </div>
        <div className="card p-2 max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-4 text-slate-500 text-sm">Searching nearby…</div>}
          {!loading && sorted.length === 0 && (
            <div className="p-4 text-slate-500 text-sm">Nothing found within 5 km.</div>
          )}
          {sorted.map((p) => (
            <div key={p.id} className="px-3 py-3 border-b border-slate-50 last:border-0">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-slate-500 truncate">{p.address || '—'}</div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-slate-500">
                  {(p.distanceMeters / 1000).toFixed(2)} km
                </span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-600 font-medium"
                >
                  Directions →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
