'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Send,
  AlertTriangle,
  Sparkles,
  Stethoscope,
  Pill,
  Leaf,
  ShieldAlert,
  RotateCcw,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/PageHeader';
import { api, apiError } from '@/lib/api';

type Risk = 'green' | 'yellow' | 'red';
type Role = 'user' | 'bot';

interface Msg { role: Role; content: string; }

interface Match {
  name: string;
  confidence: number;
  riskLevel: Risk;
  specialist?: string;
}
interface Advice {
  message: string;
  remedies: { title: string; description?: string }[];
  medicines: { name: string; dosage?: string; purpose?: string; sideEffects?: string }[];
  urgentActions: { title: string; description?: string }[];
  warningSigns: string[];
  doctorAdvice?: string;
  disclaimer: string;
}
interface SuggestedDoctor {
  _id: string;
  specialization: string;
  hospital?: string;
  city?: string;
  yearsOfExperience: number;
  consultationFee: number;
  rating: number;
  bio?: string;
  user: { _id: string; name: string; avatarUrl?: string };
}
interface FinalReport {
  sessionId: string;
  extractedSymptoms: string[];
  matches: Match[];
  topMatch: Match | null;
  overallRisk: Risk;
  advice: Advice;
  suggestedDoctors: SuggestedDoctor[];
  aiProvider?: string;
  disclaimer: string;
}

const STARTERS = [
  'Fever and cough since 2 days',
  'Stomach pain and vomiting',
  'Headache, body ache, chills',
  'Sore throat with mild fever',
];

