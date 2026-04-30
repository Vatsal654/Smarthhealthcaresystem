'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bot, Send, AlertTriangle, Sparkles, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

type Risk = 'green' | 'yellow' | 'red';

interface Match {
  name: string;
  confidence: number;
  riskLevel: Risk;
  matchedSymptoms: string[];
  missedSymptoms?: string[];
  specialist?: string;
  homeRemedies?: string[];
  medicines?: string[];
  description?: string;
}

interface FollowUp {
  key: string;
  type: 'text' | 'choice' | 'number' | 'boolean';
  label: string;
  options?: { value: string; label: string }[];
}

interface ChatMsg {
  role: 'user' | 'bot';
  text?: string;
  report?: any;
  followUps?: FollowUp[];
}

const STARTERS = [
  'Fever and cough since 2 days',
  'Stomach pain and vomiting',
  'Headache, body ache, chills',
  'Shortness of breath while walking',
];

export default function AICheckerPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text:
        "Hi, I'm your AI health assistant. Tell me what you're feeling — for example, \"fever and sore throat since yesterday\" — and I'll guide you to the next step.",
    },
  ]);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text: string, mergedAnswers?: Record<string, any>) {
    if (!text.trim() && !mergedAnswers) return;
    if (text.trim()) setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/analyze', {
        text,
        answers: mergedAnswers || answers,
        sessionId,
      });
      setSessionId(data.sessionId);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: data.summary,
          report: data,
          followUps: data.followUps,
        },
      ]);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(key: string, value: any, label?: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    setMessages((m) => [...m, { role: 'user', text: `${label || key}: ${value}` }]);
    send('', next);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-3">
        <PageHeader
          title="AI Symptom Checker"
          subtitle="Describe how you feel — I'll match against a curated medical knowledge base."
        />
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 md:px-10 pb-32">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} onAnswer={handleAnswer} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:0.3s]" />
              Analyzing your symptoms…
            </div>
          )}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700"
                >
                  <Sparkles className="inline w-3.5 h-3.5 mr-1 text-brand-500" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-6 md:px-10 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="max-w-3xl mx-auto flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. fever, cough, headache since 2 days"
            className="input"
          />
          <button disabled={loading || !input.trim()} className="btn-primary">
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="max-w-3xl mx-auto text-[11px] text-slate-400 mt-2 text-center">
          SHS gives indicative guidance only and is not a medical diagnosis.
        </p>
      </div>
    </div>
  );
}

function Bubble({
  msg,
  onAnswer,
}: {
  msg: ChatMsg;
  onAnswer: (k: string, v: any, label?: string) => void;
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="max-w-[85%] space-y-3">
        {msg.text && (
          <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-800 leading-relaxed shadow-soft">
            {msg.text}
          </div>
        )}

        {msg.report && <Report report={msg.report} />}

        {msg.followUps && msg.followUps.length > 0 && (
          <div className="space-y-2">
            {msg.followUps.map((q) => (
              <FollowUpCard key={q.key} q={q} onAnswer={onAnswer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpCard({
  q,
  onAnswer,
}: {
  q: FollowUp;
  onAnswer: (k: string, v: any, label?: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div className="card p-4">
      <div className="text-sm font-medium text-slate-800">{q.label}</div>
      {q.type === 'choice' && q.options && (
        <div className="flex flex-wrap gap-2 mt-3">
          {q.options.map((o) => (
            <button
              key={o.value}
              onClick={() => onAnswer(q.key, o.value, q.label)}
              className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-brand-300 hover:bg-brand-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {q.type === 'boolean' && (
        <div className="flex gap-2 mt-3">
          {['Yes', 'No'].map((o) => (
            <button
              key={o}
              onClick={() => onAnswer(q.key, o === 'Yes', q.label)}
              className="px-3 py-1.5 rounded-full text-sm border border-slate-200 hover:border-brand-300 hover:bg-brand-50"
            >
              {o}
            </button>
          ))}
        </div>
      )}
      {(q.type === 'text' || q.type === 'number') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onAnswer(q.key, q.type === 'number' ? Number(text) : text, q.label);
          }}
          className="flex gap-2 mt-3"
        >
          <input
            type={q.type === 'number' ? 'number' : 'text'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input"
            placeholder="Your answer"
          />
          <button className="btn-primary" disabled={!text.trim()}>
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

function Report({ report }: { report: any }) {
  const risk: Risk = report.overallRisk;
  const riskClass = risk === 'red' ? 'risk-red' : risk === 'yellow' ? 'risk-yellow' : 'risk-green';
  const matches: Match[] = report.matches || [];

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${riskClass}`}>
            {risk} risk
          </span>
          {report.extractedSymptoms?.length > 0 && (
            <span className="text-xs text-slate-500">
              · {report.extractedSymptoms.join(', ')}
            </span>
          )}
        </div>
        {risk === 'red' && (
          <span className="flex items-center gap-1 text-xs text-rose-600 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Seek care urgently
          </span>
        )}
      </div>

      {matches.length > 0 && (
        <div className="space-y-2">
          {matches.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
              <div>
                <div className="font-semibold text-slate-800">{m.name}</div>
                <div className="text-xs text-slate-500">
                  Specialist: {m.specialist || 'General Physician'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-slate-900">{m.confidence}%</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">match</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {matches[0]?.homeRemedies?.length ? (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Suggested home care
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matches[0].homeRemedies!.slice(0, 5).map((h) => (
              <span key={h} className="chip">{h}</span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Link href="/doctors" className="btn-primary text-sm py-2">
          <Stethoscope className="w-4 h-4" />
          {risk === 'red' ? 'Connect to a doctor now' : 'Book a doctor'}
        </Link>
        <Link href="/nearby" className="btn-outline text-sm py-2">
          Nearby hospitals
        </Link>
      </div>

      <p className="text-[11px] text-slate-400">
        {report.disclaimer}
      </p>
    </div>
  );
}
