'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, MessagesSquare, Check, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
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
  seen?: boolean;
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

  // refs so we can read latest values inside socket handlers
  const activePeerIdRef = useRef<string | null>(activePeerId);
  useEffect(() => {
    activePeerIdRef.current = activePeerId;
  }, [activePeerId]);

  async function loadThreads() {
    try {
      const { data } = await api.get('/chat/threads');
      setThreads(data.threads || []);
      // if URL ?with=xxx and that peer isn't in threads, fetch their name
      if (activePeerIdRef.current && !data.threads?.some((t: Thread) => t.peer?._id === activePeerIdRef.current)) {
        await fetchPeerName(activePeerIdRef.current);
      }
    } catch (err) {
      // ignore
    }
  }

  async function fetchPeerName(peerId: string) {
    try {
      const { data } = await api.get(`/chat/peer/${peerId}`);
      if (data?.user?.name) setActivePeerName(data.user.name);
    } catch {
      // best-effort
    }
  }

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // wire socket once when user is known
  useEffect(() => {
    if (!user) return;
    const myId = user.id;
    const socket = getSocket();

    function onIncoming(msg: Message) {
      const peer = activePeerIdRef.current;
      const involves =
        peer && (String(msg.sender) === peer || String(msg.receiver) === peer);
      if (involves) {
        setMessages((m) => [...m, msg]);
        // mark as seen if I am the receiver and chat is open
        if (String(msg.receiver) === myId) {
          socket.emit('chat:seen', { peerId: peer });
        }
      }
      // refresh threads for both sides whenever a message arrives
      loadThreads();
    }

    function onTyping({ from, typing }: { from: string; typing: boolean }) {
      if (from === activePeerIdRef.current) setTyping(typing);
    }

    function onPresence({ userId, online: isOn }: any) {
      setOnline((p) => ({ ...p, [userId]: isOn }));
    }

    function onSeen({ by }: { by: string }) {
      // mark all my messages to "by" as seen
      setMessages((m) =>
        m.map((msg) =>
          String(msg.sender) === myId && String(msg.receiver) === by
            ? { ...msg, seen: true }
            : msg
        )
      );
    }

    function onNotify({ from, preview }: { from: string; preview: string }) {
      if (from !== activePeerIdRef.current) toast(`💬 ${preview}`);
    }

    socket.on('chat:message', onIncoming);
    socket.on('chat:typing', onTyping);
    socket.on('presence:update', onPresence);
    socket.on('chat:seen', onSeen);
    socket.on('chat:notify', onNotify);

    return () => {
      socket.off('chat:message', onIncoming);
      socket.off('chat:typing', onTyping);
      socket.off('presence:update', onPresence);
      socket.off('chat:seen', onSeen);
      socket.off('chat:notify', onNotify);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // on active peer change: join, fetch history, mark seen, set name
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
    if (fromThread) {
      setActivePeerName(fromThread.peer.name);
    } else if (!activePeerName) {
      fetchPeerName(activePeerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeerId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activePeerId) return;
    const socket = getSocket();
    socket.emit(
      'chat:message',
      { peerId: activePeerId, content: input },
      (res: any) => {
        if (res?.error) toast.error(res.error);
      }
    );
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
      <aside className="w-72 border-r border-slate-100 bg-white hidden md:flex flex-col">
        <div className="px-5 h-16 flex items-center font-semibold border-b border-slate-100">
          <MessagesSquare className="w-4 h-4 mr-2" /> Conversations
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 && (
            <div className="text-sm text-slate-500 p-5">
              No conversations yet. Messages will appear here once you start chatting.
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
                {online[t.peer?._id] && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                )}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {t.lastMessage?.content || 'New conversation'}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 h-16 flex items-center justify-between border-b border-slate-100 bg-white">
          <div>
            <div className="font-semibold">{activePeerName || (activePeerId ? 'Loading…' : 'Pick a conversation')}</div>
            <div className="text-xs text-slate-500">
              {activePeerId
                ? typing
                  ? 'Typing…'
                  : online[activePeerId]
                  ? 'Online'
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
                  <div>{m.content}</div>
                  {mine && (
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/70">
                      {m.createdAt && (
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                      {m.seen ? (
                        <CheckCheck className="w-3 h-3 text-sky-300" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </div>
                  )}
                  {!mine && m.createdAt && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-2xl bg-white border border-slate-100 text-xs text-slate-500">
                Typing…
              </div>
            </div>
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
