'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, LocalTrackPublication } from 'livekit-client';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Pencil,
  FileSignature,
} from 'lucide-react';
import Link from 'next/link';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Whiteboard from '@/components/Whiteboard';
import PrescriptionForm from '@/components/PrescriptionForm';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWb, setShowWb] = useState(false);
  const [showRx, setShowRx] = useState(false);
  const [appt, setAppt] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      api.post('/video/token', { appointmentId: id }),
      api.get(`/appointments/${id}`).catch(() => ({ data: { appointment: null } })),
    ])
      .then(([t, a]: any) => {
        setToken(t.data.token);
        setUrl(t.data.url);
        setRoom(t.data.room);
        setAppt(a.data.appointment);
      })
      .catch((err) => setError(apiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing your secure video room…
        </div>
      </div>
    );
  }
  if (error || !token || !url) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-rose-600 font-semibold">Cannot join the call</div>
          <p className="text-sm text-slate-600 mt-2">{error || 'Token could not be issued.'}</p>
          <Link href="/appointments" className="btn-primary mt-4 inline-flex">
            <ArrowLeft className="w-4 h-4" /> Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="h-screen w-full bg-slate-950 text-white flex flex-col" data-lk-theme="default">
      <LiveKitRoom
        video
        audio
        token={token}
        serverUrl={url}
        connect
        onDisconnected={() => router.push('/appointments')}
        onError={(e) => toast.error(`Video error: ${e.message}`)}
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <RoomBanner room={room || ''} />

        <div className="flex-1 flex min-h-0">
          <div className={`${showWb ? 'flex-1' : 'flex-1'} min-w-0 flex flex-col`}>
            <Stage />
          </div>
          {showWb && (
            <div className="w-[42%] max-w-[640px] border-l border-slate-800 bg-white text-slate-900">
              <Whiteboard room={`appt_${id}`} readOnly={!isDoctor} />
            </div>
          )}
        </div>

        <RoomAudioRenderer />
        <CustomControls
          onToggleWhiteboard={() => setShowWb((v) => !v)}
          isDoctor={isDoctor}
          showWb={showWb}
          onOpenPrescription={() => setShowRx(true)}
        />
      </LiveKitRoom>

      {showRx && (
        <PrescriptionForm
          appointmentId={id}
          patientName={appt?.patient?.name}
          onClose={() => setShowRx(false)}
        />
      )}
    </div>
  );
}

function RoomBanner({ room }: { room: string }) {
  const participants = useParticipants();
  const others = Math.max(0, participants.length - 1);
  return (
    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
      <div>
        <span className="text-slate-400">Room:</span>{' '}
        <span className="font-mono">{room}</span>
      </div>
      <div className="text-slate-300">
        {others <= 0 ? 'Waiting for the other participant…' : `${others} other participant${others > 1 ? 's' : ''} joined`}
      </div>
    </div>
  );
}

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <GridLayout tracks={tracks} style={{ flex: 1 }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function CustomControls({
  onToggleWhiteboard,
  isDoctor,
  showWb,
  onOpenPrescription,
}: {
  onToggleWhiteboard: () => void;
  isDoctor: boolean;
  showWb: boolean;
  onOpenPrescription: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);

  useEffect(() => {
    setCamOn(localParticipant.isCameraEnabled);
    setMicOn(localParticipant.isMicrophoneEnabled);
    setScreenOn(localParticipant.isScreenShareEnabled);
  }, [localParticipant]);

  async function toggleCam() {
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }
  async function toggleMic() {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }
  async function toggleScreen() {
    const next = !screenOn;
    await localParticipant.setScreenShareEnabled(next);
    setScreenOn(next);
  }
  function leave() {
    localParticipant.setCameraEnabled(false);
    localParticipant.setMicrophoneEnabled(false);
    // LiveKitRoom's onDisconnected fires the redirect
    (localParticipant as any)?.engine?.client?.close?.();
    window.history.back();
  }

  const Btn = ({ on, onClick, label, IconOn, IconOff, color }: any) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium min-w-[78px] transition ${
        color === 'red'
          ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
          : on
          ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
          : 'bg-rose-600/90 border-rose-600 text-white hover:bg-rose-700'
      }`}
    >
      {on ? <IconOn className="w-4 h-4 mb-1" /> : <IconOff className="w-4 h-4 mb-1" />}
      {label}
    </button>
  );

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2 flex-wrap">
      <Btn
        on={micOn}
        onClick={toggleMic}
        label={micOn ? 'Mute' : 'Unmute'}
        IconOn={Mic}
        IconOff={MicOff}
      />
      <Btn
        on={camOn}
        onClick={toggleCam}
        label={camOn ? 'Stop video' : 'Start video'}
        IconOn={VideoIcon}
        IconOff={VideoOff}
      />
      <Btn
        on={!screenOn}
        onClick={toggleScreen}
        label={screenOn ? 'Stop share' : 'Share screen'}
        IconOn={ScreenShare}
        IconOff={ScreenShareOff}
      />
      <button
        onClick={onToggleWhiteboard}
        className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium min-w-[78px] transition ${
          showWb ? 'bg-brand-600 border-brand-600 text-white' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
        }`}
        title="Toggle whiteboard"
      >
        <Pencil className="w-4 h-4 mb-1" />
        Whiteboard
      </button>
      {isDoctor && (
        <button
          onClick={onOpenPrescription}
          className="flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium min-w-[78px] transition bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
          title="Write prescription"
        >
          <FileSignature className="w-4 h-4 mb-1" />
          Prescription
        </button>
      )}
      <button
        onClick={leave}
        className="flex flex-col items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium min-w-[78px] bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
      >
        <PhoneOff className="w-4 h-4 mb-1" />
        Leave
      </button>
    </div>
  );
}
