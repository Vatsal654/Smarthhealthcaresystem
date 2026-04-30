'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon paths under Webpack/Next
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const meIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(37,99,235,.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  phone?: string | null;
  address?: string;
  distanceMeters: number;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function NearbyMap({
  origin,
  places,
}: {
  origin: { lat: number; lng: number };
  places: Place[];
}) {
  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={14}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
      />
      <Recenter lat={origin.lat} lng={origin.lng} />
      <Marker position={[origin.lat, origin.lng]} icon={meIcon}>
        <Popup>You are here</Popup>
      </Marker>
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{p.name}</div>
              {p.address && <div className="text-slate-600">{p.address}</div>}
              <div className="text-xs text-slate-500 mt-1">
                {(p.distanceMeters / 1000).toFixed(1)} km away
              </div>
              {p.phone && (
                <a href={`tel:${p.phone}`} className="text-brand-600 text-xs">
                  {p.phone}
                </a>
              )}
              <a
                href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`}
                target="_blank"
                rel="noreferrer"
                className="block text-brand-600 text-xs mt-1"
              >
                Open directions →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
