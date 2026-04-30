'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .post('/video/token', { appointmentId: id })
      .then(({ data }) => {
        setToken(data.token);
        setUrl(data.url);
      })
      .catch((err) => {
        toast.error(apiError(err));
        router.push('/appointments');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500">
        Preparing your secure video room…
      </div>
    );
  }

  if (!token || !url) return null;

  return (
    <div className="h-screen w-full bg-slate-950 text-white" data-lk-theme="default">
      <LiveKitRoom
        video
        audio
        token={token}
        serverUrl={url}
        connect
        onDisconnected={() => router.push('/appointments')}
        style={{ height: '100vh' }}
      >
        <Stage />
        <RoomAudioRenderer />
        <ControlBar variation="verbose" />
      </LiveKitRoom>
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
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - 80px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
