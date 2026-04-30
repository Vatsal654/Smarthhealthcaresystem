'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MessagesSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';

interface Thread {
  room: string;
  peer: { _id: string; name: string; avatarUrl?: string; role?: string };
  lastMessage: any;
}

interface Message {
  _id?: string;
  sender: string;
  receiver: string;
  content: string;
  createdAt?: string;
}

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const search = useSearchParams();
  const { user } = useAuth();
  const peerIdFromUrl = search.get('with');

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(peerIdFromUrl);
  const [activePeerName, setActivePeerName] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/chat/threads').then(({ data }) => setThreads(data.threads || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    socket.on('chat:message', (msg: Message) => {
      if (
        activePeerId &&
        (String(msg.sender) === activePeerId || String(msg.receiver) === activePeerId)
      ) {
        setMessages((m) => [...m, msg]);
      }
    });

    socket.on('chat:typing', ({ from, typing }: { from: string; typing: boolean }) => {
      if (from === activePeerId) setTyping(typing);
    });

    socket.on('presence:update', ({ userId, online: isOn }: any) => {
      setOnline((p) => ({ ...p, [userId]: isOn }));
    });

    socket.on('chat:notify', ({ from, preview }: any) => {
      if (from !== activePeerId) toast(`💬 ${preview}`);
    });

    return () => {
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('presence:update');
      socket.off('chat:notify');
    };
  }, [user, activePeerId]);

  useEffect(() => {
    if (!activePeerId) return;
    const socket = getSocket();
    socket.emit('chat:join', { peerId: activePeerId });

    api
      .get('/chat/history', { params: { with: activePeerId } })
      .then(({ data }) => {
        setMessages(data.messages || []);
        socket.emit('chat:seen', { peerId: activePeerId });
      })
      .catch((err) => toast.error(apiError(err)));

    const fromThread = threads.find((t) => t.peer?._id === activePeerId);
    if (fromThread) setActivePeerName(fromThread.peer.name);
  }, [activePeerId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activePeerId) return;
    const socket = getSocket();
    socket.emit('chat:message', { peerId: activePeerId, content: input }, (res: any) => {
      if (res?.error) toast.error(res.error);
    });
    setInput('');
  }

  let typingTimer: any;
  function onInputChange(v: string) {
    setInput(v);
    if (!activePeerId) return;
    const socket = getSocket();
    socket.emit('chat:typing', { peerId: activePeerId, typing: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit('chat:typing', { peerId: activePeerId, typing: false });
    }, 1200);
  }

  return (
    <div className="flex h-screen">
      {/* Threads list */}
      <aside className="w-72 border-r border-slate-100 bg-white hidden md:flex flex-col">
        <div className="px-5 h-16 flex items-center font-semibold border-b border-slate-100">
          <MessagesSquare className="w-4 h-4 mr-2" /> Conversations
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="text-sm text-slate-500 p-5">
              No conversations yet. Start by booking an appointment.
            </div>
          )}
          {threads.map((t) => (
            <button
              key={t.room}
              onClick={() => {
                setActivePeerId(t.peer?._id || null);
                setActivePeerName(t.peer?.name || '');
              }}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ${
                activePeerId === t.peer?._id ? 'bg-brand-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm truncate">{t.peer?.name || 'User'}</div>
                {online[t.peer?._id] && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {t.lastMessage?.content || 'New conversation'}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 h-16 flex items-center justify-between border-b border-slate-100 bg-white">
          <div>
            <div className="font-semibold">{activePeerName || 'Pick a conversation'}</div>
            <div className="text-xs text-slate-500">
              {activePeerId
                ? online[activePeerId]
                  ? 'Online'
                  : typing
                  ? 'Typing…'
                  : 'Offline'
                : ''}
            </div>
          </div>
        </div>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-6 space-y-2 bg-slate-50/50">
          {!activePeerId && (
            <div className="text-center text-slate-400 mt-20">
              Select a conversation from the left.
            </div>
          )}
          {messages.map((m, i) => {
            const mine = String(m.sender) === user?.id;
            return (
              <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[70%] text-sm ${
                    mine
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="text-xs text-slate-500 ml-2">Typing…</div>
          )}
        </div>

        {activePeerId && (
          <form onSubmit={send} className="border-t border-slate-100 bg-white p-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type a message…"
              className="input"
            />
            <button disabled={!input.trim()} className="btn-primary">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
