'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
  useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { api, apiError } from '@/lib/api';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .post('/video/token', { appointmentId: id })
      .then(({ data }) => {
        setToken(data.token);
        setUrl(data.url);
        setRoom(data.room);
      })
      .catch((err) => {
        setError(apiError(err));
      })
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
          <p className="text-sm text-slate-600 mt-2">
            {error ||
              'Token could not be issued. The appointment must be confirmed by the doctor before joining.'}
          </p>
          <Link href="/appointments" className="btn-primary mt-4 inline-flex">
            <ArrowLeft className="w-4 h-4" /> Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 text-white" data-lk-theme="default">
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
        <Stage />
        <RoomAudioRenderer />
        <ControlBar variation="verbose" />
      </LiveKitRoom>
    </div>
  );
}

function RoomBanner({ room }: { room: string }) {
  const participants = useParticipants();
  const others = participants.length - 1;
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