export default function AICheckerPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'bot',
      content:
        "Hi, I'm your AI health assistant. Tell me what's troubling you — I'll ask follow-up questions and then give you a personalized report.",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [progress, setProgress] = useState<{ botTurns: number; maxTurns: number }>({ botTurns: 1, maxTurns: 5 });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, report]);

  async function send(text: string, opts?: { finalize?: boolean }) {
    if (report) return;
    const trimmed = text.trim();
    if (!trimmed && !opts?.finalize) return;

    const next = trimmed
      ? [...messages, { role: 'user' as const, content: trimmed }]
      : messages;
    setMessages(next);
    setInput('');
    setThinking(true);

    try {
      const { data } = await api.post('/ai/chat', {
        messages: next,
        sessionId,
        finalize: opts?.finalize,
      });
      setSessionId(data.sessionId);

      if (data.type === 'question') {
        setMessages((m) => [...m, { role: 'bot', content: data.message }]);
        if (data.progress) setProgress(data.progress);
      } else if (data.type === 'report') {
        setReport(data);
        setMessages((m) => [...m, { role: 'bot', content: data.advice?.message || 'Here is your report.' }]);
      }
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setThinking(false);
    }
  }

  function reset() {
    setMessages([
      {
        role: 'bot',
        content:
          "Hi again — tell me what's troubling you and I'll ask follow-up questions until I can give you a clear report.",
      },
    ]);
    setReport(null);
    setSessionId(undefined);
    setInput('');
    setProgress({ botTurns: 1, maxTurns: 5 });
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 md:px-10 pt-6 md:pt-10 pb-3">
        <PageHeader
          title="AI Symptom Checker"
          subtitle={
            report
              ? 'Personalized report ready. You can run a new check below.'
              : 'Tell me what you feel — I think between each answer and ask the next best question.'
          }
          right={
            <div className="flex items-center gap-3">
              {!report && messages.length > 1 && (
                <button
                  onClick={() => send('', { finalize: true })}
                  className="btn-outline text-sm"
                  disabled={thinking}
                >
                  <CheckCircle className="w-4 h-4" /> Finish & report
                </button>
              )}
              {report && (
                <button onClick={reset} className="btn-outline text-sm">
                  <RotateCcw className="w-4 h-4" /> New check
                </button>
              )}
            </div>
          }
        />
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-6 md:px-10 pb-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((m, i) => (
            m.role === 'bot' ? <BotBubble key={i} text={m.content} /> : <UserBubble key={i} text={m.content} />
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-slate-500 text-sm pl-11">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              {report ? 'Compiling…' : 'Thinking…'}
            </div>
          )}

          {report && <FinalReportCard report={report} onReset={reset} />}
        </div>
      </div>

      {!report && (
        <div className="border-t border-slate-100 bg-white px-6 md:px-10 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-3xl mx-auto"
          >
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-sm px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700 transition"
                  >
                    <Sparkles className="inline w-3.5 h-3.5 mr-1 text-brand-500" />
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your reply…"
                className="input"
                autoFocus
              />
              <button disabled={thinking || !input.trim()} className="btn-primary">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
              <span>
                Question {Math.min(progress.botTurns, progress.maxTurns)} of {progress.maxTurns}
              </span>
              <span>SHS gives indicative guidance only — not a diagnosis.</span>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-800 leading-relaxed shadow-soft max-w-[85%]">
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">{text}</div>
    </div>
  );
}

function FinalReportCard({ report, onReset }: { report: FinalReport; onReset: () => void }) {
  const risk = report.overallRisk;
  const banner =
    risk === 'red'
      ? { tone: 'risk-red', label: 'High risk — seek care now', Icon: ShieldAlert }
      : risk === 'yellow'
      ? { tone: 'risk-yellow', label: 'Moderate — monitor and treat', Icon: AlertTriangle }
      : { tone: 'risk-green', label: 'Mild — home care should help', Icon: Leaf };

  return (
    <div className="ml-11 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className={`card p-5 ${banner.tone}`} style={{ borderWidth: 1 }}>
        <div className="flex items-center gap-2 font-semibold">
          <banner.Icon className="w-5 h-5" />
          {banner.label}
        </div>
        <p className="text-sm mt-2 leading-relaxed">{report.advice.message}</p>
        {report.extractedSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {report.extractedSymptoms.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        )}
      </div>

      {report.matches.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">Symptoms may be associated with</div>
            {report.aiProvider && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" />
                Powered by {report.aiProvider}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {report.matches.slice(0, 3).map((m) => (
              <div key={m.name} className="bg-slate-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <div className="text-xs text-slate-500">Specialist: {m.specialist || 'General Physician'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold">{m.confidence}%</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">likelihood</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-teal-500 transition-all duration-700"
                    style={{ width: `${Math.max(2, m.confidence)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Likelihoods are normalized across the top matches.
          </p>
        </div>
      )}

      {report.suggestedDoctors?.length > 0 && (
        <SuggestedDoctorsCard risk={risk} specialty={report.topMatch?.specialist} doctors={report.suggestedDoctors} />
      )}

      {risk === 'green' && report.advice.remedies.length > 0 && (
        <Section icon={Leaf} title="Home remedies" tone="green" items={report.advice.remedies} />
      )}

      {risk === 'yellow' && (
        <>
          {report.advice.remedies.length > 0 && (
            <Section icon={Leaf} title="Home care" tone="green" items={report.advice.remedies} />
          )}
          {report.advice.medicines.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 font-semibold mb-3">
                <Pill className="w-4 h-4 text-brand-600" /> Suggested over-the-counter medicines
              </div>
              <div className="space-y-3">
                {report.advice.medicines.map((m, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-3">
                    <div className="font-semibold">{m.name}</div>
                    {m.dosage && <div className="text-xs text-slate-500">Dosage: {m.dosage}</div>}
                    {m.purpose && <div className="text-xs text-slate-500">Purpose: {m.purpose}</div>}
                    {m.sideEffects && (
                      <div className="text-xs text-rose-600 mt-1"><strong>Side effects:</strong> {m.sideEffects}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.advice.doctorAdvice && (
            <div className="card p-5 bg-amber-50/40 border-amber-200">
              <div className="flex items-center gap-2 font-semibold text-amber-800">
                <Stethoscope className="w-4 h-4" /> Doctor advice
              </div>
              <p className="text-sm text-amber-800 mt-1.5">{report.advice.doctorAdvice}</p>
              <Link href="/doctors" className="btn-primary text-sm py-2 mt-3 inline-flex">Book a doctor</Link>
            </div>
          )}
        </>
      )}

      {risk === 'red' && (
        <>
          {report.advice.urgentActions.length > 0 && (
            <Section icon={ShieldAlert} title="What to do right now" tone="red" items={report.advice.urgentActions} />
          )}
          {report.advice.warningSigns.length > 0 && (
            <div className="card p-5 risk-red" style={{ borderWidth: 1 }}>
              <div className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Watch for these warning signs
              </div>
              <ul className="text-sm mt-2 list-disc pl-5 space-y-1">
                {report.advice.warningSigns.map((w, i) => (<li key={i}>{w}</li>))}
              </ul>
            </div>
          )}
          <div className="card p-5 bg-rose-50 border-rose-200">
            <div className="font-semibold text-rose-700">Connect to a doctor immediately</div>
            <p className="text-sm text-rose-700/90 mt-1">
              {report.advice.doctorAdvice || 'Please book a video consultation now or visit the nearest emergency room.'}
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/doctors" className="btn-primary text-sm py-2"><Stethoscope className="w-4 h-4" /> Book doctor now</Link>
              <Link href="/nearby?type=hospital" className="btn-outline text-sm py-2">Find ER nearby</Link>
            </div>
          </div>
        </>
      )}

      <div className="text-[11px] text-slate-400 px-2">{report.advice.disclaimer || report.disclaimer}</div>

      <button onClick={onReset} className="btn-outline text-sm">
        <RotateCcw className="w-4 h-4" /> Run another check
      </button>
    </div>
  );
}

function SuggestedDoctorsCard({
  risk, specialty, doctors,
}: { risk: Risk; specialty?: string; doctors: SuggestedDoctor[] }) {
  const heading = risk === 'red'
    ? `Recommended specialists for urgent consultation`
    : `Specialists for ${specialty || 'this concern'}`;
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <Stethoscope className={`w-4 h-4 ${risk === 'red' ? 'text-rose-600' : 'text-brand-600'}`} />
        {heading}
      </div>
      <p className="text-xs text-slate-500 mt-1">Verified doctors who match the suggested specialty.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {doctors.slice(0, 4).map((d) => (
          <div key={d._id} className="border border-slate-100 rounded-xl p-3 flex gap-3 hover:shadow-md transition">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 grid place-items-center text-white font-semibold shrink-0">
              {d.user?.name?.[0] || 'D'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">Dr. {d.user?.name}</div>
              <div className="text-xs text-slate-500">{d.specialization}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {d.yearsOfExperience}y · ₹{d.consultationFee || 0} · ★ {d.rating || 'New'}
              </div>
              {d.bio && <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">{d.bio}</div>}
              <Link href="/doctors" className="text-[11px] text-brand-600 font-medium mt-1.5 inline-block">Book →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  icon: Icon, title, tone, items,
}: { icon: any; title: string; tone: 'green' | 'red'; items: { title: string; description?: string }[] }) {
  const accent = tone === 'green' ? 'text-emerald-600' : 'text-rose-600';
  return (
    <div className="card p-5">
      <div className={`flex items-center gap-2 font-semibold ${accent}`}>
        <Icon className="w-4 h-4" /> {title}
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            <div className="font-medium text-slate-800">• {it.title}</div>
            {it.description && <div className="text-slate-500 ml-3 mt-0.5 leading-relaxed">{it.description}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
